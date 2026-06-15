import React, { useState } from "react";
import Board from "./Board";
import RequestModal from "./RequestModal";
import {
  PlusIcon,
  CalendarIcon,
  CheckSquareIcon,
  BookIcon,
  AlertTriangleIcon,
  BarChartIcon,
  InfoIcon,

  ChevronRightIcon,
  ChevronLeftIcon
} from "./Icons";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { View, Role } from "../types";

interface DashboardProps {
  setView?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { votings, reservations, occurrences, notices } = useData();
  const { currentUser } = useAuth();

  // Logic for cards
  const activeVoting = votings.find(v => {
    const now = new Date();
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    return now >= start && now <= end;
  });

  const myNextReservation = currentUser ? reservations
    .filter(r => r.userId === currentUser.id && new Date(r.date + 'T00:00:00') >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] : null;

  const myOpenOccurrences = currentUser ? occurrences.filter(o => o.authorId === currentUser.id && o.status === 'Aberto').length : 0;

  const latestNotice = notices.length > 0 ? notices[0] : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {setView && (
            <button
              onClick={() => setView('home')}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 touch-active shrink-0"
              title="Voltar para o Início"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Sugestões e Manutenções
            </h1>
            <p className="text-gray-500 text-[10px] md:text-sm mt-1 font-semibold leading-tight">
              Envie sugestões de melhorias ou relate itens que precisam de manutenção no condomínio.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 flex-shrink-0 whitespace-nowrap self-start md:self-auto"
        >
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span>Nova Demanda</span>
        </button>
      </div>

      {/* Main Content - Board */}
      <div className="w-full">
        <Board setView={setView} />
      </div>

      {isModalOpen && (
        <RequestModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
