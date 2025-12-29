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
import RequestModal from './RequestModal';
import QuickActions from './QuickActions';
import { fileToBase64, compressImage } from '../utils/fileUtils';

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
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false); // For "Quick Action" suggestion
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

    // FIX: Permissions restricted to ADMIN, SINDICO, SUBSINDICO as requested
    const canManageNotices = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

    // Filter Notices
    const today = new Date();
    // today.setHours(0, 0, 0, 0); // Keep time precision for "New" badge

    const activeNotices = notices.filter(n => {
        if (!n.endDate) return true; // Keep if no end date (legacy)
        const end = new Date(n.endDate);
        const now = new Date();
        return end >= now;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by newest

    const historyNotices = notices.filter(n => {
        if (!n.endDate) return false;
        const end = new Date(n.endDate);
        const now = new Date();
        return end < now;
    }).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    // Dashboard Data
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const handleOpenModal = () => {
        // Set default dates: Start = Now, End = Now + 7 days
        const now = new Date();
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

        // Adjust for timezone offset to show correct local time in input
        const toLocalISO = (date: Date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };

        setStartDate(toLocalISO(now));
        setEndDate(toLocalISO(nextWeek));

        setNewTitle('');
        setNewContent('');
        setPhotos([]);
        setIsModalOpen(true);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                // Use compressImage instead of raw fileToBase64
                // This prevents "Document size must be less than 1 MiB" errors in Firestore
                const base64 = await compressImage(e.target.files[0]);
                setPhotos([...photos, base64]);
            } catch (error) {
                console.error("Error compressing image:", error);
                alert("Erro ao processar a imagem. Tente uma imagem menor.");
            }
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
            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Error creating notice:", error);
            // Show user-friendly error
            let msg = "Erro ao publicar aviso.";
            if (error.message && error.message.includes("size")) {
                msg = "O aviso é muito grande (provavelmente as fotos). Tente remover algumas fotos.";
            } else if (error.code === 'permission-denied') {
                msg = "Você não tem permissão para publicar avisos.";
            }
            alert(msg);
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

        // Check if notice is "New" (created in the last 24h)
        const isNew = (new Date().getTime() - new Date(notice.createdAt).getTime()) < 24 * 60 * 60 * 1000;

        return (
            <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 group">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                            <div className="mt-1">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <InfoIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{notice.title}</h3>
                                    {isNew && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Novo
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium text-gray-700">{notice.authorName}</span>
                                    {' • '}
                                    {new Date(notice.startDate).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                        {canManageNotices && (
                            <button
                                onClick={() => setNoticeToDelete(notice.id)}
                                className="text-gray-300 hover:text-red-500 transition p-1.5 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                title="Excluir aviso"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="pl-[52px]">
                        <div className="prose prose-sm prose-indigo max-w-none mb-4 text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {notice.content}
                        </div>

                        {/* Photos */}
                        {notice.photos && notice.photos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                                {notice.photos.map((photo, idx) => (
                                    <img
                                        key={idx}
                                        src={photo}
                                        alt={`Anexo ${idx + 1}`}
                                        className="h-24 w-auto rounded-lg object-cover cursor-zoom-in hover:opacity-95 transition border border-gray-100"
                                        onClick={() => setSelectedImage(photo)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => currentUser && toggleNoticeReaction(notice.id, currentUser.id, 'like')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isLiked
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                            >
                                <ThumbsUpIcon className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                                <span>{notice.likes.length || 'Curtir'}</span>
                            </button>

                            <button
                                onClick={() => currentUser && toggleNoticeReaction(notice.id, currentUser.id, 'dislike')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isDisliked
                                    ? 'bg-red-50 text-red-600'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                            >
                                <ThumbsDownIcon className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SummarySidebar = () => {
        const hasActiveVoting = !!activeVoting;
        const hasNextReservation = !!nextReservation;
        const hasOpenOccurrences = openOccurrences > 0;

        if (!hasActiveVoting && !hasNextReservation && !hasOpenOccurrences) {
            return (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircleIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">
                        Você não tem pendências ou atividades próximas.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {/* Votações */}
                {hasActiveVoting && (
                    <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600">
                                    <BarChartIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Votação Ativa</span>
                            </div>
                            <h3 className="font-bold text-gray-900 leading-tight mb-3 line-clamp-2">{activeVoting.title}</h3>
                            <button
                                onClick={() => setView('voting')}
                                className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition w-full text-center shadow-sm"
                            >
                                Participar
                            </button>
                        </div>
                    </div>
                )}

                {/* Próxima Reserva */}
                {hasNextReservation && (
                    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Sua Reserva</span>
                            </div>
                            <p className="text-xl font-extrabold text-gray-900 leading-none mb-1">
                                {new Date(nextReservation.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-xs font-medium text-gray-600 mb-4 bg-white/60 inline-block px-2 py-0.5 rounded-md">
                                {nextReservation.area === 'salao_festas' ? 'Salão de Festas' : nextReservation.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2'}
                            </p>
                            <button
                                onClick={() => setView('reservations')}
                                className="text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg transition w-full text-center"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    </div>
                )}

                {/* Ocorrências */}
                {hasOpenOccurrences && (
                    <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl shadow-sm border border-orange-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                    <AlertTriangleIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Pendente</span>
                            </div>
                            <p className="text-sm text-gray-800 mb-4 font-medium">
                                Você tem <span className="text-lg font-bold text-orange-600 mx-1">{openOccurrences}</span> ocorrência(s) em aberto.
                            </p>
                            <button
                                onClick={() => setView('occurrences')}
                                className="text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 px-4 py-2 rounded-lg transition w-full text-center"
                            >
                                Acompanhar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {getGreeting()}, {currentUser?.name.split(' ')[0]}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Acompanhe os comunicados e atividades do condomínio.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - Notices and Empty Action State (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions - Always Top if Resident */}
                    {!canManageNotices && (
                        <QuickActions
                            setView={setView}
                            onNewSuggestion={() => setIsSuggestionModalOpen(true)}
                        />
                    )}

                    {/* Tabs - Moved Here */}
                    <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mural
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Histórico
                        </button>
                    </div>

                    {/* Notice Board Logic */}
                    {activeTab === 'active' ? (
                        (activeNotices.length > 0 || canManageNotices) && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <InfoIcon className="w-5 h-5 text-indigo-600" />
                                        Quadro de Avisos
                                    </h2>
                                    {canManageNotices && (
                                        <button
                                            onClick={handleOpenModal}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Novo Aviso
                                        </button>
                                    )}
                                </div>

                                {activeNotices.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeNotices.map(renderNoticeCard)}
                                    </div>
                                ) : (
                                    { canManageNotices && (
                                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                <InfoIcon className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 font-medium max-w-xs mx-auto">
                                                Não há novos comunicados no momento.
                                            </p>
                                            <button
                                                onClick={handleOpenModal}
                                                className="text-indigo-600 font-bold text-xs mt-3 uppercase tracking-widest hover:underline"
                                            >
                                                Criar primeiro aviso
                                            </button>
                                        </div>
                                    )}
                            </>
                        )}
                </>
                )
                : (
                /* History Tab */
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Histórico de Comunicados</h2>
                    {historyNotices.length === 0 ? (
                        <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nenhum aviso antigo encontrado.
                        </p>
                    ) : (
                        historyNotices.map(renderNoticeCard)
                    )}
                </div>
                    )}
            </div>

            {/* Sidebar - Summary (1/3) - Always Visible now to balance layout */}
            <div className="lg:col-span-1">
                <div className="sticky top-28">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Resumo Rápido</h2>
                    <SummarySidebar />
                </div>
            </div>
        </div>

            {/* Modal de Novo Aviso */ }
    {
        isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900">Novo Comunicado</h3>
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
                                Título do Aviso
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Início da Exibição</label>
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fim da Exibição</label>
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
                                        <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(idx)}
                                            className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-200 rounded-full p-1 shadow-sm hover:bg-red-50"
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                {isSubmitting ? 'Publicando...' : 'Publicar Aviso'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    {/* Image Lightbox */ }
    {
        selectedImage && (
            <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={() => setSelectedImage(null)}
            >
                <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <img
                    src={selectedImage}
                    alt="Ampliação"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )
    }

    <ConfirmModal
        isOpen={!!noticeToDelete}
        onClose={() => setNoticeToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Aviso"
        message="Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
    />
    {
        isSuggestionModalOpen && (
            <RequestModal onClose={() => setIsSuggestionModalOpen(false)} />
        )
    }
        </div >
    );
};

export default Notices;
