import React from 'react';
import { View, Role } from '../types';
import { CalendarIcon, AlertTriangleIcon, LightbulbIcon, PlusIcon, BarChartIcon, CheckCircleIcon, ImageIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';

interface QuickActionsProps {
    setView?: (view: View) => void;
    onNewSuggestion: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ setView, onNewSuggestion }) => {
    const { currentUser } = useAuth();

    // Helper to safely navigate
    const handleNavigation = (view: View) => {
        if (setView) setView(view);
    };

    const isAdminProfile = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

    const ActionCard: React.FC<{
        title: string;
        subtitle: string;
        icon: React.ReactNode;
        gradient: string;
        onClick: () => void;
    }> = ({ title, subtitle, icon, gradient, onClick }) => (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4.5 text-white shadow-md transition-all duration-350 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer`}
        >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20 pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/15 group-hover:bg-white/30 transition-all shrink-0">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-[15px] font-black leading-tight tracking-tight whitespace-normal break-words">
                        {title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 font-medium leading-snug line-clamp-1">
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Common Quick Actions */}
            <ActionCard
                title="Reservar"
                subtitle="Churrasqueira ou Salão"
                icon={<CalendarIcon className="h-6 w-6 text-white" />}
                gradient="from-indigo-600 to-indigo-800"
                onClick={() => handleNavigation('reservations')}
            />

            {isAdminProfile ? (
                <ActionCard
                    title="Criar Votação"
                    subtitle="Abrir nova enquete"
                    icon={<CheckCircleIcon className="h-6 w-6 text-white" />}
                    gradient="from-indigo-500 to-purple-600"
                    onClick={() => handleNavigation('voting')}
                />
            ) : (
                <ActionCard
                    title="Livro de Ocorrências"
                    subtitle="Algo errado? Avise aqui"
                    icon={<AlertTriangleIcon className="h-6 w-6 text-white" />}
                    gradient="from-amber-500 to-orange-600"
                    onClick={() => handleNavigation('occurrences')}
                />
            )}



            {isAdminProfile && (
                <ActionCard
                    title="Relatórios"
                    subtitle="Visualizar desempenho"
                    icon={<BarChartIcon className="h-6 w-6 text-white" />}
                    gradient="from-purple-600 to-pink-700"
                    onClick={() => handleNavigation('reports')}
                />
            )}

            {!isAdminProfile && (
                <ActionCard
                    title="Sugestão / Manutenção"
                    subtitle="Ajude a melhorar"
                    icon={<LightbulbIcon className="h-6 w-6 text-white" />}
                    gradient="from-emerald-400 to-teal-600"
                    onClick={onNewSuggestion}
                />
            )}

            <ActionCard
                title="Galeria"
                subtitle="Fotos e Vídeos de Eventos"
                icon={<ImageIcon className="h-6 w-6 text-white" />}
                gradient="from-pink-500 to-rose-600"
                onClick={() => handleNavigation('gallery')}
            />
        </div>
    );
};

export default QuickActions;
