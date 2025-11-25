import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Status, Role } from '../types';

import { LoaderCircleIcon } from './Icons';

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
                                font: { size: 16 },
                                color: textColor
                            }
                        },
                        scales: type === 'bar' ? {
                            y: { ticks: { color: textColor }, grid: { color: '#D1D5DB' } },
                            x: { ticks: { color: textColor }, grid: { color: '#D1D5DB' } }
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

    return <div className="bg-white p-4 rounded-lg shadow h-80"><canvas ref={chartRef}></canvas></div>;
};

type ReportTab = 'sugestoes' | 'reservas' | 'ocorrencias' | 'votacoes';

const Reports: React.FC = () => {
    const { requests, users, reservations, occurrences, votings } = useData();
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
                new Date(r.date).toLocaleDateString('pt-BR'),
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
        let rows: string[] = [];
        let filename = '';

        if (activeTab === 'sugestoes') {
            headers = ["ID", "Título", "Descrição", "Autor", "Casa", "Data", "Setor", "Tipo", "Status", "Prioridade"];
            rows = filteredRequests.map(req => {
                const author = users.find(u => u.id === req.authorId);
                return [req.id, `"${req.title.replace(/"/g, '""')}"`, `"${req.description.replace(/"/g, '""')}"`, req.authorName, author?.houseNumber || 'N/A', new Date(req.createdAt).toLocaleString('pt-BR'), req.sector, req.type, req.status, req.priority].join(',');
            });
            filename = 'relatorio_sugestoes.csv';
        } else if (activeTab === 'reservas') {
            headers = ["ID", "Data", "Área", "Reservado Por", "Casa"];
            rows = filteredReservations.map(r => [
                r.id,
                new Date(r.date).toLocaleDateString('pt-BR'),
                r.area,
                r.userName,
                r.houseNumber
            ].join(','));
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
            ].join(','));
            filename = 'relatorio_ocorrencias.csv';
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const StatCard: React.FC<{ title: string; value: string | number, color: string }> = ({ title, value, color }) => (
        <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${color}`}>
            <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Relatórios e Análises</h2>

                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label htmlFor="startDate" className="text-sm font-medium text-gray-700">De:</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm p-2 bg-white w-full sm:w-auto" />
                        </div>
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Até:</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm p-2 bg-white w-full sm:w-auto" />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleExportPDF} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors">PDF</button>
                        <button onClick={handleExportExcel} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors">Excel</button>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('sugestoes')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sugestoes'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Sugestões
                    </button>
                    <button
                        onClick={() => setActiveTab('reservas')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reservas'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Reservas
                    </button>
                    {[Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR) && (
                        <button
                            onClick={() => setActiveTab('ocorrencias')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'ocorrencias'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Ocorrências
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('votacoes')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'votacoes'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Votações
                    </button>
                </nav>
            </div>

            {/* CONTENT */}
            {activeTab === 'sugestoes' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total de Sugestões" value={requestStats.total} color="border-gray-500" />
                        <StatCard title="Pendentes" value={requestStats.pending} color="border-yellow-500" />
                        <StatCard title="Em Andamento" value={requestStats.inProgress} color="border-blue-500" />
                        <StatCard title="Concluídas" value={requestStats.completed} color="border-green-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Chart type="pie" data={requestsBySector} title="Sugestões por Setor" />
                        <Chart type="bar" data={requestsByType} title="Sugestões por Tipo" />
                    </div>
                </div>
            )
            }

            {
                activeTab === 'reservas' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <StatCard title="Total de Reservas" value={filteredReservations.length} color="border-indigo-500" />
                            <StatCard title="Churrasqueiras" value={(reservationsByArea['Churrasqueira 1'] || 0) + (reservationsByArea['Churrasqueira 2'] || 0)} color="border-orange-500" />
                            <StatCard title="Salão de Festas" value={reservationsByArea['Salão de Festas'] || 0} color="border-purple-500" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Chart type="bar" data={reservationsByArea} title="Reservas por Área" />
                            <div className="bg-white p-6 rounded-lg shadow overflow-y-auto h-80">
                                <h3 className="text-lg font-bold mb-4 text-gray-700">Últimas Reservas</h3>
                                <ul className="space-y-3">
                                    {filteredReservations.slice(0, 10).map(r => (
                                        <li key={r.id} className="text-sm border-b pb-2">
                                            <span className="font-bold text-gray-800">{new Date(r.date).toLocaleDateString('pt-BR')}</span> -
                                            <span className="text-gray-600"> {r.area === 'salao_festas' ? 'Salão' : r.area === 'churrasco1' ? 'Churras 1' : 'Churras 2'}</span>
                                            <span className="text-gray-500 block text-xs">por {r.userName} (Casa {r.houseNumber})</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'ocorrencias' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <StatCard title="Total de Ocorrências" value={filteredOccurrences.length} color="border-red-500" />
                            <StatCard title="Em Aberto" value={occurrencesByStatus['Aberto'] || 0} color="border-yellow-500" />
                            <StatCard title="Resolvidas" value={occurrencesByStatus['Resolvido'] || 0} color="border-green-500" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Chart type="pie" data={occurrencesByStatus} title="Status das Ocorrências" />
                            <div className="bg-white p-6 rounded-lg shadow overflow-y-auto h-80">
                                <h3 className="text-lg font-bold mb-4 text-gray-700">Últimas Ocorrências</h3>
                                <ul className="space-y-3">
                                    {filteredOccurrences.slice(0, 10).map(o => (
                                        <li key={o.id} className="text-sm border-b pb-2">
                                            <span className="font-bold text-gray-800">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</span> -
                                            <span className="text-gray-600"> {o.subject}</span>
                                            <span className="text-gray-500 block text-xs">por {o.authorName} (Casa {o.houseNumber})</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* VOTAÇ Õ ES TAB */}
            {activeTab === 'votacoes' && (
                <div className="space-y-6 animate-fade-in w-full overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard title="Total de Votações" value={votings.length} color="border-purple-500" />
                        <StatCard title="Ativas" value={votings.filter(v => {
                            const now = new Date();
                            const end = new Date(v.endDate);
                            end.setHours(23, 59, 59, 999);
                            return now <= end;
                        }).length} color="border-green-500" />
                        <StatCard title="Encerradas" value={votings.filter(v => {
                            const now = new Date();
                            const end = new Date(v.endDate);
                            end.setHours(23, 59, 59, 999);
                            return now > end;
                        }).length} color="border-gray-500" />
                    </div>

                    {/* List of votings with detailed results */}
                    <div className="space-y-6">
                        {votings.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhuma votação registrada.</p>
                        ) : (
                            votings.map(voting => {
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
                                    <div key={voting.id} className="bg-white rounded-lg shadow p-6 space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{voting.title}</h3>
                                                <p className="text-sm text-gray-500">{voting.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Período: {new Date(voting.startDate).toLocaleDateString('pt-BR')} até {new Date(voting.endDate).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const { jsPDF } = (window as any).jspdf;
                                                        const doc = new jsPDF();
                                                        doc.setFontSize(18);
                                                        doc.text('Relatório de Votação (Detalhado)', 14, 22);
                                                        doc.setFontSize(12);
                                                        doc.text(`Título: ${voting.title}`, 14, 32);
                                                        doc.text(`Total de Votos: ${voting.votes.length}`, 14, 38);

                                                        // Results Summary
                                                        const resultsData = results.map(res => [res.text, res.count.toString(), `${res.percentage}%`]);
                                                        doc.autoTable({
                                                            startY: 45,
                                                            head: [['Opção', 'Votos', '%']],
                                                            body: resultsData,
                                                            theme: 'grid',
                                                            headStyles: { fillColor: [66, 135, 245] }
                                                        });

                                                        // Individual Votes
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
                                                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded shadow-sm transition-colors"
                                                >
                                                    PDF
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const headers = ["Casa", "Morador", "Escolha", "Data/Hora"];
                                                        const rows = voting.votes.map(v => [
                                                            v.houseNumber,
                                                            `"${v.userName}"`,
                                                            `"${v.optionIds.map(oid => voting.options.find(o => o.id === oid)?.text).join(', ')}"`,
                                                            new Date(v.timestamp).toLocaleString('pt-BR')
                                                        ].join(','));

                                                        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
                                                        const encodedUri = encodeURI(csvContent);
                                                        const link = document.createElement("a");
                                                        link.setAttribute("href", encodedUri);
                                                        link.setAttribute("download", `relatorio_votacao_${voting.id}.csv`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-sm transition-colors"
                                                >
                                                    Excel
                                                </button>
                                            </div>
                                        </div>

                                        {/* Results */}
                                        <div className="border-t pt-4">
                                            <h4 className="font-semibold text-gray-700 mb-3">Resultados:</h4>
                                            <div className="space-y-3">
                                                {results.map(res => (
                                                    <div key={res.id} className="space-y-1">
                                                        <div className="flex justify-between text-sm text-gray-600">
                                                            <span className="font-medium">{res.text}</span>
                                                            <span>{res.count} votos ({res.percentage}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                                            <div
                                                                className="bg-purple-500 h-full rounded-full transition-all"
                                                                style={{ width: `${res.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Individual Votes Table (transparency) */}
                                        <div className="border-t pt-4">
                                            <h4 className="font-semibold text-gray-700 mb-3">Votos Individuais (Transparência):</h4>
                                            {totalVotes === 0 ? (
                                                <p className="text-sm text-gray-400 italic">Nenhum voto registrado ainda.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-50 border-b">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-600">Casa</th>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-600">Morador</th>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-600">Opção(ões) escolhida(s)</th>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-600">Data/Hora</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {voting.votes.map((vote, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="px-3 py-2 text-gray-700">{vote.houseNumber}</td>
                                                                    <td className="px-3 py-2 text-gray-700">{vote.userName}</td>
                                                                    <td className="px-3 py-2 text-gray-700">
                                                                        {vote.optionIds.map(optId => {
                                                                            const option = voting.options.find(o => o.id === optId);
                                                                            return option?.text;
                                                                        }).join(', ')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-gray-500 text-xs">
                                                                        {new Date(vote.timestamp).toLocaleString('pt-BR')}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
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