import React, { useState } from 'react';
import { Request, Role, Priority, RequestType } from '../types';
import { useAuth } from '../hooks/useAuth';
import RequestModal from './RequestModal';
import { useData } from '../hooks/useData';
import { BoltIcon, DropletIcon, WrenchScrewdriverIcon, ShieldCheckIcon, FlameIcon, WindIcon, LeafIcon, SparklesIcon, DoorOpenIcon, WavesIcon, ImageIcon } from './Icons';

interface CardProps {
  request: Request;
  onDragStart: (requestId: string) => void;
}

const priorityColors: Record<Priority, string> = {
  [Priority.URGENTE]: 'border-red-500',
  [Priority.ALTA]: 'border-orange-500',
  [Priority.MEDIA]: 'border-yellow-500',
  [Priority.BAIXA]: 'border-blue-500',
};

const priorityBadgeColors: Record<Priority, string> = {
  [Priority.URGENTE]: 'bg-red-100 text-red-800',
  [Priority.ALTA]: 'bg-orange-100 text-orange-800',
  [Priority.MEDIA]: 'bg-yellow-100 text-yellow-800',
  [Priority.BAIXA]: 'bg-blue-100 text-blue-800',
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
};


const Card: React.FC<CardProps> = ({ request, onDragStart }) => {
  const { currentUser } = useAuth();
  const { users } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canDrag = currentUser?.role === Role.ADMIN || currentUser?.role === Role.GESTAO;

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
        aria-label={`Abrir detalhes da pendência: ${request.title}`}
        className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${priorityColors[request.priority] || 'border-gray-500'} ${canDrag ? 'cursor-grab' : 'cursor-pointer'} hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200`}
      >
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-gray-800 pr-2">{request.title}</h4>
          <span className="text-gray-500 flex-shrink-0">{typeIcons[request.type]}</span>
        </div>

        <p className="text-sm text-gray-600 mt-2 truncate">{request.description}</p>

        {request.photos.length > 0 && (
          <div className="mt-3 flex items-center space-x-2">
            {request.photos.slice(0, 3).map((photo, index) => (
              <img key={index} src={photo} alt={`Anexo ${index + 1}`} className="w-14 h-14 object-cover rounded-md bg-gray-200" />
            ))}
            {request.photos.length > 3 && (
              <div className="w-14 h-14 rounded-md bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                +{request.photos.length - 3}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t text-xs text-gray-500">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p>Data: {formattedDate}</p>
              <p>Setor: {request.sector}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-medium text-gray-700">{authorDisplay}</p>
              {canDrag && (
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${priorityBadgeColors[request.priority]}`}>
                  Prioridade: {request.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && <RequestModal request={request} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default Card;