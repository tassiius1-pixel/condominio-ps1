import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { RequestType, Status, View } from '../types';
import Card from './Card';

interface BoardProps {
  setView?: (view: View) => void;
}

const Board: React.FC<BoardProps> = ({ setView }) => {
  const { requests, loading } = useData();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const isArchived = (req: any) => {
    if (req.status !== Status.APROVADA && req.status !== Status.RECUSADA && req.status !== Status.CONCLUIDO) {
      return false;
    }

    // Use statusUpdatedAt if available, otherwise fallback to createdAt for legacy items
    const dateToCheck = req.statusUpdatedAt ? new Date(req.statusUpdatedAt) : new Date(req.createdAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return dateToCheck < threeDaysAgo;
  };

  const allSuggestions = requests
    .filter(req => req.type === RequestType.SUGESTOES)
    .sort((a, b) => {
      const likesA = a.likes?.length || 0;
      const likesB = b.likes?.length || 0;
      return likesB - likesA; // Descending order
    });

  const activeSuggestions = allSuggestions.filter(req => !isArchived(req));
  const archivedSuggestions = allSuggestions.filter(req => isArchived(req));

  const displayedSuggestions = activeTab === 'active' ? activeSuggestions : archivedSuggestions;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando sugestões...</div>;
  }

  const handleCreateVoting = (title: string, description: string, requestId: string) => {
    if (setView) {
      localStorage.setItem('draft_voting', JSON.stringify({ title, description, requestId }));
      setView('voting');
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'active'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Ativas ({activeSuggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'archived'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Arquivadas ({archivedSuggestions.length})
        </button>
      </div>

      {displayedSuggestions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500 text-lg">
            {activeTab === 'active' ? 'Nenhuma sugestão ativa.' : 'Nenhuma sugestão arquivada.'}
          </p>
          {activeTab === 'active' && (
            <p className="text-gray-400 text-sm mt-2">Seja o primeiro a compartilhar uma ideia!</p>
          )}
        </div>
      ) : (
        displayedSuggestions.map(request => (
          <Card
            key={request.id}
            request={request}
            onDragStart={() => { }}
            onCreateVoting={(title, desc) => handleCreateVoting(title, desc, request.id)}
          />
        ))
      )}
    </div>
  );
};

export default Board;