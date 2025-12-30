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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <button onClick={() => setView && setView('home')} className="md:hidden text-gray-500 hover:text-gray-700 mr-2">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <CheckSquareIcon className="w-6 h-6 text-indigo-600" />
            Sugestões
          </h2>
          <p className="text-gray-500 text-sm">Compartilhe suas ideias para melhorar nosso condomínio.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nova Sugestão
        </button>
      </div>

      {/* Main Content - Board */}
      <div className="bg-gray-50/50 rounded-2xl">
        <Board setView={setView} />
      </div>

      {isModalOpen && (
        <RequestModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
