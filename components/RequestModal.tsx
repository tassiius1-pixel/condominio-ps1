import React, { useState, useEffect, useRef } from 'react';
import {
  Request,
  Role,
  Status,
  Priority,
  Sector,
  RequestType,
  Comment,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { SECTORS, STATUSES } from '../constants';
import { uploadPhoto } from '../services/storage';
import { EditIcon, TrashIcon, XIcon, PlusIcon, LoaderCircleIcon, CheckCircleIcon, LightbulbIcon, InfoIcon, HeartIcon, WrenchScrewdriverIcon, BarChartIcon, SendIcon } from './Icons';
import ImageLightbox from './ImageLightbox';
import { getStatusStyle } from '../utils/statusUtils';
import ConfirmModal from './ConfirmModal';

interface RequestModalProps {
  request?: Request;
  onClose: () => void;
  initialStatus?: Status;
  onCreateVoting?: (title: string, description: string) => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ request, onClose, initialStatus, onCreateVoting }) => {
  const { currentUser } = useAuth();
  const { addRequest, updateRequest, deleteRequest, addComment, deleteComment, updateComment, toggleRequestLike, toggleCommentLike, updateRequestStatus, addToast, users } = useData();

  const MAX_PHOTOS = 3;

  const [isEditing, setIsEditing] = useState(!request);
  const [title, setTitle] = useState(request?.title || '');
  const [description, setDescription] = useState(request?.description || '');
  const [sector, setSector] = useState<Sector>(request?.sector || Sector.OUTROS);
  const [status, setStatus] = useState<Status>(request?.status || Status.PENDENTE);
  const [photos, setPhotos] = useState<string[]>(request?.photos || []);
  const [justification, setJustification] = useState('');
  const [adminResponse, setAdminResponse] = useState(request?.adminResponse || '');

  // ===== COMENTÁRIOS =====
  const [comments, setComments] = useState<Comment[]>(request?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [targetStatus, setTargetStatus] = useState<Status | null>(initialStatus || null);
  const [actionJustification, setActionJustification] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    setComments(request?.comments || []);
  }, [request?.comments]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'info' | 'success';
    alertOnly: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    alertOnly: false
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  if (!currentUser) return null;

  const canManage = currentUser.role === Role.ADMIN ||
    currentUser.role === Role.GESTAO ||
    currentUser.role === Role.SINDICO ||
    currentUser.role === Role.SUBSINDICO;
  const isAuthor = currentUser.id === request?.authorId;

  const likesCount = request?.likes?.length || 0;
  const isLiked = currentUser && request ? request.likes?.includes(currentUser.id) : false;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser && request) {
      await toggleRequestLike(request.id, currentUser.id);
    }
  };

  // =============================
  // Upload de Fotos
  // =============================
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const files = Array.from(e.target.files).slice(0, remainingSlots);

    if (files.length === 0) {
      addToast(`Você pode adicionar no máximo ${MAX_PHOTOS} fotos.`, 'info');
      return;
    }

    const urls: string[] = [];

    for (const file of files) {
      const url = await uploadPhoto(file, "pendencias");
      urls.push(url);
    }

    setPhotos(prev => [...prev, ...urls]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'O título é obrigatório.';
    if (!description.trim()) errs.description = 'A descrição é obrigatória.';

    if (request && status !== request.status && !justification.trim()) {
      errs.justification = 'A justificativa é obrigatória para alteração de status.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // =============================
  // SALVAR
  // =============================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (request) {
      // Se status mudou, adiciona comentário de sistema E atualiza adminResponse
      let finalAdminResponse = adminResponse;

      if (status !== request.status) {
        // Se mudou status e tem justificativa, essa vira a nova resposta oficial
        if (justification) {
          finalAdminResponse = justification;
        }

        // Também adicionamos ao histórico como comentário
        const statusChangeText = `Alterou o status para "${status}". Justificativa: ${justification}`;
        addComment(request.id, {
          authorId: currentUser.id,
          authorName: currentUser.name,
          text: statusChangeText,
          type: 'status_change',
          newStatus: status
        });
      }

      const updated: Request = {
        ...request,
        title,
        description,
        sector,
        status,
        photos,
        adminResponse: adminResponse, // Use the state directly
      };
      updateRequest(updated);
    } else {
      addRequest({
        title,
        description,
        sector,
        type: RequestType.SUGESTOES,
        priority: Priority.MEDIA,
        photos,
        authorId: currentUser.id,
      });
    }

    onClose();
  };

  const handleConfirmAction = async () => {
    if (!request || !targetStatus || !actionJustification.trim()) {
      addToast("Justificativa é obrigatória.", "error");
      return;
    }

    setIsSubmittingAction(true);
    try {
      await updateRequestStatus(request.id, targetStatus, actionJustification, currentUser.id);
      addToast(`Status atualizado para ${targetStatus}`, "success");
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      addToast("Erro ao atualizar status.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDelete = () => {
    if (request) {
      setModalConfig({
        isOpen: true,
        title: "Excluir Sugestão?",
        message: "Você tem certeza que deseja excluir esta sugestão? Esta ação não pode ser desfeita.",
        type: 'danger',
        alertOnly: false,
        onConfirm: () => {
          deleteRequest(request.id);
          onClose();
        }
      });
    }
  };

  // =============================
  // COMENTÁRIOS
  // =============================
  const handleAddComment = () => {
    if (!newComment.trim() || !request) return;
    const text = newComment.trim();

    addComment(request.id, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      houseNumber: currentUser.houseNumber,
      text,
    });
    setNewComment('');
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveEditedComment = (commentId: string) => {
    if (!request || !editingCommentText.trim()) return;
    updateComment(request.id, commentId, editingCommentText);
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!request) return;
    setModalConfig({
      isOpen: true,
      title: "Excluir Comentário?",
      message: "Deseja realmente remover seu comentário?",
      type: 'danger',
      alertOnly: false,
      onConfirm: () => {
        deleteComment(request.id, commentId);
      }
    });
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef<number>(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart.current;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateY > 150) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  const author = users.find(u => u.id === request?.authorId);
  const formattedDate = request ? new Date(request.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
  const fullFormattedDate = request ? new Date(request.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  const style = getStatusStyle(request?.status || status);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />
        <div
          className={`bg-white shadow-2xl w-full h-[100dvh] overflow-hidden flex flex-col transform transition-all relative z-10 ${isSwiping ? '' : 'duration-300'}`}
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {/* Visual Drag Handle for Mobile */}
          <div
            className="sm:hidden w-full h-8 flex items-center justify-center shrink-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {/* Header Barra Superior */}
          <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 bg-indigo-600 border-b border-indigo-700 z-10 shrink-0 pt-[env(safe-area-inset-top,1.25rem)]">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 p-2 -ml-2 hover:bg-white/10 text-white rounded-xl transition-colors group"
                aria-label="Voltar"
              >
                <XIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest opacity-80 group-hover:opacity-100">Voltar</span>
              </button>

              <div className="flex items-center gap-3 sm:gap-4 pl-1 sm:pl-2 border-l border-white/20">
                <div className={`p-2.5 rounded-xl bg-white/10 text-white shadow-inner hidden xs:flex`}>
                  {request ? (request.type === RequestType.SUGESTOES ? <LightbulbIcon className="w-5 h-5" /> : <InfoIcon className="w-5 h-5" />) : <PlusIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight leading-none uppercase truncate">
                    {request ? 'Detalhes' : 'Nova Demanda'}
                  </h2>
                  {request && (
                    <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20 whitespace-nowrap`}>
                        {request.status}
                      </span>
                      <span className="text-[10px] uppercase font-black text-indigo-200 mt-0.5 tracking-widest whitespace-nowrap truncate" title={fullFormattedDate}>
                        • {formattedDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {request && (isAuthor || canManage) && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 sm:p-3 hover:bg-white/10 text-white rounded-xl transition-all active:scale-90"
                  title="Editar"
                >
                  <EditIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
              {request && (isAuthor || canManage) && (
                <button
                  onClick={handleDelete}
                  className="p-2.5 sm:p-3 hover:bg-red-500 text-white rounded-xl transition-all active:scale-95 group"
                  title="Excluir"
                >
                  <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6 opacity-90 group-hover:opacity-100" />
                </button>
              )}
            </div>
          </div>

          {/* Modal Body - Scrollable Area */}
          <div className="flex-1 overflow-y-auto bg-white scrolling-touch pb-10 sm:pb-20">
            <div className="max-w-4xl mx-auto w-full p-6 sm:p-10">

              {/* 1. SEÇÃO DE CONTEÚDO (Título e Descrição) */}
              <section className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-4">
                      <p className="text-[11px] font-bold text-amber-800 leading-tight">
                        📢 Esta seção é pública. Todos os moradores poderão ver sua sugestão ou pedido de manutenção para acompanhar o progresso.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Título</label>
                      <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Melhoria no parquinho..."
                        className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3.5 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-gray-800"
                      />
                      {errors.title && <p className="mt-1.5 px-2 text-[11px] font-bold text-red-500">{errors.title}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Descrição Detalhada</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={5}
                        placeholder="Conte mais sobre sua idéia ou necessidade..."
                        className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3.5 focus:border-indigo-500 focus:ring-0 transition-all font-medium text-gray-700 leading-relaxed"
                      />
                      {errors.description && <p className="mt-1.5 px-2 text-[11px] font-bold text-red-500">{errors.description}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight break-words">
                      {request?.title}
                    </h1>

                    {/* Autor Meta info */}
                    <div className="flex items-center gap-3 py-1.5 border-y border-gray-100/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] uppercase shadow-sm">
                        {author?.name.split(' ')[0][0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900">{author?.name.split(' ')[0]} • Unidade {author?.houseNumber}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Autor da Sugestão</p>
                      </div>
                    </div>

                    <p className="text-base text-gray-600 leading-relaxed font-normal whitespace-pre-wrap break-words">
                      {request?.description}
                    </p>

                    {/* Resposta da Gestão (Box Estilizado) */}
                    {request?.adminResponse && (
                      <div className={`mt-4 ${style.bg}/40 border ${style.border}/40 rounded-[2rem] p-5 relative transition-colors overflow-hidden animate-slide-fade-in shadow-sm`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.text.replace('text-', 'bg-')} opacity-60`}></div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[10px] font-black ${style.text} uppercase tracking-[0.2em]`}>Resposta da Gestão</span>
                          <span className="text-xl">{style.icon}</span>
                        </div>
                        <p className={`text-[13px] ${style.text} leading-relaxed font-bold pl-1 break-words`}>
                          {request.adminResponse}
                        </p>
                      </div>
                    )}

                    {/* Like Button Engagement */}
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md
                        ${isLiked ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}
                      `}
                      >
                        <span className={`text-lg ${isLiked ? 'animate-bounce' : ''}`}>❤️</span>
                        <span className="text-xs font-black uppercase tracking-tight">{likesCount} Apoios</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 2. AÇÕES DA GESTÃO (Admin Only) */}
              {canManage && !isEditing && request && (
                <section className="bg-indigo-50/40 p-4 mt-6 rounded-[2rem] border border-indigo-100/50 space-y-3 animate-slide-fade-in shadow-sm">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚙️</span>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900/60">Controle da Gestão</h3>
                    </div>
                  </div>

                  {!targetStatus ? (
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-1.5 gap-2 shadow-inner border border-white">
                      <div className="flex items-center gap-1.5 flex-1">
                        <button
                          type="button"
                          onClick={() => setTargetStatus(Status.RECUSADA)}
                          className="flex-1 p-2.5 rounded-lg text-red-600 hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center border border-transparent hover:border-red-100"
                          title="Recusar"
                        >
                          <XIcon className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetStatus(Status.EM_ANALISE)}
                          className="flex-1 p-2.5 rounded-lg text-blue-600 hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center border border-transparent hover:border-blue-100"
                          title="Em Análise"
                        >
                          <InfoIcon className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetStatus(Status.EM_ANDAMENTO)}
                          className="flex-1 p-2.5 rounded-lg text-orange-600 hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center border border-transparent hover:border-orange-100"
                          title="Em Andamento"
                        >
                          <WrenchScrewdriverIcon className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetStatus(Status.CONCLUIDO)}
                          className="flex-1 p-2.5 rounded-lg text-green-600 hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center border border-transparent hover:border-green-100"
                          title="Concluir"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="w-px h-6 bg-gray-200 mx-0.5"></div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCreateVoting && request) {
                            onCreateVoting(request.title, request.description);
                          } else {
                            addToast("Redirecionando para criação de enquete...", "info");
                          }
                        }}
                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95"
                      >
                        <BarChartIcon className="w-3.5 h-3.5" />
                        Votar
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-3xl border-2 border-indigo-200 space-y-4 animate-scale-in">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                          Alterando para: <span className={getStatusStyle(targetStatus).text}>{targetStatus}</span>
                        </p>
                        <button onClick={() => { setTargetStatus(null); setActionJustification(''); }} className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600">Cancelar</button>
                      </div>

                      <textarea
                        value={actionJustification}
                        onChange={e => setActionJustification(e.target.value)}
                        rows={3}
                        placeholder="Escreva a resposta oficial da gestão para o morador aqui..."
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        autoFocus
                      />

                      <button
                        onClick={handleConfirmAction}
                        disabled={!actionJustification.trim() || isSubmittingAction}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        {isSubmittingAction ? (
                          <LoaderCircleIcon className="w-5 h-5 animate-spin" />
                        ) : (
                          <>Confirmar Transição</>
                        )}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* 3. GALERIA DE FOTOS */}
              {(photos.length > 0 || isEditing) && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Fotos anexadas ({photos.length}/{MAX_PHOTOS})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square group overflow-hidden rounded-[1.5rem] shadow-sm">
                        <img
                          src={photo}
                          className="w-full h-full object-cover cursor-zoom-in transition-transform group-hover:scale-110"
                          onClick={() => openLightbox(index)}
                        />
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:scale-110 transition active:scale-95"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isEditing && photos.length < MAX_PHOTOS && (
                      <label className="aspect-square flex flex-col justify-center items-center border-3 border-dashed border-gray-200 rounded-[1.5rem] cursor-pointer bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all text-gray-400 hover:text-indigo-500">
                        <PlusIcon className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-black uppercase">Adicionar</span>
                        <input type="file" multiple onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </section>
              )}

              {/* 4. CHAT DE COMENTÁRIOS */}
              {request && (
                <section className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      Comentários
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black">{comments.length}</span>
                    </h3>
                  </div>

                  {/* Bubble Chat List */}
                  <div className="space-y-6">
                    {comments.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                        <span className="text-3xl mb-2">💬</span>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Ninguém comentou ainda</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {[...comments]
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .map((comment, idx) => {
                            const isSys = comment.type === 'status_change';
                            const isMe = comment.authorId === currentUser.id;
                            const commAuthor = users.find(u => u.id === comment.authorId);

                            if (isSys) {
                              return (
                                <div key={comment.id} className="flex justify-center py-4 animate-fade-in w-full">
                                  <div className="bg-indigo-50 border border-indigo-100/60 rounded-[1.5rem] px-8 py-4 flex items-center shadow-sm max-w-[90%]">
                                    <span className="text-[11px] font-bold text-indigo-700/80 tracking-wide text-center leading-relaxed">
                                      <span className="text-indigo-400 mr-2 text-sm">📢</span>
                                      {comment.text}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // Instagram Style Layout
                            return (
                              <div key={comment.id} className={`flex gap-3 w-full p-3 rounded-2xl animate-slide-fade-in
                              ${idx % 2 === 0 ? 'bg-indigo-50/50' : 'bg-white border border-gray-100'}`}>

                                {/* Avatar */}
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase shadow-sm mt-1
                                ${isMe ? 'bg-indigo-600 text-white' : idx % 2 === 0 ? 'bg-rose-500 text-white' : 'bg-teal-500 text-white'}`}>
                                  {(commAuthor?.name || comment.authorName).split(' ')[0][0]}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <span className={`text-xs font-black ${isMe ? 'text-indigo-900' : 'text-gray-900'}`}>
                                        {(commAuthor?.name || comment.authorName).split(' ')[0]} • Unidade {commAuthor?.houseNumber || comment.houseNumber}
                                        {isMe && <span className="ml-1 text-[9px] text-indigo-500 font-normal">(Você)</span>}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                      </span>
                                    </div>
                                    {editingCommentId === comment.id ? (
                                      <div className="flex flex-col gap-2 mt-1">
                                        <input
                                          value={editingCommentText}
                                          onChange={e => setEditingCommentText(e.target.value)}
                                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all shadow-sm"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEditedComment(comment.id);
                                            if (e.key === 'Escape') setEditingCommentId(null);
                                          }}
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => setEditingCommentId(null)}
                                            className="text-[10px] uppercase font-black text-gray-400 hover:text-gray-600 px-2 py-1"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleSaveEditedComment(comment.id)}
                                            className="text-[10px] uppercase font-black bg-indigo-600 text-white px-3 py-1 rounded-lg shadow-indigo-200 hover:scale-105 transition-transform"
                                          >
                                            Salvar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-800 leading-relaxed font-medium mt-0.5 break-words">
                                        {comment.text}
                                      </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-4 mt-2">
                                      <button
                                        onClick={() => setNewComment(`@${(commAuthor?.name || comment.authorName).split(' ')[0]} `)}
                                        className="text-[11px] font-bold text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                      >
                                        Responder
                                      </button>

                                      {(isMe || canManage) && (
                                        <>
                                          {isMe && (
                                            <button
                                              onClick={() => handleEditComment(comment)}
                                              className="text-[11px] font-bold text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            >
                                              Editar
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                          >
                                            Excluir
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Like Icon (Visual per user request logic) */}
                                <div className="shrink-0 pt-2 flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => toggleCommentLike(request.id, comment.id, currentUser.id)}
                                    className="group p-1 -m-1"
                                  >
                                    <HeartIcon
                                      className={`w-4 h-4 transition-colors ${comment.likes?.includes(currentUser.id) ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-red-400'}`}
                                    />
                                  </button>
                                  {(comment.likes?.length || 0) > 0 && (
                                    <span className="text-[9px] font-bold text-gray-400">
                                      {comment.likes?.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Modal Footer / Comment Input Area */}
          <div className="bg-white border-t border-gray-100 shrink-0 z-10">
            <div className="max-w-5xl mx-auto w-full p-4">
              {isEditing ? (
                <div className="flex justify-end gap-3 p-2">
                  <button type="button" onClick={onClose} className="px-6 py-3 font-black uppercase tracking-widest text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                    Publicar Demanda
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 bg-slate-50 p-2 rounded-3xl border border-gray-100 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <input
                    type="text"
                    placeholder="Diga sua opinião..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium px-4 text-gray-700 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 disabled:bg-gray-200 disabled:shadow-none transition-all active:scale-90"
                  >
                    <SendIcon className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <ImageLightbox
          images={photos}
          currentIndex={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
          onNext={() => setCurrentImageIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
        />
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        alertOnly={modalConfig.alertOnly}
        onConfirm={modalConfig.onConfirm}
      />
    </>
  );
};

export default RequestModal;
