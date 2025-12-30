import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Status, Role } from '../types';

import {
    LoaderCircleIcon,
    BarChartIcon,
    CalendarIcon,
    UsersIcon,
    CheckCircleIcon,
    ClockIcon,
    AlertTriangleIcon,
    LightbulbIcon,
    DownloadIcon,
    FileIcon,
    TrashIcon
} from './Icons';

// Chart component using a canvas
const Chart: React.FC<{ type: 'pie' | 'bar'; data: Record<string, number>; title: string }> = ({ type, data, title }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current && (window as any).Chart) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                const colors = [
                    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6',
                    '#D946EF', '#EC4899', '#6366F1', '#14B8A6', '#FBBF24', '#F87171'
                ];

                const textColor = '#374151';

                chartInstance.current = new (window as any).Chart(ctx, {
                    type: type,
                    data: {
                        labels: Object.keys(data),
                        datasets: [{
                            label: 'Quantidade',
                            data: Object.values(data),
                            backgroundColor: colors,
                            borderColor: '#FFFFFF',
                            borderWidth: type === 'pie' ? 2 : 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: type === 'pie' ? 'right' : 'none',
                                labels: { color: textColor }
                            },
                            title: {
                                display: true,
                                text: title,
                                font: { size: 16, weight: 'bold' },
                                color: textColor
                            }
                        },
                        scales: type === 'bar' ? {
                            y: { ticks: { color: textColor }, grid: { color: '#F3F4F6' } },
                            x: { ticks: { color: textColor }, grid: { display: false } }
                        } : {}
                    }
                });
            }
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, title, type]);

    if (Object.keys(data).length === 0) {
        return (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 h-80 flex flex-col items-center justify-center text-gray-400">
                <p className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">{title}</p>
                <p className="text-xs mt-2 font-medium">Sem dados para o período</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 h-80 transition-all hover:shadow-md">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

type ReportTab = 'sugestoes' | 'reservas' | 'ocorrencias' | 'votacoes';

const Reports: React.FC = () => {
    const { requests, users, reservations, occurrences, votings, clearLegacyData } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportTab>('sugestoes');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');


    // --- FILTERS ---
    const filterByDate = (dateStr: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
    };

    const filteredRequests = useMemo(() => requests.filter(r => filterByDate(r.createdAt)), [requests, startDate, endDate]);
    const filteredReservations = useMemo(() => reservations.filter(r => filterByDate(r.date)), [reservations, startDate, endDate]);
    const filteredOccurrences = useMemo(() => occurrences.filter(o => filterByDate(o.createdAt)), [occurrences, startDate, endDate]);

    // --- STATS & DATA ---
    const requestStats = useMemo(() => ({
        total: filteredRequests.length,
        pending: filteredRequests.filter(r => r.status === Status.PENDENTE).length,
        inProgress: filteredRequests.filter(r => r.status === Status.EM_ANDAMENTO).length,
        completed: filteredRequests.filter(r => r.status === Status.CONCLUIDO).length,
    }), [filteredRequests]);

    const requestsBySector = useMemo(() => {
        return filteredRequests.reduce((acc, req) => {
            acc[req.sector] = (acc[req.sector] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredRequests]);

    const requestsByType = useMemo(() => {
        return filteredRequests.reduce((acc, req) => {
            acc[req.type] = (acc[req.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredRequests]);

    const reservationsByArea = useMemo(() => {
        return filteredReservations.reduce((acc, res) => {
            const areaName = res.area === 'salao_festas' ? 'Salão de Festas' : res.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2';
            acc[areaName] = (acc[areaName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredReservations]);

    const occurrencesByStatus = useMemo(() => {
        return filteredOccurrences.reduce((acc, occ) => {
            const status = occ.status === 'Resolvido' ? 'Resolvido' : 'Aberto';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [filteredOccurrences]);



    // --- EXPORT ---
    const handleExportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        const period = (startDate || endDate)
            ? `Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '...'} a ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : '...'}`
            : 'Período: Todos';

        doc.setFontSize(18);
        doc.text(`Relatório de ${activeTab === 'sugestoes' ? 'Sugestões' : activeTab === 'reservas' ? 'Reservas' : 'Ocorrências'}`, 14, 22);
        doc.setFontSize(11);
        doc.text(period, 14, 30);

        const tableData = (data: Record<string, number>) => Object.entries(data).sort((a, b) => b[1] - a[1]);

        if (activeTab === 'sugestoes') {
            doc.autoTable({ startY: 40, head: [['Setor', 'Quantidade']], body: tableData(requestsBySector) });
            doc.autoTable({ head: [['Tipo', 'Quantidade']], body: tableData(requestsByType) });
        } else if (activeTab === 'reservas') {
            doc.autoTable({ startY: 40, head: [['Área', 'Quantidade']], body: tableData(reservationsByArea) });

            const rows = filteredReservations.map(r => [
                new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                r.area === 'salao_festas' ? 'Salão de Festas' : r.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2',
                r.userName,
                r.houseNumber
            ]);
            doc.autoTable({ head: [['Data', 'Área', 'Reservado Por', 'Casa']], body: rows });
        } else {
            doc.autoTable({ startY: 40, head: [['Status', 'Quantidade']], body: tableData(occurrencesByStatus) });

            const rows = filteredOccurrences.map(o => [
                new Date(o.createdAt).toLocaleDateString('pt-BR'),
                o.subject,
                o.authorName,
                o.houseNumber,
                o.status === 'Resolvido' ? 'Resolvido' : 'Aberto'
            ]);
            doc.autoTable({ head: [['Data', 'Assunto', 'Autor', 'Casa', 'Status']], body: rows });
        }

        doc.save(`relatorio_${activeTab}.pdf`);
    };

    const handleExportExcel = () => {
        let headers: string[] = [];
        let rows: string[][] = [];
        let filename = '';

        if (activeTab === 'sugestoes') {
            headers = ["ID", "Título", "Descrição", "Autor", "Casa", "Data", "Setor", "Tipo", "Status", "Prioridade"];
            rows = filteredRequests.map(req => {
                const author = users.find(u => u.id === req.authorId);
                return [req.id, `"${req.title.replace(/"/g, '""')}"`, `"${req.description.replace(/"/g, '""')}"`, req.authorName, author?.houseNumber || 'N/A', new Date(req.createdAt).toLocaleString('pt-BR'), req.sector, req.type, req.status, req.priority];
            });
            filename = 'relatorio_sugestoes.csv';
        } else if (activeTab === 'reservas') {
            headers = ["ID", "Data", "Área", "Reservado Por", "Casa"];
            rows = filteredReservations.map(r => [
                r.id,
                new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                r.area,
                r.userName,
                r.houseNumber
            ]);
            filename = 'relatorio_reservas.csv';
        } else {
            headers = ["ID", "Data", "Assunto", "Descrição", "Autor", "Casa", "Status"];
            rows = filteredOccurrences.map(o => [
                o.id,
                new Date(o.createdAt).toLocaleDateString('pt-BR'),
                `"${o.subject.replace(/"/g, '""')}"`,
                `"${o.description.replace(/"/g, '""')}"`,
                o.authorName,
                o.houseNumber,
                o.status
            ]);
            filename = 'relatorio_ocorrencias.csv';
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const StatCard: React.FC<{ title: string; value: string | number, color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${color.replace('border-', 'bg-')}`}></div>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${color.replace('border-', 'bg-')}/10 ${color.replace('border-', 'text-')}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1.5">{title}</h3>
                    <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20 sm:pb-8">
            {/* HEADER PRÉMIUM */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
                            <BarChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none font-outfit">Relatórios</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Dashboard em tempo real
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <div className="flex items-center px-3 gap-2">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-xs font-bold text-gray-600 p-1 focus:ring-0 cursor-pointer"
                                />
                            </div>
                            <span className="text-gray-300">|</span>
                            <div className="flex items-center px-3 gap-2">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-xs font-bold text-gray-600 p-1 focus:ring-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleExportPDF} title="Exportar PDF" className="p-3 bg-white border border-gray-100 text-red-600 rounded-2xl hover:bg-red-50 transition-colors shadow-sm active:scale-95">
                                <FileIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleExportExcel} title="Exportar Excel" className="p-3 bg-white border border-gray-100 text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-colors shadow-sm active:scale-95">
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                            {currentUser?.role === Role.ADMIN && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja limpar TODOS os dados de Sugestões e Reservas? Esta ação não pode ser desfeita.')) {
                                            clearLegacyData();
                                        }
                                    }}
                                    className="p-3 bg-white border border-gray-100 text-gray-400 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                                    title="Limpar Dados Legados"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS (PILL STYLE) */}
            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-white shadow-sm overflow-x-auto no-scrollbar">
                {[
                    { id: 'sugestoes', label: 'Sugestões', icon: <LightbulbIcon className="w-4 h-4" /> },
                    { id: 'reservas', label: 'Reservas', icon: <CalendarIcon className="w-4 h-4" /> },
                    { id: 'ocorrencias', label: 'Ocorrências', icon: <AlertTriangleIcon className="w-4 h-4" />, roles: [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO] },
                    { id: 'votacoes', label: 'Votações', icon: <CheckCircleIcon className="w-4 h-4" /> },
                ]
                    .filter(tab => !tab.roles || tab.roles.includes(currentUser?.role || Role.MORADOR))
                    .map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ReportTab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95
                            ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/80'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
            </div>

            {/* CONTENT */}
            {activeTab === 'sugestoes' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Sugestões" value={requestStats.total} color="border-gray-500" icon={<BarChartIcon className="w-5 h-5" />} />
                        <StatCard title="Pendentes" value={requestStats.pending} color="border-yellow-500" icon={<ClockIcon className="w-5 h-5" />} />
                        <StatCard title="Em Andamento" value={requestStats.inProgress} color="border-blue-500" icon={<LoaderCircleIcon className="w-5 h-5 animate-spin-slow" />} />
                        <StatCard title="Concluídas" value={requestStats.completed} color="border-emerald-500" icon={<CheckCircleIcon className="w-5 h-5" />} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Chart type="pie" data={requestsBySector} title="Sugestões por Setor" />
                        <Chart type="bar" data={requestsByType} title="Sugestões por Tipo" />
                    </div>
                </div>
            )}

            {activeTab === 'reservas' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard title="Total Reservas" value={filteredReservations.length} color="border-indigo-500" icon={<CalendarIcon className="w-5 h-5" />} />
                        <StatCard title="Churrasqueiras" value={(reservationsByArea['Churrasqueira 1'] || 0) + (reservationsByArea['Churrasqueira 2'] || 0)} color="border-orange-500" icon={<BarChartIcon className="w-5 h-5" />} />
                        <StatCard title="Salão de Festas" value={reservationsByArea['Salão de Festas'] || 0} color="border-purple-500" icon={<UsersIcon className="w-5 h-5" />} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Chart type="bar" data={reservationsByArea} title="Reservas por Área" />
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-y-auto h-80 no-scrollbar">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 px-1">Últimas Reservas</h3>
                            <ul className="space-y-4">
                                {filteredReservations.length === 0 ? (
                                    <li className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Nenhuma reserva encontrada</li>
                                ) : (
                                    filteredReservations.slice(0, 10).map(r => (
                                        <li key={r.id} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all border-dashed">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white rounded-2xl shadow-sm text-indigo-600">
                                                    <CalendarIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase leading-tight">{r.area === 'salao_festas' ? 'Salão' : r.area === 'churrasco1' ? 'Churras 1' : 'Churras 2'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mt-1">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-gray-700 leading-tight">{r.userName}</p>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter leading-none mt-1">Casa {r.houseNumber}</p>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ocorrencias' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard title="Total Ocorrências" value={filteredOccurrences.length} color="border-rose-500" icon={<AlertTriangleIcon className="w-5 h-5" />} />
                        <StatCard title="Em Aberto" value={occurrencesByStatus['Aberto'] || 0} color="border-yellow-500" icon={<ClockIcon className="w-5 h-5" />} />
                        <StatCard title="Resolvidas" value={occurrencesByStatus['Resolvido'] || 0} color="border-emerald-500" icon={<CheckCircleIcon className="w-5 h-5" />} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Chart type="pie" data={occurrencesByStatus} title="Status das Ocorrências" />
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-y-auto h-80 no-scrollbar">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 px-1">Últimas Ocorrências</h3>
                            <ul className="space-y-4">
                                {filteredOccurrences.length === 0 ? (
                                    <li className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Nenhuma ocorrência encontrada</li>
                                ) : (
                                    filteredOccurrences.slice(0, 10).map(o => (
                                        <li key={o.id} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all border-dashed">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white rounded-2xl shadow-sm text-rose-500">
                                                    <AlertTriangleIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-gray-900 uppercase truncate max-w-[150px] sm:max-w-xs leading-tight">{o.subject}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mt-1">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${o.status === 'Resolvido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                                                    {o.status}
                                                </span>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1 leading-none">Casa {o.houseNumber}</p>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'votacoes' && (
                <div className="space-y-6 animate-fade-in w-full overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard title="Total Votações" value={votings.length} color="border-purple-500" icon={<BarChartIcon className="w-5 h-5" />} />
                        <StatCard title="Votos Totais" value={votings.reduce((sum, v) => sum + v.votes.length, 0)} color="border-emerald-500" icon={<CheckCircleIcon className="w-5 h-5" />} />
                        <StatCard title="Votações Ativas" value={votings.filter(v => {
                            const now = new Date();
                            const end = new Date(v.endDate);
                            end.setHours(23, 59, 59, 999);
                            return now <= end;
                        }).length} color="border-indigo-500" icon={<ClockIcon className="w-5 h-5" />} />
                    </div>

                    <div className="space-y-8">
                        {votings.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100">
                                <div className="p-6 bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner border border-white">🗳️</div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Nenhuma votação registrada no histórico</p>
                            </div>
                        ) : (
                            [...votings].map(voting => {
                                const totalVotes = voting.votes.length;
                                const results = voting.options.map(opt => {
                                    const count = voting.votes.filter(v => v.optionIds.includes(opt.id)).length;
                                    return {
                                        ...opt,
                                        count,
                                        percentage: totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
                                    };
                                });

                                return (
                                    <div key={voting.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 space-y-10 animate-slide-fade-in hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-b border-gray-50 pb-8">
                                            <div className="min-w-0">
                                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight truncate font-outfit leading-none mb-3">{voting.title}</h3>
                                                <p className="text-sm font-medium text-gray-500 line-clamp-2 max-w-2xl">{voting.description}</p>
                                                <div className="flex items-center gap-2 mt-6 bg-gray-50 px-4 py-2 rounded-2xl w-fit border border-gray-100 shadow-sm">
                                                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        {new Date(voting.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} <span className="text-gray-300 mx-1">—</span> {new Date(voting.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const { jsPDF } = (window as any).jspdf;
                                                        const doc = new jsPDF();
                                                        doc.setFontSize(18);
                                                        doc.text('Relatório de Votação (Detalhado)', 14, 22);
                                                        doc.setFontSize(12);
                                                        doc.text(`Título: ${voting.title}`, 14, 32);
                                                        doc.text(`Total de Votos: ${voting.votes.length}`, 14, 38);

                                                        const resultsData = results.map(res => [res.text, res.count.toString(), `${res.percentage}%`]);
                                                        doc.autoTable({
                                                            startY: 45,
                                                            head: [['Opção', 'Votos', '%']],
                                                            body: resultsData,
                                                            theme: 'grid',
                                                            headStyles: { fillColor: [79, 70, 229] }
                                                        });

                                                        const votesData = voting.votes.map(v => [
                                                            v.houseNumber.toString(),
                                                            v.userName,
                                                            v.optionIds.map(oid => voting.options.find(o => o.id === oid)?.text).join(', '),
                                                            new Date(v.timestamp).toLocaleString('pt-BR')
                                                        ]);

                                                        doc.text('Votos Individuais:', 14, doc.lastAutoTable.finalY + 10);
                                                        doc.autoTable({
                                                            startY: doc.lastAutoTable.finalY + 15,
                                                            head: [['Casa', 'Morador', 'Escolha', 'Data/Hora']],
                                                            body: votesData,
                                                            theme: 'striped',
                                                            styles: { fontSize: 8 }
                                                        });
                                                        doc.save(`relatorio_votacao_${voting.id}.pdf`);
                                                    }}
                                                    className="p-4 bg-red-50 text-red-600 rounded-3xl hover:bg-red-100 transition-all shadow-sm active:scale-95"
                                                    title="Relatório Detalhado PDF"
                                                >
                                                    <FileIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const headers = ["Casa", "Morador", "Escolha", "Data/Hora"];
                                                        const rows = voting.votes.map(v => [
                                                            v.houseNumber,
                                                            `"${v.userName}"`,
                                                            `"${v.optionIds.map(oid => voting.options.find(o => o.id === oid)?.text).join(', ')}"`,
                                                            new Date(v.timestamp).toLocaleString('pt-BR')
                                                        ]);

                                                        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                                        const encodedUri = encodeURI(csvContent);
                                                        const link = document.createElement("a");
                                                        link.setAttribute("href", encodedUri);
                                                        link.setAttribute("download", `relatorio_votacao_${voting.id}.csv`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                                                    title="Base de Dados Excel (CSV)"
                                                >
                                                    <DownloadIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Results Visuals */}
                                        <div className="space-y-8">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Resultados Consolidados</h4>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Total: {totalVotes} Moradores</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                <div className="col-span-1 lg:col-span-2 space-y-6">
                                                    {results.map(res => (
                                                        <div key={res.id} className="space-y-3 group/opt">
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">{res.text}</span>
                                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50 shadow-sm">{res.count} votos ({res.percentage}%)</span>
                                                            </div>
                                                            <div className="w-full bg-gray-50 rounded-2xl h-4 overflow-hidden border border-gray-100 p-0.5">
                                                                <div
                                                                    className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500 h-full rounded-xl transition-all duration-1000 shadow-sm"
                                                                    style={{ width: `${res.percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-indigo-600 rounded-[2rem] p-8 flex flex-col items-center justify-center text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <BarChartIcon className="w-8 h-8 opacity-20 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
                                                    <p className="text-5xl font-black tracking-tighter mb-1 relative z-10">{totalVotes}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 relative z-10">Participantes</p>
                                                    <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest relative z-10 border border-white/10 backdrop-blur-sm">Quórum da Votação</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Votes Table */}
                                        <div className="space-y-6 pt-10 border-t border-gray-50">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Auditoria de Transparência</h4>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                                    <CheckCircleIcon className="w-2.5 h-2.5 text-emerald-500" />
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Votos Verificados</span>
                                                </div>
                                            </div>
                                            {totalVotes === 0 ? (
                                                <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum voto registrado para auditoria</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm bg-white">
                                                    <div className="overflow-x-auto no-scrollbar">
                                                        <table className="min-w-full divide-y divide-gray-100">
                                                            <thead className="bg-gray-50/50">
                                                                <tr>
                                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Unidade</th>
                                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Morador</th>
                                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Escolha Realizada</th>
                                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Data / Hora</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {voting.votes.map((vote, idx) => (
                                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full border border-indigo-100">CASA {vote.houseNumber}</span>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{vote.userName}</p>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {vote.optionIds.map(optId => {
                                                                                    const option = voting.options.find(o => o.id === optId);
                                                                                    return (
                                                                                        <span key={optId} className="px-2.5 py-1 rounded-xl bg-white text-[9px] font-black uppercase text-gray-500 border border-gray-200 shadow-xs">
                                                                                            {option?.text}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tabular-nums">{new Date(vote.timestamp).toLocaleString('pt-BR')}</p>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}



        </div >
    );
};

export default Reports;