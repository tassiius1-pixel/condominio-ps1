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
  ChevronRightIcon
} from "./Icons";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { View } from "../types";

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {getGreeting()}, {currentUser?.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1">
            Aqui está o resumo do seu condomínio hoje.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nova Pendência
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Votações */}
        <div
          onClick={() => setView && setView('voting')}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer border border-gray-100 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <BarChartIcon className="w-6 h-6" />
            </div>
            {activeVoting && <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>}
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Votações</h3>
          <p className="text-gray-900 font-bold text-lg mt-1 truncate">
            {activeVoting ? activeVoting.title : "Nenhuma ativa"}
          </p>
          <div className="mt-2 text-xs text-purple-600 font-medium flex items-center">
            Ver detalhes <ChevronRightIcon className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Card 2: Próxima Reserva */}
        <div
          onClick={() => setView && setView('reservations')}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer border border-gray-100 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Próxima Reserva</h3>
          <p className="text-gray-900 font-bold text-lg mt-1 truncate">
            {myNextReservation
              ? new Date(myNextReservation.date).toLocaleDateString('pt-BR')
              : "Nenhuma agendada"}
          </p>
          <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
            Gerenciar reservas <ChevronRightIcon className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Card 3: Ocorrências */}
        <div
          onClick={() => setView && setView('occurrences')}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer border border-gray-100 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            {myOpenOccurrences > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">
                {myOpenOccurrences}
              </span>
            )}
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Minhas Ocorrências</h3>
          <p className="text-gray-900 font-bold text-lg mt-1">
            {myOpenOccurrences === 0 ? "Tudo certo!" : `${myOpenOccurrences} em aberto`}
          </p>
          <div className="mt-2 text-xs text-orange-600 font-medium flex items-center">
            Ver livro <ChevronRightIcon className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Card 4: Último Aviso */}
        <div
          onClick={() => setView && setView('notices')}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer border border-gray-100 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <InfoIcon className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Último Aviso</h3>
          <p className="text-gray-900 font-bold text-lg mt-1 truncate" title={latestNotice?.title}>
            {latestNotice ? latestNotice.title : "Sem avisos"}
          </p>
          <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
            Ver mural <ChevronRightIcon className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>

      {/* Main Content - Board */}
      <div className="bg-gray-50/50 rounded-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CheckSquareIcon className="w-6 h-6 text-indigo-600" />
            Pendências e Solicitações
          </h2>
          <p className="text-gray-500 text-sm">Acompanhe o status das solicitações do condomínio.</p>
        </div>
        <Board />
      </div>

      {isModalOpen && (
        <RequestModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
