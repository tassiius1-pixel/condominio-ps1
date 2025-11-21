import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, View } from '../types';
import {
    PlusIcon,
    TrashIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    XIcon,
    BarChartIcon,
    CalendarIcon,
    AlertTriangleIcon,
    InfoIcon
} from './Icons';
import ConfirmModal from './ConfirmModal';

interface NoticesProps {
    setView: (view: View) => void;
}

const Notices: React.FC<NoticesProps> = ({ setView }) => {
    const {
        notices,
        addNotice,
        deleteNotice,
        toggleNoticeReaction,
        votings,
        reservations,
        occurrences
    } = useData();
    const { currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);

    const canManageNotices = currentUser && [Role.ADMIN, Role.GESTAO].includes(currentUser.role);

    // Dashboard Data
    const activeVoting = votings.find(v => new Date(v.endDate) >= new Date());

    // Sort reservations by date to find the next one
    const userReservations = reservations
        .filter(r => r.userId === currentUser?.id && new Date(r.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextReservation = userReservations[0];

    const openOccurrences = occurrences.filter(o => o.authorId === currentUser?.id && o.status === 'Aberto').length;
    const lastNotice = notices[0];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const handleCreateNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim() || !currentUser) return;

        setIsSubmitting(true);
        try {
            await addNotice({
                title: newTitle,
                content: newContent,
                authorId: currentUser.id,
                authorName: currentUser.name,
            });
            setNewTitle('');
            setNewContent('');
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error creating notice:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (noticeToDelete) {
            await deleteNotice(noticeToDelete);
            setNoticeToDelete(null);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {getGreeting()}, {currentUser?.name.split(' ')[0]}!
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Aqui está o resumo do seu condomínio hoje.
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Votações */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <BarChartIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Votações</h3>
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                            {activeVoting ? activeVoting.title : "Nenhuma votação ativa"}
                        </p>
                    </div>
                    <button
                        onClick={() => setView('voting')}
                        className="text-sm text-purple-600 font-medium mt-4 hover:underline text-left"
                    >
                        Ver detalhes &gt;
                    </button>
                </div>

                {/* Próxima Reserva */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Próxima Reserva</h3>
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                            {nextReservation
                                ? new Date(nextReservation.date).toLocaleDateString('pt-BR')
                                : "Nenhuma agendada"}
                        </p>
                    </div>
                    <button
                        onClick={() => setView('reservations')}
                        className="text-sm text-blue-600 font-medium mt-4 hover:underline text-left"
                    >
                        Gerenciar reservas &gt;
                    </button>
                </div>

                {/* Minhas Ocorrências */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                            <AlertTriangleIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Minhas Ocorrências</h3>
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                            {openOccurrences > 0
                                ? `${openOccurrences} em aberto`
                                : "Tudo certo!"}
                        </p>
                    </div>
                    <button
                        onClick={() => setView('occurrences')}
                        className="text-sm text-orange-600 font-medium mt-4 hover:underline text-left"
                    >
                        Ver livro &gt;
                    </button>
                </div>

                {/* Último Aviso */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                            <InfoIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Último Aviso</h3>
                        <p className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                            {lastNotice ? lastNotice.title : "Nenhum aviso recente"}
                        </p>
                    </div>
                    <a
                        href="#avisos-section"
                        className="text-sm text-green-600 font-medium mt-4 hover:underline text-left block"
                    >
                        Ver mural &gt;
                    </a>
                </div>
            </div>

            {/* Notices Section */}
            <div id="avisos-section" className="pt-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Avisos Importantes</h2>
                    {canManageNotices && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Novo Aviso
                        </button>
                    )}
                </div>

                <div className="grid gap-6">
                    {notices.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-lg">Nenhum aviso publicado no momento.</p>
                        </div>
                    ) : (
                        notices.map((notice) => {
                            const isLiked = notice.likes.includes(currentUser?.id || '');
                            const isDisliked = notice.dislikes.includes(currentUser?.id || '');

                            return (
                                <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{notice.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Publicado por <span className="font-medium text-gray-700">{notice.authorName}</span> em {new Date(notice.createdAt).toLocaleDateString('pt-BR')} às {new Date(notice.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {canManageNotices && (
                                                <button
                                                    onClick={() => setNoticeToDelete(notice.id)}
                                                    className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
                                                    title="Excluir aviso"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="prose prose-indigo max-w-none mb-6 text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {notice.content}
                                        </div>

                                        <div className="flex items-center gap-4 border-t pt-4 mt-4">
                                            <button
                                                onClick={() => currentUser && toggleNoticeReaction(notice.id, currentUser.id, 'like')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isLiked
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <ThumbsUpIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                                <span>{notice.likes.length}</span>
                                            </button>

                                            <button
                                                onClick={() => currentUser && toggleNoticeReaction(notice.id, currentUser.id, 'dislike')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isDisliked
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <ThumbsDownIcon className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
                                                <span>{notice.dislikes.length}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal de Novo Aviso */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Novo Aviso</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateNotice} className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                        Título
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                        placeholder="Ex: Manutenção na Piscina"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                        Conteúdo
                                    </label>
                                    <textarea
                                        id="content"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        rows={6}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none"
                                        placeholder="Descreva o aviso detalhadamente..."
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                                    >
                                        {isSubmitting ? 'Publicando...' : 'Publicar Aviso'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={!!noticeToDelete}
                    onClose={() => setNoticeToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Excluir Aviso"
                    message="Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita."
                    confirmText="Sim, Excluir"
                    cancelText="Cancelar"
                />
            </div>
        </div>
    );
};

export default Notices;
