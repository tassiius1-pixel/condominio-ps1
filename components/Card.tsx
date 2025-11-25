import React, { useState } from 'react';
import { Request, Role, Priority, RequestType } from '../types';
import { useAuth } from '../hooks/useAuth';
import RequestModal from './RequestModal';
import { useData } from '../hooks/useData';
import {
  BoltIcon, DropletIcon, WrenchScrewdriverIcon, ShieldCheckIcon,
  FlameIcon, WindIcon, LeafIcon, SparklesIcon, DoorOpenIcon,
  WavesIcon, ImageIcon, HeartIcon, LightbulbIcon, MessageSquareIcon
} from './Icons';

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
  [RequestType.ELETRICA]: <BoltIcon className="w-5 h-5" />,
  [RequestType.HIDRAULICA]: <DropletIcon className="w-5 h-5" />,
  [RequestType.PREDIAL]: <WrenchScrewdriverIcon className="w-5 h-5" />,
  [RequestType.SEGURANCA]: <ShieldCheckIcon className="w-5 h-5" />,
  [RequestType.INCENDIO]: <FlameIcon className="w-5 h-5" />,
  [RequestType.AR_CONDICIONADO]: <WindIcon className="w-5 h-5" />,
  [RequestType.JARDINAGEM]: <LeafIcon className="w-5 h-5" />,
  [RequestType.LIMPEZA]: <SparklesIcon className="w-5 h-5" />,
  [RequestType.PORTOES]: <DoorOpenIcon className="w-5 h-5" />,
  [RequestType.PISCINA]: <WavesIcon className="w-5 h-5" />,
  [RequestType.PEQUENOS_REPAROS]: <WrenchScrewdriverIcon className="w-5 h-5" />,
  [RequestType.SUGESTOES]: <LightbulbIcon className="w-5 h-5" />,
};


const Card: React.FC<CardProps> = ({ request, onDragStart, onCreateVoting }) => {
  const { currentUser } = useAuth();
  const { users, toggleRequestLike } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canDrag = currentUser?.role === Role.ADMIN || currentUser?.role === Role.GESTAO;
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

  const author = users.find(u => u.id === request.authorId);
  const authorFirstName = author ? author.name.split(' ')[0] : 'Desconhecido';
  const authorDisplay = author ? `${authorFirstName} - Casa ${author.houseNumber}` : request.authorName;
  const formattedDate = new Date(request.createdAt).toLocaleDateString('pt-BR');

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
          bg-white p-4 rounded-xl shadow-sm border-l-4 
          ${priorityColors[request.priority] || 'border-gray-500'} 
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} 
          hover:shadow-md transition-all duration-200
          ${isSuggestion ? 'bg-purple-50/30' : ''}
          relative group
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${isSuggestion ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
              {typeIcons[request.type]}
            </span>
            <div>
              <h4 className="font-bold text-gray-800 leading-tight">{request.title}</h4>
              <p className="text-xs text-gray-500">{formattedDate} • {authorDisplay}</p>
            </div>
          </div>
          {request.status !== 'Pendente' && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium
              ${(request.status === 'Concluído' || request.status === 'Aprovada') ? 'bg-green-100 text-green-700' :
                (request.status === 'Em Andamento' || request.status === 'Em Análise') ? 'bg-blue-100 text-blue-700' :
                  request.status === 'Recusada' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'}`}>
              {request.status}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mt-2 line-clamp-3">{request.description}</p>

        {request.photos.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
            {request.photos.map((photo, index) => (
              <img key={index} src={photo} alt={`Anexo ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-100" />
            ))}
          </div>
        )}

        {/* Official Response Section */}
        {request.adminResponse && (
          <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs font-bold text-blue-800 mb-1">Resposta da Gestão:</p>
            <p className="text-sm text-blue-900">{request.adminResponse}</p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isSuggestion && (
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors text-sm font-medium
                  ${isLiked
                    ? 'text-red-500 bg-red-50 border border-red-100'
                    : 'text-gray-500 hover:bg-gray-50 border border-transparent hover:border-gray-200'}
                  `}
                title="Apoiar sugestão"
              >
                <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
              <MessageSquareIcon className="w-4 h-4" />
              <span>{request.comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.GESTAO) && isSuggestion && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCreateVoting) {
                    onCreateVoting(request.title, request.description);
                  } else {
                    alert('Funcionalidade de transformar em votação em breve!');
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              >
                Criar Votação
              </button>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && <RequestModal request={request} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default Card;