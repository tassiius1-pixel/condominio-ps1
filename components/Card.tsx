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

const priorityAccent: Record<Priority, string> = {
  [Priority.URGENTE]: 'from-red-500 to-rose-400',
  [Priority.ALTA]:    'from-orange-500 to-amber-400',
  [Priority.MEDIA]:   'from-yellow-400 to-yellow-300',
  [Priority.BAIXA]:   'from-blue-400 to-indigo-400',
};

const typeIcons: Record<RequestType, React.ReactNode> = {
  [RequestType.ELETRICA]:        <BoltIcon className="w-4 h-4" />,
  [RequestType.HIDRAULICA]:      <DropletIcon className="w-4 h-4" />,
  [RequestType.PREDIAL]:         <WrenchScrewdriverIcon className="w-4 h-4" />,
  [RequestType.SEGURANCA]:       <ShieldCheckIcon className="w-4 h-4" />,
  [RequestType.INCENDIO]:        <FlameIcon className="w-4 h-4" />,
  [RequestType.AR_CONDICIONADO]: <WindIcon className="w-4 h-4" />,
  [RequestType.JARDINAGEM]:      <LeafIcon className="w-4 h-4" />,
  [RequestType.LIMPEZA]:         <SparklesIcon className="w-4 h-4" />,
  [RequestType.PORTOES]:         <DoorOpenIcon className="w-4 h-4" />,
  [RequestType.PISCINA]:         <WavesIcon className="w-4 h-4" />,
  [RequestType.PEQUENOS_REPAROS]:<WrenchScrewdriverIcon className="w-4 h-4" />,
  [RequestType.SUGESTOES]:       <LightbulbIcon className="w-4 h-4" />,
};

