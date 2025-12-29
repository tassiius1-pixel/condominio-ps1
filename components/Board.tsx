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
    <div className="max-w-4xl space-y-8 pb-12 animate-fade-in">
      {/* Tabs System */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-gray-200/50 rounded-2xl backdrop-blur-sm border border-gray-200/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`
              flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all
              ${activeTab === 'active'
                ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}
            `}
          >
            🔥 Ativas
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
              {activeSuggestions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`
              flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all
              ${activeTab === 'archived'
                ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}
            `}
          >
            📦 Arquivadas
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'archived' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
              {archivedSuggestions.length}
            </span>
          </button>
        </div>
      </div>

      {displayedSuggestions.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✨</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            {activeTab === 'active' ? 'Nenhuma sugestão ativa' : 'Nenhuma sugestão arquivada'}
          </h3>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            {activeTab === 'active' ? 'Seja o primeiro a compartilhar uma ideia para melhorar nosso condomínio!' : 'Ainda não há itens no histórico.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {displayedSuggestions.map((request, idx) => (
            <div key={request.id} className="animate-slideFadeIn" style={{ animationDelay: `${idx * 0.05}s` }}>
              <Card
                request={request}
                onDragStart={() => { }}
                onCreateVoting={(title, desc) => handleCreateVoting(title, desc, request.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Board;