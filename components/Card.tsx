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

type StatusAction = 'approve' | 'reject' | 'analyze';

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
    if (statusModal.action === 'approve') newStatus = 'Aprovada'; // Or 'Concluído' depending on workflow
    if (statusModal.action === 'reject') newStatus = 'Recusada';
    if (statusModal.action === 'analyze') newStatus = 'Em Análise';

    await updateRequestStatus(request.id, newStatus as any, justification, currentUser?.id);
    setStatusModal({ isOpen: false, action: null });
    setJustification('');
  };

  const author = users.find(u => u.id === request.authorId);
  const authorFirstName = author ? author.name.split(' ')[0] : 'Desconhecido';
  const authorDisplay = author ? `${authorFirstName} - Casa ${author.houseNumber}` : request.authorName;
  const formattedDate = new Date(request.createdAt).toLocaleDateString('pt-BR');

  // Dynamic Styles for Admin Response
  const getResponseStyles = () => {
    if (request.status === 'Aprovada' || request.status === 'Concluído') {
      return {
        bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900',
        label: 'text-green-700', bar: 'bg-green-500', hover: 'group-hover:bg-green-100/50', borderL: 'border-green-200'
      };
    }
    if (request.status === 'Recusada') {
      return {
        bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-900',
        label: 'text-red-700', bar: 'bg-red-500', hover: 'group-hover:bg-red-100/50', borderL: 'border-red-200'
      };
    }
    if (request.status === 'Em Votação') {
      return {
        bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-900',
        label: 'text-yellow-700', bar: 'bg-yellow-500', hover: 'group-hover:bg-yellow-100/50', borderL: 'border-yellow-200'
      };
    }
    return {
      bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900',
      label: 'text-blue-700', bar: 'bg-blue-500', hover: 'group-hover:bg-blue-100/50', borderL: 'border-blue-200'
    };
  };

  const responseStyle = getResponseStyles();

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
          bg-white p-3 rounded-xl shadow-sm border-l-4 border-y border-r border-gray-200
          ${priorityColors[request.priority] || 'border-gray-500'} 
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} 
          hover:shadow-md transition-all duration-200
          ${isSuggestion ? 'bg-purple-50/30' : ''}
          relative group
        `}
      >
        <div className="mb-3">
          {/* Header: Title & Status (Now Full Width) */}
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 p-1 rounded-md ${isSuggestion ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                {typeIcons[request.type]}
              </span>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 text-sm leading-tight truncate pr-2">{request.title}</h4>
                <p className="text-[11px] text-gray-500 truncate">{formattedDate} • {authorDisplay}</p>
              </div>
            </div>

            {/* Status Badge - Top Right */}
            {request.status !== 'Pendente' && (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                ${(request.status === 'Concluído' || request.status === 'Aprovada') ? 'bg-green-100 text-green-700' :
                  (request.status === 'Em Andamento' || request.status === 'Em Análise') ? 'bg-blue-100 text-blue-700' :
                    request.status === 'Em Votação' ? 'bg-yellow-100 text-yellow-700' :
                      request.status === 'Recusada' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                {request.status}
              </span>
            )}
          </div>

          {/* Body: Description + Image (Bottom Right) */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              {/* Description */}
              <p className="text-sm text-gray-700 mt-1.5 line-clamp-2 leading-relaxed">
                {request.description}
              </p>

              {/* Admin Response Preview */}
              {request.adminResponse && (
                <div className={`mt-3 ${responseStyle.bg} border ${responseStyle.border} rounded-lg p-2.5 relative ${responseStyle.hover} transition-colors`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-1 h-3 ${responseStyle.bar} rounded-full`}></div>
                    <span className={`text-[10px] font-bold ${responseStyle.label} uppercase tracking-wide`}>Resposta da Gestão</span>
                  </div>
                  <p className={`text-xs ${responseStyle.text} leading-relaxed pl-2.5 border-l ${responseStyle.borderL}`}>
                    {request.adminResponse}
                  </p>
                </div>
              )}
            </div>

            {/* Image Thumbnail - Bottom Right of Content Area */}
            {request.photos.length > 0 && (
              <div className="shrink-0 relative w-20 h-20 self-end">
                <img
                  src={request.photos[0]}
                  alt="Anexo"
                  className="w-full h-full object-cover rounded-lg border border-gray-100 shadow-sm cursor-zoom-in hover:opacity-95 transition"
                  onClick={(e) => openLightbox(e, 0)}
                />
                {request.photos.length > 1 && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg cursor-pointer backdrop-blur-[1px]"
                    onClick={(e) => openLightbox(e, 0)}
                  >
                    <span className="text-white font-bold text-sm">+{request.photos.length - 1}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - Full Width Bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {isSuggestion && (
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors text-xs font-medium
                  ${isLiked
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-500 hover:bg-gray-100'}
                  `}
                title="Apoiar sugestão"
              >
                <HeartIcon className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </button>
            )}

            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <MessageSquareIcon className="w-3.5 h-3.5" />
              <span>{request.comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && isSuggestion && (
              <>
                <button
                  onClick={(e) => handleStatusClick(e, 'approve')}
                  className="p-1.5 rounded-full text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                  title="Aprovar"
                  aria-label="Aprovar sugestão"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleStatusClick(e, 'reject')}
                  className="p-1.5 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Recusar"
                  aria-label="Recusar sugestão"
                >
                  <XIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleStatusClick(e, 'analyze')}
                  className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  title="Analisar"
                  aria-label="Analisar sugestão"
                >
                  <InfoIcon className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-gray-200 mx-1"></div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCreateVoting) {
                      onCreateVoting(request.title, request.description);
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-all shadow-sm"
                >
                  <BarChartIcon className="w-3 h-3" />
                  Criar Votação
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
            <div className={`p-4 border-b ${statusModal.action === 'approve' ? 'bg-green-50 border-green-100' :
              statusModal.action === 'reject' ? 'bg-red-50 border-red-100' :
                'bg-blue-50 border-blue-100'
              }`}>
              <h3 className={`font-bold ${statusModal.action === 'approve' ? 'text-green-800' :
                statusModal.action === 'reject' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                {statusModal.action === 'approve' ? 'Aprovar Sugestão' :
                  statusModal.action === 'reject' ? 'Recusar Sugestão' :
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
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${statusModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  statusModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
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