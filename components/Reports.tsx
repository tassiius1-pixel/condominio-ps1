import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { Status } from '../types';
import { generateReportSummary } from '../services/gemini';
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
                            label: 'Pendências',
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


const Reports: React.FC = () => {
    const { requests, users } = useData();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (!req.createdAt) return false;
            const reqDate = new Date(req.createdAt);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            if (start && reqDate < start) return false;
            if (end && reqDate > end) return false;
            return true;
        });
    }, [requests, startDate, endDate]);

    const stats = useMemo(() => ({
        total: filteredRequests.length,
        pending: filteredRequests.filter(r => r.status === Status.PENDENTE).length,
        inProgress: filteredRequests.filter(r => r.status === Status.EM_ANDAMENTO).length,
        completed: filteredRequests.filter(r => r.status === Status.CONCLUIDO).length,
    }), [filteredRequests]);

    const countBy = (key: 'sector' | 'type' | 'priority') => {
        return filteredRequests.reduce((acc, req) => {
            acc[req[key]] = (acc[req[key]] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    };

    const requestsBySector = useMemo(() => countBy('sector'), [filteredRequests]);
    const requestsByType = useMemo(() => countBy('type'), [filteredRequests]);
    
    const handleGenerateSummary = async () => {
        setIsSummaryLoading(true);
        setSummary('');
        const reportData = `
            - Estatísticas Gerais:
              - Total de pendências: ${stats.total}
              - Pendentes: ${stats.pending}
              - Em Andamento: ${stats.inProgress}
              - Concluídas: ${stats.completed}
            - Pendências por Setor: ${JSON.stringify(requestsBySector)}
            - Pendências por Tipo: ${JSON.stringify(requestsByType)}
        `;
        const result = await generateReportSummary(reportData);
        setSummary(result);
        setIsSummaryLoading(false);
    };

    const handleExportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Relatório de Manutenção", 14, 22);
        doc.setFontSize(11);
        const period = (startDate || endDate) 
            ? `Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '...'} a ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : '...'}` 
            : 'Período: Todos';
        doc.text(period, 14, 30);
        const tableData = (data: Record<string, number>) => Object.entries(data).sort((a,b) => b[1] - a[1]);
        doc.autoTable({ startY: 40, head: [['Setor', 'Quantidade']], body: tableData(requestsBySector) });
        doc.autoTable({ head: [['Tipo de Pendência', 'Quantidade']], body: tableData(requestsByType) });
        doc.save('relatorio_manutencao.pdf');
    };

    const handleExportExcel = () => {
        const headers = ["ID", "Título", "Descrição", "Autor", "Casa", "Data", "Setor", "Tipo", "Status", "Prioridade"];
        const rows = filteredRequests.map(req => {
            const author = users.find(u => u.id === req.authorId);
            return [req.id, `"${req.title.replace(/"/g, '""')}"`, `"${req.description.replace(/"/g, '""')}"`, req.authorName, author?.houseNumber || 'N/A', new Date(req.createdAt).toLocaleString('pt-BR'), req.sector, req.type, req.status, req.priority].join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_manutencao.csv");
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
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Relatórios de Manutenção</h2>
                <div className="flex flex-wrap items-center gap-4">
                     <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-sm font-medium">De:</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm p-2 bg-white"/>
                    </div>
                    <div className="flex items-center gap-2">
                         <label htmlFor="endDate" className="text-sm font-medium">Até:</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm p-2 bg-white"/>
                    </div>
                    <button onClick={handleExportPDF} className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm">Exportar PDF</button>
                    <button onClick={handleExportExcel} className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm">Exportar Excel</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Pendências" value={stats.total} color="border-gray-500" />
                <StatCard title="Pendentes" value={stats.pending} color="border-yellow-500" />
                <StatCard title="Em Andamento" value={stats.inProgress} color="border-blue-500" />
                <StatCard title="Concluídas" value={stats.completed} color="border-green-500" />
            </div>

             <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Resumo Executivo por IA</h3>
                    <button onClick={handleGenerateSummary} disabled={isSummaryLoading || filteredRequests.length === 0} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                        {isSummaryLoading && <LoaderCircleIcon className="w-5 h-5 mr-2"/>}
                        {isSummaryLoading ? 'Gerando...' : 'Gerar Resumo'}
                    </button>
                </div>
                {summary && !isSummaryLoading && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{summary}</div>}
                {!summary && !isSummaryLoading && <p className="text-gray-500">Clique em "Gerar Resumo" para obter uma análise por IA dos dados filtrados.</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart type="pie" data={requestsBySector} title="Pendências por Setor" />
                <Chart type="bar" data={requestsByType} title="Pendências por Tipo" />
            </div>
        </div>
    );
};

export default Reports;