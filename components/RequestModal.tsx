import React, { useState, useEffect } from 'react';
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
import { EditIcon, TrashIcon, XIcon, PlusIcon, LoaderCircleIcon, CheckCircleIcon } from './Icons';
import ImageLightbox from './ImageLightbox';

interface RequestModalProps {
  request?: Request;
  onClose: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ request, onClose }) => {
  const { currentUser } = useAuth();
  const { addRequest, updateRequest, deleteRequest, addComment, deleteComment, updateComment, addToast } = useData();

  const MAX_PHOTOS = 3;

  const [isEditing, setIsEditing] = useState(!request);
  const [title, setTitle] = useState(request?.title || '');
  const [description, setDescription] = useState(request?.description || '');
  const [sector, setSector] = useState<Sector>(request?.sector || SECTORS[0]);
  const [status, setStatus] = useState<Status>(request?.status || Status.PENDENTE);
  const [photos, setPhotos] = useState<string[]>(request?.photos || []);
  const [justification, setJustification] = useState('');
  // Admin response is now handled via status change comments or quick actions, but we keep the state if needed for legacy or internal logic, 
  // though we won't show the dedicated field anymore as requested.
  const [adminResponse, setAdminResponse] = useState(request?.adminResponse || '');

  // ===== COMENTÁRIOS =====
  const [comments, setComments] = useState<Comment[]>(request?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    setComments(request?.comments || []);
  }, [request?.comments]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!currentUser) return null;

  const canManage = currentUser.role === Role.ADMIN ||
    currentUser.role === Role.GESTAO ||
    currentUser.role === Role.SINDICO ||
    currentUser.role === Role.SUBSINDICO;
  const isAuthor = currentUser.id === request?.authorId;

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
        adminResponse: finalAdminResponse,
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

  const handleDelete = () => {
    if (request && confirm('Excluir sugestão?')) {
      deleteRequest(request.id);
      onClose();
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
    if (!request || !confirm('Excluir comentário?')) return;
    deleteComment(request.id, commentId);
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

  const renderSelect = (
    label: string,
    value: any,
    onChange: (v: any) => void,
    list: string[],
    disabled: boolean,
    loading?: boolean
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 flex items-center">
        {label}
        {loading && <LoaderCircleIcon className="w-4 h-4 ml-2 text-indigo-500" />}
      </label>

      <select
        value={value}
        onChange={e => onChange(e.target.value as any)}
        disabled={disabled}
        className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                   focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 text-gray-900"
      >
        {list.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-900">
              {request ? 'Detalhes da Sugestão' : 'Nova Sugestão'}
            </h2>

            <div className="flex gap-2">
              {request && (isAuthor || canManage) && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <EditIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {request && (isAuthor || canManage) && (
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <XIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Título</label>
              <input
                value={title}
                disabled={!isEditing}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                  focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                value={description}
                disabled={!isEditing}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                  focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSelect(
                'Setor',
                sector,
                v => setSector(v as Sector),
                SECTORS,
                !isEditing,
                false
              )}
              {canManage && renderSelect(
                'Status',
                status,
                v => setStatus(v as Status),
                STATUSES,
                !isEditing
              )}
            </div>

            {/* Justificativa de Status (se status mudou) */}
            {canManage && request && status !== request.status && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <label className="block text-sm font-medium text-yellow-800">
                  Justificativa da alteração de status (Obrigatório)
                </label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-yellow-300 
                    focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Explique o motivo da alteração..."
                />
                {errors.justification && (
                  <p className="mt-1 text-xs text-red-600">{errors.justification}</p>
                )}
              </div>
            )}

            {/* FOTOS */}
            <div>
              <label className="block text-sm">
                Fotos ({photos.length}/{MAX_PHOTOS})
              </label>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      className="w-full h-24 rounded-md object-cover cursor-pointer"
                      onClick={() => openLightbox(index)}
                    />

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 
                          group-hover:opacity-100 transition"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {isEditing && photos.length < MAX_PHOTOS && (
                  <label className="flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-md h-24 cursor-pointer bg-gray-50">
                    <PlusIcon className="w-8 h-8 text-gray-500" />
                    <span className="text-xs text-gray-500">Adicionar</span>
                    <input type="file" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* COMENTÁRIOS */}
            {request && (
              <div className="mt-6 border-t pt-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Comentários
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Nenhum comentário ainda.
                    </p>
                  )}

                  {[...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(comment => {
                    const isStatusChange = comment.type === 'status_change';
                    const isApproved = comment.newStatus === 'Aprovada' || comment.newStatus === 'Concluído';
                    const isRejected = comment.newStatus === 'Recusada';

                    // Cores dinâmicas para comentários de status
                    let bgClass = 'bg-gray-50';
                    let borderClass = '';
                    let textClass = 'text-gray-800';
                    let badgeClass = '';

                    if (isStatusChange) {
                      if (isApproved) {
                        bgClass = 'bg-green-50';
                        borderClass = 'border border-green-200';
                        textClass = 'text-green-900 font-medium';
                        badgeClass = 'bg-green-200 text-green-800';
                      } else if (isRejected) {
                        bgClass = 'bg-red-50';
                        borderClass = 'border border-red-200';
                        textClass = 'text-red-900 font-medium';
                        badgeClass = 'bg-red-200 text-red-800';
                      } else {
                        bgClass = 'bg-blue-50';
                        borderClass = 'border border-blue-200';
                        textClass = 'text-blue-900 font-medium';
                        badgeClass = 'bg-blue-200 text-blue-800';
                      }
                    }

                    const isCommentAuthor = currentUser.id === comment.authorId;
                    const canEditComment = isCommentAuthor || canManage;

                    return (
                      <div
                        key={comment.id}
                        className={`rounded-md px-3 py-2 ${bgClass} ${borderClass} group relative`}
                      >
                        {editingCommentId === comment.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full text-sm p-2 border rounded"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedComment(comment.id)}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <p className={`text-sm whitespace-pre-wrap ${textClass}`}>
                                {comment.text}
                              </p>
                              {isStatusChange && comment.newStatus && (
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2 shrink-0 ${badgeClass}`}>
                                  {comment.newStatus}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-end mt-1">
                              <p className={`text-[11px] ${isStatusChange ? 'opacity-80' : 'text-gray-500'}`}>
                                - {comment.authorName.split(' ')[0]} {comment.houseNumber ? `(Casa ${comment.houseNumber})` : ''}{' '}
                                {comment.createdAt && new Date(comment.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>

                              {/* Action Buttons */}
                              {canEditComment && !isStatusChange && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleEditComment(comment)}
                                    className="text-gray-400 hover:text-indigo-600"
                                    title="Editar"
                                  >
                                    <EditIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-gray-400 hover:text-red-600"
                                    title="Excluir"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Adicione um comentário..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    className="flex-1 border rounded-md px-3 py-2 text-sm bg-white border-gray-300 
                      focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}

            {/* BOTÕES */}
            {isEditing && (
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                >
                  Salvar
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {isLightboxOpen && (
        <ImageLightbox
          images={photos}
          currentIndex={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={() =>
            setCurrentImageIndex(prev =>
              prev > 0 ? prev - 1 : photos.length - 1
            )
          }
          onNext={() =>
            setCurrentImageIndex(prev =>
              prev < photos.length - 1 ? prev + 1 : 0
            )
          }
        />
      )}
    </>
  );
};

export default RequestModal;
