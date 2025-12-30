import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import RequestModal from './RequestModal';
import QuickActions from './QuickActions';
import {
    CalendarIcon,
    BarChartIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    MessageSquareIcon,
    LightbulbIcon,
    PlusIcon,
    UsersIcon
} from './Icons';
import { Request, Role, View, RequestType, Status } from '../types';

interface HomeProps {
    setView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setView }) => {
    const { currentUser } = useAuth();
    const { votings, reservations, occurrences, requests } = useData();

    const isAdminProfile = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

    // Filter Pending Tasks for Management (Suggestions and Occurrences that need attention)
    const pendingRequests = requests.filter(req =>
        req.type === RequestType.SUGESTOES &&
        [Status.PENDENTE, Status.EM_ANALISE].includes(req.status)
    ).map(r => ({ ...r, taskType: 'suggestion' }));

    const pendingOccurrences = occurrences.filter(occ =>
        occ.status === 'Aberto'
    ).map(o => ({ ...o, taskType: 'occurrence' }));

    const pendingTasks = [...pendingRequests, ...pendingOccurrences].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Fast Summary Logic
    const activeVoting = votings.find(v => {
        const end = new Date(v.endDate);
        end.setHours(23, 59, 59, 999);
        return end >= new Date();
    });

    const userReservations = reservations
        .filter(r => r.userId === currentUser?.id)
        .filter(r => {
            const resDate = new Date(r.date + 'T12:00:00');
            resDate.setHours(0, 0, 0, 0);
            const todayZero = new Date();
            todayZero.setHours(0, 0, 0, 0);
            return resDate >= todayZero;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextReservation = userReservations[0];
    const openOccurrences = occurrences.filter(o => o.authorId === currentUser?.id && o.status === 'Aberto').length;

    const SummaryCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactNode;
        color: string;
        onClick?: () => void;
    }> = ({ title, value, icon, color, onClick }) => (
        <div
            onClick={onClick}
            className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                    <p className="text-xl font-black text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );

    const [selectedRequest, setSelectedRequest] = React.useState<Request | null>(null);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* GREETING SECTION */}
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                    Olá, {currentUser?.name.split(' ')[0]}! 👋
                </h1>
                <p className="text-gray-500 font-medium mt-1">
                    {isAdminProfile
                        ? "Bem-vindo ao painel de gestão condominial."
                        : "Aqui está o resumo das atividades da sua unidade."}
                </p>
            </header>

            {/* Quick Actions Section */}
            <section>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="text-lg font-bold text-gray-800 tracking-tight uppercase">Ações Rápidas</h2>
                </div>
                <QuickActions setView={setView} onNewSuggestion={() => setView('dashboard')} />
            </section>

            {/* Pending Tasks Section - More prominent for Management */}
            {isAdminProfile && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Tarefas Pendentes</h2>
                            <span className="bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full text-xs font-black">
                                {pendingTasks.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setView('dashboard')}
                            className="text-indigo-600 text-sm font-bold hover:underline"
                        >
                            Ver todas
                        </button>
                    </div>

                    {pendingTasks.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                            <CheckCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Você está em dia! Nenhuma tarefa pendente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingTasks.slice(0, 8).map(task => { // Increased to 8 for management
                                const isSuggestion = (task as any).taskType === 'suggestion';
                                const isOld = (new Date().getTime() - new Date(task.createdAt).getTime()) > 2 * 24 * 60 * 60 * 1000;
                                const isResponded = !!(task as any).adminResponse;
                                const title = isSuggestion ? (task as any).title : (task as any).subject;

                                return (
                                    <div
                                        key={task.id}
                                        className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col h-full active:scale-[0.98] cursor-pointer"
                                        onClick={() => isSuggestion ? setSelectedRequest(task as any) : setView('occurrences')}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSuggestion ? 'bg-indigo-50 text-indigo-400' : 'bg-red-50 text-red-400'}`}>
                                                    {isSuggestion ? <MessageSquareIcon className="h-4 w-4" /> : <AlertTriangleIcon className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {task.authorName}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isSuggestion ? 'text-indigo-400' : 'text-red-400'}`}>
                                                        {isSuggestion ? 'Sugestão' : 'Ocorrência'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {isResponded && (
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-blue-100">
                                                        Respondida
                                                    </span>
                                                )}
                                                {isOld && !isResponded && (
                                                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-red-100 animate-pulse">
                                                        Atrasada
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                                            {task.description}
                                        </p>

                                        <div className="mt-auto flex items-center gap-2 text-indigo-600 text-sm font-black uppercase tracking-widest">
                                            {isResponded ? 'Visualizar' : (isSuggestion ? 'Responder Agora' : 'Ver Ocorrência')}
                                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Support/Summary Section - For Residents or secondary info */}
            {!isAdminProfile && (
                <section>
                    <div className="flex items-center gap-2 mb-6 px-2">
                        <BarChartIcon className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            Resumo da sua Unidade
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard
                            title="Votação Ativa"
                            value={activeVoting ? activeVoting.title : 'Nenhuma no momento'}
                            icon={activeVoting ? <CheckCircleIcon className="w-6 h-6" /> : <AlertTriangleIcon className="w-6 h-6" />}
                            color={activeVoting ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}
                            onClick={activeVoting ? () => setView('voting') : undefined}
                        />

                        <SummaryCard
                            title="Sua Próxima Reserva"
                            value={nextReservation ? new Date(nextReservation.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não há reservas'}
                            icon={<CalendarIcon className="w-6 h-6" />}
                            color="bg-emerald-50 text-emerald-600"
                            onClick={() => setView('reservations')}
                        />

                        <SummaryCard
                            title="Minhas Ocorrências"
                            value={openOccurrences}
                            icon={<AlertTriangleIcon className="w-6 h-6" />}
                            color="bg-red-50 text-red-600"
                            onClick={() => setView('occurrences')}
                        />
                    </div>
                </section>
            )}

            {/* Modal de Detalhes da Sugestão */}
            {selectedRequest && (
                <RequestModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
};

export default Home;
