import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Status, Role } from '../types';
import Column from './Column';
import { STATUSES } from '../constants';

import JustificationModal from './JustificationModal';

const Board: React.FC = () => {
  const { requests, updateRequestStatus, addComment, loading } = useData();
  const { currentUser } = useAuth();
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);

  // State for Justification Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDrag, setPendingDrag] = useState<{ requestId: string, newStatus: Status } | null>(null);

  const canDrag = currentUser?.role === Role.ADMIN || currentUser?.role === Role.GESTAO;

  const handleDragStart = (requestId: string) => {
    if (canDrag) {
      setDraggedRequestId(requestId);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (newStatus: Status) => {
    if (draggedRequestId && canDrag) {
      // Check if status is actually changing
      const request = requests.find(r => r.id === draggedRequestId);
      if (request && request.status !== newStatus) {
        setPendingDrag({ requestId: draggedRequestId, newStatus });
        setIsModalOpen(true);
      }
      setDraggedRequestId(null);
    }
  };

  const handleConfirmJustification = (text: string) => {
    if (pendingDrag && currentUser) {
      // 1. Update Status
      updateRequestStatus(pendingDrag.requestId, pendingDrag.newStatus);

      // 2. Add Comment
      addComment(pendingDrag.requestId, {
        authorId: currentUser.id,
        authorName: currentUser.name,
        text: text,
        type: 'status_change',
        newStatus: pendingDrag.newStatus
      });

      setPendingDrag(null);
      setIsModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    setPendingDrag(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUSES.map(status => (
          <Column
            key={status}
            status={status}
            requests={requests.filter(req => req.status === status)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
            onDragStartCard={handleDragStart}
            loading={loading}
          />
        ))}
      </div>

      <JustificationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmJustification}
        title="Justificativa de Alteração de Status"
      />
    </>
  );
};

export default Board;