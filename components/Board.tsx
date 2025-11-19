import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Status, Role } from '../types';
import Column from './Column';
import StatusChangeModal from './StatusChangeModal';
import { STATUSES } from '../constants';

const Board: React.FC = () => {
  const {
    requests,
    loading,
    updateRequestStatusWithComment,
  } = useData();

  const { currentUser } = useAuth();

  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Status | null>(null);
  const [oldStatus, setOldStatus] = useState<Status | null>(null);

  const canDrag =
    currentUser?.role === Role.ADMIN || currentUser?.role === Role.GESTAO;

  const handleDragStart = (requestId: string) => {
    if (canDrag) {
      setDraggedRequestId(requestId);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Soltou o card
  const handleDrop = (status: Status) => {
    if (!canDrag || !draggedRequestId) return;

    const req = requests.find((r) => r.id === draggedRequestId);
    if (!req) return;

    setOldStatus(req.status);
    setNewStatus(status);
    setIsModalOpen(true);
  };

  // Confirmar modal
  const handleConfirm = (justification: string) => {
    if (!draggedRequestId || !newStatus || !oldStatus || !currentUser) return;

    updateRequestStatusWithComment(
      draggedRequestId,
      oldStatus,
      newStatus,
      justification,
      currentUser
    );

    // Reset
    setDraggedRequestId(null);
    setIsModalOpen(false);
  };

  // Cancelar modal
  const handleCancel = () => {
    setIsModalOpen(false);
    setDraggedRequestId(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            requests={requests.filter((req) => req.status === status)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
            onDragStartCard={handleDragStart}
            loading={loading}
          />
        ))}
      </div>

      {isModalOpen && oldStatus && newStatus && (
        <StatusChangeModal
          oldStatus={oldStatus}
          newStatus={newStatus}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};

export default Board;
