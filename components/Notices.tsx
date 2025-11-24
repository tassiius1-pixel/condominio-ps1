import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, View, Notice } from '../types';
import {
    PlusIcon,
    TrashIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    XIcon,
    BarChartIcon,
    CalendarIcon,
    AlertTriangleIcon,
    InfoIcon,
    UploadIcon,
    CheckCircleIcon
} from './Icons';
import ConfirmModal from './ConfirmModal';
import { fileToBase64 } from '../utils/fileUtils';

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

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canManageNotices = currentUser && [Role.ADMIN, Role.GESTAO].includes(currentUser.role);

    // Filter Notices
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeNotices = notices.filter(n => {
        if (!n.endDate) return true; // Keep if no end date (legacy)
        const end = new Date(n.endDate);
        const now = new Date();
        return end >= now;
    });

    const historyNotices = notices.filter(n => {
        if (!n.endDate) return false;
        const end = new Date(n.endDate);
        const now = new Date();
        return end < now;
    });

    // Dashboard Data
    const activeVoting = votings.find(v => {
        const end = new Date(v.endDate);
        end.setHours(23, 59, 59, 999);
        return end >= today;
    });

    const userReservations = reservations
        .filter(r => r.userId === currentUser?.id)
        .filter(r => {
            // Fix date timezone issue by appending time
            const resDate = new Date(r.date + 'T12:00:00');
            resDate.setHours(0, 0, 0, 0);
            return resDate >= today;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextReservation = userReservations[0];

    const openOccurrences = occurrences.filter(o => o.authorId === currentUser?.id && o.status === 'Aberto').length;
    const lastNotice = activeNotices[0];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setPhotos([...photos, base64]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleCreateNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim() || !startDate || !endDate || !currentUser) return;

        setIsSubmitting(true);
        try {
            await addNotice({
                title: newTitle,
                content: newContent,
                authorId: currentUser.id,
                authorName: currentUser.name,
                startDate,
                endDate,
                photos
            });
            setNewTitle('');
            setNewContent('');
            setStartDate('');
            setEndDate('');
            setPhotos([]);
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

    const renderNoticeCard = (notice: Notice) => {
        const isLiked = notice.likes.includes(currentUser?.id || '');
        const isDisliked = notice.dislikes.includes(currentUser?.id || '');

        return (
            <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{notice.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Publicado por <span className="font-medium text-gray-700">{notice.authorName}</span>
                                {' • '}
                                {new Date(notice.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} até {new Date(notice.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

                    {/* Photos */}
                    {notice.photos && notice.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                            {notice.photos.map((photo, idx) => (
                                <img
                                    key={idx}
                                    src={photo}
                                    alt={`Anexo ${idx + 1}`}
                                    className="h-32 w-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                                    onClick={() => setSelectedImage(photo)}
                                />
                            ))}
                        </div>
                    )}

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
    };

    const SummaryCards = () => {
        // Only show cards if there is relevant data
        const hasActiveVoting = !!activeVoting;
        const hasNextReservation = !!nextReservation;
        const hasOpenOccurrences = openOccurrences > 0;
        const hasActiveNotice = !!lastNotice;

        const hasAnyNews = hasActiveVoting || hasNextReservation || hasOpenOccurrences || hasActiveNotice;

        if (!hasAnyNews) {
            return (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sem novidades ativas</h3>
                    <p className="text-gray-500 max-w-md">
                        Tudo tranquilo por aqui! Você não tem pendências, reservas próximas ou votações em aberto.
                    </p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
                {/* Votações - Show only if active */}
                {hasActiveVoting && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <BarChartIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Ativo</span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Votação em Andamento</h3>
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {activeVoting.title}
                            </p>
                        </div>
                        <button
                            onClick={() => setView('voting')}
                            className="text-sm text-purple-600 font-medium mt-4 hover:underline text-left"
                        >
                            Votar agora &gt;
                        </button>
                    </div>
                )}

                {/* Próxima Reserva - Show only if exists */}
                {hasNextReservation && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <CalendarIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Futuro</span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Sua Próxima Reserva</h3>
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {new Date(nextReservation.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {nextReservation.area === 'salao_festas' ? 'Salão de Festas' : nextReservation.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2'}
                            </p>
                        </div>
                        <button
                            onClick={() => setView('reservations')}
                            className="text-sm text-blue-600 font-medium mt-4 hover:underline text-left"
                        >
                            Ver detalhes &gt;
                        </button>
                    </div>
                )}

                {/* Minhas Ocorrências - Show only if > 0 */}
                {hasOpenOccurrences && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <AlertTriangleIcon className="w-6 h-6 text-orange-600" />
                                </div>
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Atenção</span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Ocorrências Abertas</h3>
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {openOccurrences} pendente{openOccurrences > 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => setView('occurrences')}
                            className="text-sm text-orange-600 font-medium mt-4 hover:underline text-left"
                        >
                            Acompanhar &gt;
                        </button>
                    </div>
                )}

                {/* Último Aviso - Show only if exists */}
                {hasActiveNotice && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <InfoIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Novo</span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Último Aviso</h3>
                            <p className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                                {lastNotice.title}
                            </p>
                        </div>
                        <a
                            href="#avisos-section"
                            className="text-sm text-green-600 font-medium mt-4 hover:underline text-left block"
                        >
                            Ler aviso &gt;
                        </a>
                    </div>
                )}
            </div>
        );
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

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Início
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Histórico de Avisos
                </button>
            </div>

            {/* Content */}
            {activeTab === 'active' ? (
                <>
                    {/* Active Notices List - PRIORITY: Above Summary Cards */}
                    {activeNotices.length > 0 && (
                        <div id="avisos-section" className="space-y-6 pt-2 mb-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <InfoIcon className="w-6 h-6 text-indigo-600" />
                                    Avisos Importantes
                                </h2>
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
                                {activeNotices.map(renderNoticeCard)}
                            </div>
                        </div>
                    )}

                    {/* Summary Cards (Dynamic) */}
                    <div className={activeNotices.length > 0 ? "pt-8 border-t border-gray-200" : "pt-2"}>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Resumo Geral</h2>
                        <SummaryCards />
                    </div>

                    {/* If no notices, show Create button here too */}
                    {activeNotices.length === 0 && canManageNotices && (
                        <div className="flex justify-center pt-8 border-t border-gray-200">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Criar Primeiro Aviso
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Histórico de Avisos</h2>
                    <div className="grid gap-6">
                        {historyNotices.length === 0 ? (
                            <p className="text-gray-500 text-center py-10">Nenhum aviso no histórico.</p>
                        ) : (
                            historyNotices.map(renderNoticeCard)
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Novo Aviso */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
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

                            {/* Photos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Anexos (Fotos)</label>
                                <div className="flex flex-wrap gap-2">
                                    {photos.map((photo, idx) => (
                                        <div key={idx} className="relative w-20 h-20">
                                            <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(idx)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
                                        <UploadIcon className="w-6 h-6 text-gray-400" />
                                        <span className="text-xs text-gray-500 mt-1">Add</span>
                                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                    </label>
                                </div>
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

            {/* Image Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition"
                    >
                        <XIcon className="w-6 h-6 text-gray-800" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Ampliação"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
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
    );
};

export default Notices;
