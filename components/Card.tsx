import React, { useState } from 'react';
import { Request, Role, Priority, RequestType } from '../types';
import { useAuth } from '../hooks/useAuth';
import RequestModal from './RequestModal';
import { useData } from '../hooks/useData';
import {
  BoltIcon, DropletIcon, WrenchScrewdriverIcon, ShieldCheckIcon,
  FlameIcon, WindIcon, LeafIcon, SparklesIcon, DoorOpenIcon,
  WavesIcon, ImageIcon, HeartIcon, LightbulbIcon, MessageSquareIcon,
  BarChartIcon, CheckCircleIcon, XIcon, InfoIcon
} from './Icons';
import ImageLightbox from './ImageLightbox';
import { getStatusStyle } from '../utils/statusUtils';

interface CardProps {
  request: Request;
  onDragStart: (requestId: string) => void;
  onCreateVoting?: (title: string, description: string) => void;
}

const priorityColors: Record<Priority, string> = {
  [Priority.URGENTE]: 'border-red-500',
  [Priority.ALTA]: 'border-orange-500',
  [Priority.MEDIA]: 'border-yellow-500',
  [Priority.BAIXA]: 'border-blue-500',
};

const typeIcons: Record<RequestType, React.ReactNode> = {
  [RequestType.ELETRICA]: <BoltIcon className="w-4 h-4" />,
  [RequestType.HIDRAULICA]: <DropletIcon className="w-4 h-4" />,
  [RequestType.PREDIAL]: <WrenchScrewdriverIcon className="w-4 h-4" />,
  [RequestType.SEGURANCA]: <ShieldCheckIcon className="w-4 h-4" />,
  [RequestType.INCENDIO]: <FlameIcon className="w-4 h-4" />,
  [RequestType.AR_CONDICIONADO]: <WindIcon className="w-4 h-4" />,
  [RequestType.JARDINAGEM]: <LeafIcon className="w-4 h-4" />,
  [RequestType.LIMPEZA]: <SparklesIcon className="w-4 h-4" />,
  [RequestType.PORTOES]: <DoorOpenIcon className="w-4 h-4" />,
  [RequestType.PISCINA]: <WavesIcon className="w-4 h-4" />,
  [RequestType.PEQUENOS_REPAROS]: <WrenchScrewdriverIcon className="w-4 h-4" />,
  [RequestType.SUGESTOES]: <LightbulbIcon className="w-4 h-4" />,
};

type StatusAction = 'conclude' | 'reject' | 'analyze' | 'in_progress';

