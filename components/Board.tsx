import React from 'react';
import { useData } from '../hooks/useData';
import { RequestType } from '../types';
import Card from './Card';

interface BoardProps {
  setView?: (view: any) => void;
}

const Board: React.FC<BoardProps> = ({ setView }) => {
  const { requests, loading } = useData();

  const suggestions = requests
    .filter(req => req.type === RequestType.SUGESTOES)
    .sort((a, b) => {
      const likesA = a.likes?.length || 0;
      const likesB = b.likes?.length || 0;
      return likesB - likesA; // Descending order
    });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando sugestões...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <p className="text-gray-500 text-lg">Nenhuma sugestão encontrada.</p>
        <p className="text-gray-400 text-sm mt-2">Seja o primeiro a compartilhar uma ideia!</p>
      </div>
    );
  }

  const handleCreateVoting = (title: string, description: string) => {
    if (setView) {
      localStorage.setItem('draft_voting', JSON.stringify({ title, description }));
      setView('voting');
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {suggestions.map(request => (
        <Card
          key={request.id}
          request={request}
          onDragStart={() => { }} // No longer used in Feed view
          onCreateVoting={handleCreateVoting}
        />
      ))}
    </div>
  );
};

export default Board;