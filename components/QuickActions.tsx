import React from 'react';
import { View, Role } from '../types';
import { CalendarIcon, AlertTriangleIcon, LightbulbIcon, PlusIcon, UsersIcon, BarChartIcon, CheckCircleIcon } from './Icons';
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
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.03] active:scale-95 cursor-pointer`}
        >
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-3xl transition-all group-hover:bg-white/30" />
            <div className="relative z-10 flex items-center gap-5">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-md shrink-0 border border-white/20 group-hover:bg-white/30 transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-black leading-tight tracking-tight">{title}</h3>
                    <p className="text-xs text-white/80 mt-1 font-medium leading-snug">
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    title="Ocorrência"
                    subtitle="Algo errado? Avise aqui"
                    icon={<AlertTriangleIcon className="h-6 w-6 text-white" />}
                    gradient="from-amber-500 to-orange-600"
                    onClick={() => handleNavigation('occurrences')}
                />
            )}

            {isAdminProfile && currentUser?.role === Role.ADMIN && (
                <ActionCard
                    title="Usuários"
                    subtitle="Gerenciar perfis"
                    icon={<UsersIcon className="h-6 w-6 text-white" />}
                    gradient="from-blue-600 to-indigo-900"
                    onClick={() => handleNavigation('users')}
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
                    title="Sugestão/Manutenção"
                    subtitle="Ajude a melhorar"
                    icon={<LightbulbIcon className="h-6 w-6 text-white" />}
                    gradient="from-emerald-400 to-teal-600"
                    onClick={onNewSuggestion}
                />
            )}
        </div>
    );
};

export default QuickActions;
