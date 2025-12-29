import React from 'react';
import { View } from '../types';
import { CalendarIcon, AlertTriangleIcon, LightbulbIcon } from './Icons';

interface QuickActionsProps {
    setView?: (view: View) => void;
    onNewSuggestion: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ setView, onNewSuggestion }) => {
    // Helper to safely navigate
    const handleNavigation = (view: View) => {
        if (setView) setView(view);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Reservation Card */}
            <div
                onClick={() => handleNavigation('reservations')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex flex-col items-start justify-between h-full space-y-4">
                    <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                        <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Reservar Espaço</h3>
                        <p className="text-sm text-indigo-100 mt-1">
                            Garanta seu horário na churrasqueira ou salão.
                        </p>
                    </div>
                </div>
            </div>

            {/* Occurrence Card */}
            <div
                onClick={() => handleNavigation('occurrences')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex flex-col items-start justify-between h-full space-y-4">
                    <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                        <AlertTriangleIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Reportar Ocorrência</h3>
                        <p className="text-sm text-orange-100 mt-1">
                            Algo errado? Nos avise rapidamente.
                        </p>
                    </div>
                </div>
            </div>

            {/* Suggestion Card */}
            <div
                onClick={onNewSuggestion}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex flex-col items-start justify-between h-full space-y-4">
                    <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                        <LightbulbIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Dê uma Sugestão</h3>
                        <p className="text-sm text-emerald-100 mt-1">
                            Ajude a melhorar nosso condomínio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickActions;
