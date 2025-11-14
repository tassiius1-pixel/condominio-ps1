import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Status, Role } from '../types';
import Column from './Column';
import { STATUSES } from '../constants';

const Board: React.FC = () => {
  const { requests, updateRequestStatus, loading } = useData();
  const { currentUser } = useAuth();
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);

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
      updateRequestStatus(draggedRequestId, newStatus);
      setDraggedRequestId(null);
    }
  };

  return (
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
  );
};

export default Board;