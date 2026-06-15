import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { Role, View } from '../types';
import { ChevronLeftIcon, BellIcon } from './Icons';

interface CreateNoticeProps {
  setView: (view: View) => void;
}

const CreateNotice: React.FC<CreateNoticeProps> = ({ setView }) => {
  const { addNotice } = useData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await addNotice({
        title: title.trim(),
        content: content.trim(),
      });
      setView('home');
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-5">
        <button
          onClick={() => setView('home')}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 touch-active shrink-0"
          title="Voltar para o Início"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Criar Novo Aviso
          </h1>
          <p className="text-gray-500 text-[10px] md:text-sm mt-1 font-semibold leading-tight">
            Publique comunicados importantes para todos os moradores no mural.
          </p>
        </div>
      </div>

      {/* Formulário Card */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Título do Comunicado
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 focus:bg-white outline-none shadow-sm font-bold text-gray-800"
              placeholder="Ex: Manutenção da Piscina na Segunda-feira"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Conteúdo / Mensagem do Aviso
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 focus:bg-white outline-none shadow-sm font-semibold text-gray-700 leading-relaxed"
              placeholder="Descreva aqui detalhadamente a mensagem que deseja transmitir a todos os moradores do condomínio..."
              required
            />
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-xs text-indigo-700 font-semibold leading-relaxed">
            <BellIcon className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <p className="font-bold text-indigo-800">Atenção ao Publicar:</p>
              <p className="mt-0.5 text-indigo-600/95">
                Ao publicar este aviso, ele aparecerá imediatamente no <strong className="font-extrabold text-indigo-900">Mural de Avisos</strong> na tela inicial de todos os moradores. Além disso, gerará uma <strong className="font-extrabold text-indigo-900">Notificação Interna</strong> e um <strong className="font-extrabold text-indigo-900">Push Notification</strong> nos celulares dos usuários.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView('home')}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-[0.98] transition-all text-center text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Publicando...
                </span>
              ) : (
                'Publicar Aviso'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNotice;
