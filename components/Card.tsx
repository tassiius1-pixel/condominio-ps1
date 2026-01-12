import React, { useState, useRef, useEffect } from 'react';
import { Request, Role, Priority, RequestType, Status } from '../types';
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

  const [preSelectedStatus, setPreSelectedStatus] = useState<Status | null>(null);

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

  const handleStatusClick = (e: React.MouseEvent, target: Status) => {
    e.stopPropagation();
    setPreSelectedStatus(target);
    setIsModalOpen(true);
  };


  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const author = users.find(u => u.id === request.authorId);
  const authorFirstName = author ? author.name.split(' ')[0] : 'Desconhecido';
  const authorDisplay = author ? `${authorFirstName} • Unidade ${author.houseNumber}` : request.authorName;
  const formattedDate = new Date(request.createdAt).toLocaleDateString('pt-BR');
  const style = getStatusStyle(request.status);

  useEffect(() => {
    const checkOverflow = () => {
      if (descriptionRef.current) {
        const isOverflowing = descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    // Use ResizeObserver for more reliable detection on all screen sizes/states
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (descriptionRef.current) {
      resizeObserver.observe(descriptionRef.current);
    }

    // Initial check
    checkOverflow();

    return () => {
      resizeObserver.disconnect();
    };
  }, [request.description, request.photos.length]); // Re-run if content changes

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

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
                <h4 className="font-bold text-gray-900 text-sm leading-tight pr-2 tracking-tight line-clamp-1">{request.title}</h4>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5 tracking-wider">{formattedDate} • {authorDisplay}</p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all group-hover:scale-105 active:scale-95 ${style.bg} ${style.text} ${style.border}`}>
              {request.status}
            </span>
          </div>

          {/* Body: Content with Floated Image */}
          <div className="block min-w-0">
            {/* 1. Description: Always full-width at the top */}
            <div className="relative group/desc mb-2">
              <p
                ref={descriptionRef}
                className={`text-sm text-gray-600 mt-1 leading-relaxed font-medium transition-all duration-300 ${!isExpanded && 'line-clamp-2'}`}
              >
                {request.description}
              </p>
              {(hasOverflow || isExpanded) && (
                <button
                  onClick={toggleExpand}
                  className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:text-indigo-800 transition-colors flex items-center gap-1"
                >
                  {isExpanded ? 'Ver menos' : 'Ver mais'}
                  <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>↓</span>
                </button>
              )}
            </div>

            {/* 2. Photo: Floated right to stay on the side of the response/bottom content */}
            {request.photos.length > 0 && (
              <div className="float-right ml-4 mb-1 group/thumb">
                <div className="relative w-20 h-20">
                  <img
                    src={request.photos[0]}
                    alt="Anexo"
                    className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md cursor-zoom-in hover:brightness-110 transition-all duration-300 group-hover/thumb:scale-105"
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
              </div>
            )}

            {/* 3. Admin Response: Flows around the photo if present */}
            {request.adminResponse && (
              <div className={`mt-3 ${style.bg}/50 border ${style.border}/50 rounded-xl p-3 relative transition-colors overflow-hidden group/resp`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.text.replace('text-', 'bg-')} opacity-60`}></div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] font-black ${style.text} uppercase tracking-widest`}>Resposta da Gestão</span>
                  <span className="text-xs">{style.icon}</span>
                </div>
                <p className={`text-xs ${style.text} leading-relaxed font-semibold pl-1 ${!isExpanded && 'line-clamp-2'}`}>
                  {request.adminResponse}
                </p>
              </div>
            )}

            {/* Clear floats to ensure card footer starts properly */}
            <div className="clear-both"></div>
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
                    onClick={(e) => handleStatusClick(e, Status.RECUSADA)}
                    className="p-3 rounded-xl text-red-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center border border-transparent hover:border-red-100"
                    title="Recusar"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, Status.EM_ANALISE)}
                    className="p-3 rounded-xl text-blue-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center border border-transparent hover:border-blue-100"
                    title="Analisar"
                  >
                    <InfoIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, Status.EM_ANDAMENTO)}
                    className="p-3 rounded-xl text-orange-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center border border-transparent hover:border-orange-100"
                    title="Em Andamento"
                  >
                    <WrenchScrewdriverIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, Status.CONCLUIDO)}
                    className="p-3 rounded-xl text-green-600 hover:bg-white hover:shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center border border-transparent hover:border-green-100"
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

      {isModalOpen && (
        <RequestModal
          request={request}
          onClose={() => {
            setIsModalOpen(false);
            setPreSelectedStatus(null);
          }}
          initialStatus={preSelectedStatus || undefined}
          onCreateVoting={onCreateVoting}
        />
      )}

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

    </>
  );
};

export default Card;