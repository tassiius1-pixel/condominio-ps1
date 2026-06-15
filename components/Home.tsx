import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import RequestModal from './RequestModal';
import QuickActions from './QuickActions';

const formatAreaName = (area: string) => {
    if (!area) return '';
    switch (area) {
        case 'churrasco1':
            return 'Área de Churrasco 1';
        case 'churrasco2':
            return 'Área de Churrasco 2';
        case 'salao_festas':
            return 'Salão de Festas';
        default:
            return area.charAt(0).toUpperCase() + area.slice(1);
    }
};
import {
    CalendarIcon,
    BarChartIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    MessageSquareIcon,
    LightbulbIcon,
    PlusIcon,
    UsersIcon,
    BookIcon,
    BoletoIcon,
    InfoIcon,
    XIcon,
    WrenchScrewdriverIcon
} from './Icons';
import { Request, Role, View, RequestType, Status, Notice } from '../types';
import { getStatusStyle } from '../utils/statusUtils';

interface HomeProps {
    setView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setView }) => {
    const { currentUser } = useAuth();
    const { votings, reservations, occurrences, requests, users, notices, boletos, deleteNotice } = useData();

    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    const isAdminProfile = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

    // Próximas reservas do condomínio (Futuras ou de Hoje em diante)
    const upcomingReservations = [...reservations]
        .filter(r => {
            const resDate = new Date(r.date + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return resDate >= today;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);

    // Chamados de manutenção recentes (reparos, sem sugestões)
    const recentMaintenanceRequests = [...requests]
        .filter(r => r.type !== RequestType.SUGESTOES)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

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

    // Fast Summary Logic for Resident
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

    // Finance/Boleto Logic
    const userBoletos = boletos.filter(b => b.houseNumber === currentUser?.houseNumber)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestBoleto = userBoletos[0];

    // Admin Stats Logic
    const activeReservationsCount = reservations.filter(r => {
        const resDate = new Date(r.date + 'T12:00:00');
        resDate.setHours(0, 0, 0, 0);
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);
        return resDate >= todayZero;
    }).length;





    const renderNoticeBoard = (extraClass: string = "") => (
        <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col ${extraClass}`}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <InfoIcon className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Mural de Avisos</h2>
                </div>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-black">
                    {notices.length}
                </span>
            </div>

            {notices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <BookIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500 font-bold">Nenhum aviso ativo</p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">O mural de avisos está limpo hoje.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Primeiro aviso (Mais Recente) em Destaque Absoluto */}
                    <div 
                        onClick={() => setSelectedNotice(notices[0])}
                        className="bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 p-5 rounded-2xl border border-indigo-100/50 relative overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                    >
                        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-5 -mt-5 blur-xl pointer-events-none" />
                        <div className="flex items-center justify-between gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                            <span>Aviso Recente</span>
                            <div className="flex items-center gap-2">
                                <span>{new Date(notices[0].createdAt).toLocaleDateString('pt-BR')}</span>
                                {isAdminProfile && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm("Deseja mesmo excluir este aviso?")) {
                                                deleteNotice(notices[0].id);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Excluir aviso"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <h3 className="text-base font-black text-indigo-950 leading-snug">
                            {notices[0].title}
                        </h3>
                        <p className="text-xs text-indigo-900 mt-2 font-medium leading-relaxed line-clamp-4">
                            {notices[0].content}
                        </p>
                    </div>

                    {/* Lista resumida dos outros avisos */}
                    {notices.length > 1 && (
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Avisos Anteriores</p>
                            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                                {notices.slice(1, 4).map(notice => (
                                    <div
                                        key={notice.id}
                                        onClick={() => setSelectedNotice(notice)}
                                        className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]"
                                    >
                                        <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slate-400">
                                            <span className="truncate max-w-[120px] font-extrabold">{notice.authorName}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span>{new Date(notice.createdAt).toLocaleDateString('pt-BR')}</span>
                                                {isAdminProfile && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm("Deseja mesmo excluir este aviso?")) {
                                                                deleteNotice(notice.id);
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-750 p-0.5 rounded hover:bg-red-50 transition-colors"
                                                        title="Excluir aviso"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <h4 className="text-xs font-black text-slate-700 mt-1 line-clamp-1">{notice.title}</h4>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 font-medium leading-normal">{notice.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-[1400px] mx-auto">
            {/* HERO SECTION DE BOAS-VINDAS PREMIUM - COMPACTO E SUTIL */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-6 text-white shadow-md border border-slate-800">
                {/* Efeitos visuais discretos */}
                <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="space-y-1">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                            Porto Seguro 1 • Painel
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                            Olá, {currentUser?.name.split(' ')[0]}!
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl">
                            {isAdminProfile
                                ? "Bem-vindo ao seu painel administrativo. Acompanhe e gerencie as demandas do condomínio."
                                : "Acompanhe as principais informações da sua unidade e as novidades do condomínio."}
                        </p>
                    </div>

                    {isAdminProfile && (
                        <div className="flex-shrink-0">
                            <button
                                onClick={() => setView('create-notice')}
                                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 touch-active flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Criar Aviso
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* LAYOUT EM GRID PRINCIPAL (Filhos diretos do grid para alinhamento de altura automática pelo CSS Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* 1. SEÇÃO DE AÇÕES RÁPIDAS (Somente Mobile/Tablet) */}
                <section className="lg:hidden bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 lg:col-span-3">
                    <div className="flex items-center gap-2 mb-6 px-1">
                        <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Ações Rápidas</h2>
                    </div>
                    <QuickActions setView={setView} onNewSuggestion={() => setView('dashboard')} />
                </section>

                {/* 2. BLOCO ESQUERDA SUPERIOR (Estatísticas para Admins / Resumo da Unidade para Moradores) */}
                {isAdminProfile ? (
                    <section className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 lg:col-span-2 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-purple-600 rounded-full" />
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Indicadores de Gestão</h2>
                                </div>
                                <button
                                    onClick={() => setView('reports')}
                                    className="text-xs font-black text-purple-600 hover:text-purple-700 uppercase tracking-wider transition-colors hover:underline"
                                >
                                    Relatórios Completos →
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* CARD OCORRÊNCIAS */}
                                <div className="group bg-slate-50 hover:bg-red-50/30 p-5 rounded-3xl border border-slate-100 hover:border-red-100 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-bold">
                                            <AlertTriangleIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-black text-slate-800 group-hover:text-red-700 transition-colors">
                                            {occurrences.filter(o => o.status === 'Aberto').length}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Livro de Ocorrências</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Chamados abertos aguardando retorno.</p>
                                </div>

                                {/* CARD SUGESTÕES */}
                                <div className="group bg-slate-50 hover:bg-indigo-50/30 p-5 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                                            <LightbulbIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
                                            {requests.filter(r => r.type === RequestType.SUGESTOES && [Status.PENDENTE, Status.EM_ANALISE].includes(r.status)).length}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Sugestões Recebidas</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Novas ideias e manutenções sob análise.</p>
                                </div>

                                {/* CARD RESERVAS */}
                                <div className="group bg-slate-50 hover:bg-emerald-50/30 p-5 rounded-3xl border border-slate-100 hover:border-emerald-100 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                                            <CalendarIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
                                            {activeReservationsCount}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Reservas Ativas</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Áreas comuns agendadas para hoje/futuro.</p>
                                </div>

                                {/* CARD MORADORES */}
                                <div className="group bg-slate-50 hover:bg-amber-50/30 p-5 rounded-3xl border border-slate-100 hover:border-amber-100 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                                            <UsersIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-black text-slate-800 group-hover:text-amber-700 transition-colors">
                                            {users.length}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Moradores Ativos</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Contas ativas vinculadas no sistema.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    /* RESUMO DA UNIDADE DO MORADOR (CARDS PREMIUM COM AÇÕES CLICÁVEIS) */
                    <section className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 lg:col-span-2 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-6 px-1">
                                <span className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Sua Unidade hoje</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* CARD BOLETO RECENTE */}
                                <div
                                    onClick={() => setView('boletos')}
                                    className="group bg-slate-50 hover:bg-indigo-50/30 p-5 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all duration-300 cursor-pointer active:scale-98"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                                            <BoletoIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-indigo-600 group-hover:underline uppercase tracking-wider">Ver Boletos</span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Boleto Mensal</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {latestBoleto
                                            ? `Referência: ${latestBoleto.referenceMonth} • Disponível para visualização.`
                                            : "Nenhum boleto cadastrado para sua unidade."}
                                    </p>
                                </div>

                                {/* CARD PRÓXIMA RESERVA */}
                                <div
                                    onClick={() => setView('reservations')}
                                    className="group bg-slate-50 hover:bg-emerald-50/30 p-5 rounded-3xl border border-slate-100 hover:border-emerald-100 transition-all duration-300 cursor-pointer active:scale-98"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                                            <CalendarIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-emerald-600 group-hover:underline uppercase tracking-wider">Reservar</span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Sua próxima reserva</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {nextReservation
                                            ? `Agendado: ${formatAreaName(nextReservation.area)} em ${new Date(nextReservation.date + 'T12:00:00').toLocaleDateString('pt-BR')}`
                                            : "Nenhum agendamento futuro. Que tal planejar um evento?"}
                                    </p>
                                </div>

                                {/* CARD VOTAÇÃO ATIVA */}
                                <div
                                    onClick={() => setView('voting')}
                                    className="group bg-slate-50 hover:bg-purple-50/30 p-5 rounded-3xl border border-slate-100 hover:border-purple-100 transition-all duration-300 cursor-pointer active:scale-98"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-purple-600 group-hover:underline uppercase tracking-wider">Votar</span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Assembleias e Enquetes</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {activeVoting
                                            ? `Votação aberta: "${activeVoting.title}". Participe!`
                                            : "Nenhuma assembleia ou enquete ativa no momento."}
                                    </p>
                                </div>

                                {/* CARD MINHAS OCORRÊNCIAS */}
                                <div
                                    onClick={() => setView('occurrences')}
                                    className="group bg-slate-50 hover:bg-amber-50/30 p-5 rounded-3xl border border-slate-100 hover:border-amber-100 transition-all duration-300 cursor-pointer active:scale-98"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                                            <AlertTriangleIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-amber-600 group-hover:underline uppercase tracking-wider">Ver Ocorrências</span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-700 mt-4">Livro de Ocorrências</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {openOccurrences > 0
                                            ? `Você possui ${openOccurrences} registro(s) em aberto sob acompanhamento.`
                                            : "Tudo tranquilo. Nenhum registro de ocorrência em andamento."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 3. COLUNA DIREITA - SUPERIOR (Demandas Urgentes para Admin, Mural de Avisos para Morador na 1ª linha) */}
                {isAdminProfile ? (
                    /* COLUNA DE TAREFAS PENDENTES PARA GESTORES */
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between lg:col-span-1 h-full">
                        <div>
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="h-5 w-5 text-indigo-600" />
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Ações Pendentes</h2>
                                </div>
                                <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-black">
                                    {pendingTasks.length}
                                </span>
                            </div>

                            {pendingTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-bold">Excelente trabalho!</p>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Nenhum chamado pendente no momento.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar flex-1">
                                    {pendingTasks.slice(0, 5).map(task => {
                                        const isSuggestion = (task as any).taskType === 'suggestion';
                                        const isOld = (new Date().getTime() - new Date(task.createdAt).getTime()) > 2 * 24 * 60 * 60 * 1000;
                                        const isResponded = !!(task as any).adminResponse;
                                        const title = isSuggestion ? (task as any).title : (task as any).subject;
                                        const authorUser = users.find(u => u.id === task.authorId);
                                        const houseNumber = authorUser ? authorUser.houseNumber : (task as any).houseNumber;

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => isSuggestion ? setSelectedRequest(task as any) : setView('occurrences')}
                                                className="group relative overflow-hidden bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition-all cursor-pointer hover:shadow-sm"
                                            >
                                                {/* Indicador lateral do tipo de chamado */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSuggestion ? 'bg-indigo-500' : 'bg-red-500'}`} />

                                                <div className="flex items-center justify-between mb-2 pl-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                        Un. {houseNumber || 'Admin'}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        {isOld && !isResponded && (
                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse">
                                                                Urgente
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${isSuggestion ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                                                            {isSuggestion ? 'Sugestão' : 'Ocorrência'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h3 className="text-sm font-black text-slate-800 line-clamp-1 pl-1.5 group-hover:text-indigo-600 transition-colors">
                                                    {title}
                                                </h3>
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 mb-2 pl-1.5 font-medium">
                                                    {task.description}
                                                </p>

                                                <div className="pl-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-slate-200/50">
                                                    <span>{new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-indigo-600 font-black flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                                        Responder →
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {pendingTasks.length > 5 && (
                                        <button
                                            onClick={() => setView('dashboard')}
                                            className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest transition-all"
                                        >
                                            Ver mais {pendingTasks.length - 5} chamados
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Para moradores, o Mural de Avisos fica aqui na 1ª linha */
                    renderNoticeBoard("lg:col-span-1 h-full")
                )}

                {/* 4. COLUNA ESQUERDA - INFERIOR (Apenas para Gestores - Grid de Reservas/Manutenções) */}
                {isAdminProfile && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2">
                        {/* PAINEL PRÓXIMAS RESERVAS */}
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5 text-emerald-600" />
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Próximas Reservas</h2>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-black">
                                        {upcomingReservations.length}
                                    </span>
                                </div>

                                {upcomingReservations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                            <CalendarIcon className="h-6 w-6 text-slate-300" />
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold">Nenhum agendamento futuro</p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">O condomínio não possui reservas ativas para os próximos dias.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingReservations.map(res => (
                                            <div 
                                                key={res.id}
                                                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl transition-all"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/75 uppercase tracking-wider">
                                                            {formatAreaName(res.area)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            Un. {res.houseNumber}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-black text-slate-700 truncate">
                                                        {res.userName}
                                                    </h4>
                                                </div>
                                                <div className="text-right ml-3 shrink-0">
                                                    <span className="text-xs font-black text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                                                        {new Date(res.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setView('reservations')}
                                className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-2xl text-xs font-black text-indigo-650 uppercase tracking-widest transition-all mt-4 hover:shadow-sm"
                            >
                                Gerenciar Reservas →
                            </button>
                        </div>

                        {/* PAINEL CHAMADOS RECENTES */}
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <WrenchScrewdriverIcon className="h-5 w-5 text-indigo-600" />
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Manutenções Recentes</h2>
                                    </div>
                                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-black">
                                        {recentMaintenanceRequests.length}
                                    </span>
                                </div>

                                {recentMaintenanceRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                            <WrenchScrewdriverIcon className="h-6 w-6 text-slate-300" />
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold">Nenhum chamado de manutenção</p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Nenhum chamado registrado recentemente.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentMaintenanceRequests.map(req => {
                                            const authorUser = users.find(u => u.id === req.authorId);
                                            const house = authorUser ? authorUser.houseNumber : 'Portaria';
                                            const statusStyle = getStatusStyle(req.status);

                                            return (
                                                <div 
                                                    key={req.id}
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl transition-all cursor-pointer group"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                                                {statusStyle.icon} <span className="ml-1 uppercase tracking-wider">{req.status}</span>
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                Un. {house}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-xs font-black text-slate-700 truncate group-hover:text-indigo-650 transition-colors">
                                                            {req.title}
                                                        </h4>
                                                    </div>
                                                    <div className="text-right ml-3 shrink-0">
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setView('dashboard')}
                                className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-2xl text-xs font-black text-indigo-650 uppercase tracking-widest transition-all mt-4 hover:shadow-sm"
                            >
                                Painel de Chamados →
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. COLUNA DIREITA - INFERIOR (Apenas para Gestores - Mural de Avisos na 2ª linha) */}
                {isAdminProfile && (
                    renderNoticeBoard("lg:col-span-1")
                )}
            </div>

            {/* Modal de Detalhes da Sugestão */}
            {selectedRequest && (
                <RequestModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}

            {/* Modal de Detalhes do Aviso */}
            {selectedNotice && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 animate-scale-up">
                        {/* Botão fechar no topo direito */}
                        <button 
                            onClick={() => setSelectedNotice(null)}
                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                    Comunicado Oficial
                                </span>
                                <h3 className="text-xl font-black text-slate-800 leading-snug mt-3 pr-8">
                                    {selectedNotice.title}
                                </h3>
                                <div className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-3">
                                    <span>Por: <strong className="text-slate-600">{selectedNotice.authorName}</strong></span>
                                    <span>•</span>
                                    <span>{new Date(selectedNotice.createdAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                    {selectedNotice.content}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedNotice(null)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 mt-4"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
