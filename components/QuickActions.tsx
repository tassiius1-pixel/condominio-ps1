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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {/* Reservation Card */}
            <div
                onClick={() => handleNavigation('reservations')}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="rounded-lg bg-white/20 p-2.5 backdrop-blur-sm shrink-0">
                        <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold leading-tight">Reservar</h3>
                        <p className="text-xs text-indigo-100 mt-0.5 leading-snug">
                            Churrasqueira ou Salão
                        </p>
                    </div>
                </div>
            </div>

            {/* Occurrence Card */}
            <div
                onClick={() => handleNavigation('occurrences')}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 p-4 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="rounded-lg bg-white/20 p-2.5 backdrop-blur-sm shrink-0">
                        <AlertTriangleIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold leading-tight">Ocorrência</h3>
                        <p className="text-xs text-orange-100 mt-0.5 leading-snug">
                            Algo errado? Avise aqui
                        </p>
                    </div>
                </div>
            </div>

            {/* Suggestion Card */}
            <div
                onClick={onNewSuggestion}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-4 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
            >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-all group-hover:bg-white/30" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="rounded-lg bg-white/20 p-2.5 backdrop-blur-sm shrink-0">
                        <LightbulbIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold leading-tight">Sugestão</h3>
                        <p className="text-xs text-emerald-100 mt-0.5 leading-snug">
                            Ajude a melhorar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickActions;