const Card: React.FC<CardProps> = ({ request, onDragStart, onCreateVoting }) => {
  const { currentUser } = useAuth();
  const { users, toggleRequestLike, updateRequestStatus } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Status Update State
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; action: StatusAction | null }>({
    isOpen: false,
    action: null,
  });
  const [justification, setJustification] = useState('');

  const canManage = currentUser?.role === Role.ADMIN ||
    currentUser?.role === Role.GESTAO ||
    currentUser?.role === Role.SINDICO ||
    currentUser?.role === Role.SUBSINDICO;

  const canDrag = canManage;
  const isSuggestion = request.type === RequestType.SUGESTOES;
  const likesCount = request.likes?.length || 0;
  const isLiked = currentUser ? request.likes?.includes(currentUser.id) : false;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('requestId', request.id);
    onDragStart(request.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser) {
      await toggleRequestLike(request.id, currentUser.id);
    }
  };

  const openLightbox = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleStatusClick = (e: React.MouseEvent, action: StatusAction) => {
    e.stopPropagation();
    setStatusModal({ isOpen: true, action });
    setJustification(''); // Reset justification
  };

  const confirmStatusUpdate = async () => {
    if (!statusModal.action) return;

    let newStatus = '';
    if (statusModal.action === 'conclude') newStatus = 'Concluído';
    if (statusModal.action === 'reject') newStatus = 'Recusada';
    if (statusModal.action === 'analyze') newStatus = 'Em Análise';
    if (statusModal.action === 'in_progress') newStatus = 'Em Andamento';

    await updateRequestStatus(request.id, newStatus as any, justification, currentUser?.id);
    setStatusModal({ isOpen: false, action: null });
    setJustification('');
  };

  const author = users.find(u => u.id === request.authorId);
  const authorFirstName = author ? author.name.split(' ')[0] : 'Desconhecido';
  const authorDisplay = author ? `${authorFirstName} • Unidade ${author.houseNumber}` : request.authorName;
  const formattedDate = new Date(request.createdAt).toLocaleDateString('pt-BR');
  const style = getStatusStyle(request.status);

  return (
    <>
      <div
        draggable={canDrag}
        onDragStart={handleDragStart}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Abrir detalhes da sugestão: ${request.title}`}
        className={`
          bg-white p-4 rounded-2xl shadow-sm border-l-4 border-y border-r border-gray-100
          ${priorityColors[request.priority] || 'border-gray-500'} 
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} 
          hover-lift hover:shadow-xl transition-all duration-300 animate-scale-in touch-active
          ${isSuggestion ? 'bg-indigo-50/10' : ''}
          relative group
        `}
      >
        <div className="mb-4">
          {/* Header: Title & Status */}
          <div className="flex justify-between items-start gap-2 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 p-2 rounded-xl shadow-sm ${isSuggestion ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                {typeIcons[request.type]}
              </span>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-sm leading-tight truncate pr-2 tracking-tight">{request.title}</h4>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5 tracking-wider">{formattedDate} • {authorDisplay}</p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all group-hover:scale-105 active:scale-95 ${style.bg} ${style.text} ${style.border}`}>
              {request.status}
            </span>
          </div>

          {/* Body: Description + Image */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              {/* Description */}
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed font-medium">
                {request.description}
              </p>

              {/* Admin Response Preview */}
              {request.adminResponse && (
                <div className={`mt-4 ${style.bg}/50 border ${style.border}/50 rounded-xl p-3 relative transition-colors overflow-hidden group/resp`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.text.replace('text-', 'bg-')} opacity-60`}></div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-black ${style.text} uppercase tracking-widest`}>Resposta da Gestão</span>
                    <span className="text-xs">{style.icon}</span>
                  </div>
                  <p className={`text-xs ${style.text} leading-relaxed font-semibold pl-1`}>
                    {request.adminResponse}
                  </p>
                </div>
              )}
            </div>

            {/* Image Thumbnail */}
            {request.photos.length > 0 && (
              <div className="shrink-0 relative w-20 h-20 self-end mb-1">
                <img
                  src={request.photos[0]}
                  alt="Anexo"
                  className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md cursor-zoom-in hover:brightness-110 transition transition-transform hover:scale-105"
                  onClick={(e) => openLightbox(e, 0)}
                />
                {request.photos.length > 1 && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl cursor-pointer backdrop-blur-[1.5px]"
                    onClick={(e) => openLightbox(e, 0)}
                  >
                    <span className="text-white font-black text-xs">+{request.photos.length - 1}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100/60">
          <div className="flex items-center gap-4">
            {isSuggestion && (
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-black uppercase tracking-tight
                  ${isLiked
                    ? 'text-red-600 bg-red-50 shadow-sm shadow-red-100'
                    : 'text-gray-500 hover:bg-gray-50'}
                  `}
                title="Apoiar sugestão"
              >
                <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
              <MessageSquareIcon className="w-4 h-4" />
              <span>{request.comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canManage && isSuggestion && (
              <>
                <div className="flex items-center bg-gray-100/80 backdrop-blur-sm rounded-2xl p-1.5 gap-2 shadow-inner">
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, 'reject')}
                    className="p-3 rounded-xl text-red-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                    title="Recusar"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, 'analyze')}
                    className="p-3 rounded-xl text-blue-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                    title="Analisar"
                  >
                    <InfoIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, 'in_progress')}
                    className="p-3 rounded-xl text-orange-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                    title="Em Andamento"
                  >
                    <WrenchScrewdriverIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, 'conclude')}
                    className="p-3 rounded-xl text-green-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                    title="Concluir"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCreateVoting) {
                      onCreateVoting(request.title, request.description);
                    }
                  }}
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95"
                >
                  <BarChartIcon className="w-4 h-4" />
                  Votar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && <RequestModal request={request} onClose={() => setIsModalOpen(false)} />}

      {isLightboxOpen && (
        <ImageLightbox
          images={request.photos}
          currentIndex={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={() =>
            setCurrentImageIndex(prev =>
              prev > 0 ? prev - 1 : request.photos.length - 1
            )
          }
          onNext={() =>
            setCurrentImageIndex(prev =>
              prev < request.photos.length - 1 ? prev + 1 : 0
            )
          }
        />
      )}

      {/* Justification Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 border-b ${statusModal.action === 'conclude' ? 'bg-green-50 border-green-100' :
              statusModal.action === 'reject' ? 'bg-red-50 border-red-100' :
                statusModal.action === 'in_progress' ? 'bg-orange-50 border-orange-100' :
                  'bg-blue-50 border-blue-100'
              }`}>
              <h3 className={`font-bold ${statusModal.action === 'conclude' ? 'text-green-800' :
                statusModal.action === 'reject' ? 'text-red-800' :
                  statusModal.action === 'in_progress' ? 'text-orange-800' :
                    'text-blue-800'
                }`}>
                {statusModal.action === 'conclude' ? 'Concluir Sugestão' :
                  statusModal.action === 'reject' ? 'Recusar Sugestão' :
                    statusModal.action === 'in_progress' ? 'Em Andamento' :
                      'Analisar Sugestão'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Insira uma justificativa ou resposta oficial para esta ação.
              </p>
            </div>

            <div className="p-4">
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Escreva a resposta da gestão aqui..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                autoFocus
              />
            </div>

            <div className="p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setStatusModal({ isOpen: false, action: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={!justification.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${statusModal.action === 'conclude' ? 'bg-green-600 hover:bg-green-700' :
                  statusModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    statusModal.action === 'in_progress' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Card;