const Card: React.FC<CardProps> = ({ request, onDragStart, onCreateVoting }) => {
  const { currentUser } = useAuth();
  const { users, toggleRequestLike, updateRequestStatus } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [preSelectedStatus, setPreSelectedStatus] = useState<Status | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const canManage = currentUser?.role === Role.ADMIN ||
    currentUser?.role === Role.GESTAO ||
    currentUser?.role === Role.SINDICO ||
    currentUser?.role === Role.SUBSINDICO;

  const isSuggestion = request.type === RequestType.SUGESTOES;
  const likesCount = request.likes?.length || 0;
  const isLiked = currentUser ? request.likes?.includes(currentUser.id) : false;

  const author = users.find(u => u.id === request.authorId);
  const authorFirstName = author ? author.name.split(' ')[0] : 'Desconhecido';
  const authorDisplay = author ? `${authorFirstName} • Unidade ${author.houseNumber}` : request.authorName;
  const formattedDate = new Date(request.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const style = getStatusStyle(request.status);
  const accent = priorityAccent[request.priority] || 'from-gray-400 to-gray-300';

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
    if (currentUser) await toggleRequestLike(request.id, currentUser.id);
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

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (descriptionRef.current) {
        setHasOverflow(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
      }
    };
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (descriptionRef.current) resizeObserver.observe(descriptionRef.current);
    checkOverflow();
    return () => resizeObserver.disconnect();
  }, [request.description, request.photos.length]);

  return (
    <>
      <div
        draggable={canManage}
        onDragStart={handleDragStart}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Abrir detalhes: ${request.title}`}
        className={`relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} group`}
      >
        {/* Priority Accent Top Bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />

        <div className="p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Icon + Type + Author */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl shadow-sm ${isSuggestion ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                {typeIcons[request.type]}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-gray-900 text-sm leading-tight tracking-tight line-clamp-1 group-hover:text-indigo-700 transition-colors duration-200">
                  {request.title}
                </h4>
                <p className="text-[10px] font-semibold text-gray-400 mt-0.5 tracking-wide truncate">
                  {formattedDate} · {authorDisplay}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
              <span className="text-xs leading-none">{style.icon}</span>
              {request.status}
            </span>
          </div>

          {/* Description + Photo */}
          <div className="block min-w-0">
            {request.photos.length > 0 && (
              <div className="float-right ml-3 mb-1 group/thumb">
                <div className="relative w-18 h-18" style={{ width: 72, height: 72 }}>
                  <img
                    src={request.photos[0]}
                    alt="Anexo"
                    className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md cursor-zoom-in hover:brightness-110 transition-all duration-300"
                    onClick={(e) => openLightbox(e, 0)}
                  />
                  {request.photos.length > 1 && (
                    <div
                      className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl cursor-pointer"
                      onClick={(e) => openLightbox(e, 0)}
                    >
                      <span className="text-white font-black text-xs">+{request.photos.length - 1}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p
              ref={descriptionRef}
              className={`text-sm text-gray-500 leading-relaxed font-medium transition-all duration-300 ${!isExpanded && 'line-clamp-2'}`}
            >
              {request.description}
            </p>

            {(hasOverflow || isExpanded) && (
              <button
                onClick={toggleExpand}
                className="mt-1.5 text-[11px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                {isExpanded ? 'Ver menos ↑' : 'Ver mais ↓'}
              </button>
            )}

            {/* Admin Response */}
            {request.adminResponse && (
              <div className={`mt-3.5 pl-4 border-l-2 ${style.border.replace('200', '400').replace('border-', 'border-')} relative py-0.5`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                  <span>{style.icon}</span> Resposta da Gestão
                </p>
                <p className={`text-xs font-semibold leading-relaxed ${style.text} ${!isExpanded && 'line-clamp-2'}`}>
                  {request.adminResponse}
                </p>
              </div>
            )}

            <div className="clear-both" />
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
            {/* Social Counters */}
            <div className="flex items-center gap-3">
              {isSuggestion && (
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    isLiked
                      ? 'bg-red-50 text-red-600 shadow-sm'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-red-500'
                  }`}
                  title="Apoiar sugestão"
                >
                  <HeartIcon className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{likesCount}</span>
                </button>
              )}
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                <MessageSquareIcon className="w-3.5 h-3.5" />
                <span>{request.comments.length}</span>
              </div>
            </div>

            {/* Hint to open */}
            <span className="text-[10px] text-gray-300 font-semibold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
              Ver detalhes →
            </span>
          </div>

          {/* Management Actions */}
          {canManage && isSuggestion && (
            <div
              className="mt-4 pt-4 border-t border-gray-100/80 flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Status Actions */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={(e) => handleStatusClick(e, Status.RECUSADA)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-red-200 bg-red-50/20 text-red-600 hover:bg-red-50 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 flex-1 md:flex-initial"
                  title="Recusar"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  <span>Recusar</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStatusClick(e, Status.EM_ANALISE)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/20 text-blue-600 hover:bg-blue-50 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 flex-1 md:flex-initial"
                  title="Em Análise"
                >
                  <InfoIcon className="w-3.5 h-3.5" />
                  <span>Analisar</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStatusClick(e, Status.EM_ANDAMENTO)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/20 text-amber-600 hover:bg-amber-50 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 flex-1 md:flex-initial"
                  title="Em Andamento"
                >
                  <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                  <span>Andamento</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStatusClick(e, Status.CONCLUIDO)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 flex-1 md:flex-initial"
                  title="Concluir"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>Concluir</span>
                </button>
              </div>

              {/* Criar Votação */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCreateVoting) onCreateVoting(request.title, request.description);
                }}
                className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:scale-105 active:scale-95 whitespace-nowrap self-stretch md:self-auto"
              >
                <BarChartIcon className="w-3.5 h-3.5" />
                Criar Votação
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <RequestModal
          request={request}
          onClose={() => { setIsModalOpen(false); setPreSelectedStatus(null); }}
          initialStatus={preSelectedStatus || undefined}
          onCreateVoting={onCreateVoting}
        />
      )}

      {isLightboxOpen && (
        <ImageLightbox
          images={request.photos}
          currentIndex={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : request.photos.length - 1)}
          onNext={() => setCurrentImageIndex(prev => prev < request.photos.length - 1 ? prev + 1 : 0)}
        />
      )}
    </>
  );
};

export default Card;