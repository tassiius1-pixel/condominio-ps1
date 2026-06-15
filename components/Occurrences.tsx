import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Occurrence } from '../types';
import { PlusIcon, UploadIcon, XIcon, CheckCircleIcon, ChevronLeftIcon, EditIcon, TrashIcon, BookIcon, InfoIcon } from './Icons';
import { uploadPhoto } from '../services/storage';
import { compressImage } from '../utils/fileUtils';
import ConfirmModal from './ConfirmModal';

interface OccurrencesProps {
    setView?: (view: any) => void;
}

const Occurrences: React.FC<OccurrencesProps> = ({ setView }) => {
    const { occurrences, addOccurrence, updateOccurrence, deleteOccurrence, addToast } = useData();
    const { currentUser } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [phone, setPhone] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);

    // Admin Response State
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');

    const canManageOccurrences = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'info' | 'success';
        alertOnly: boolean;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        alertOnly: false
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const file = e.target.files[0];

        try {
            // Compress image before upload
            const compressedBase64 = await compressImage(file, 1024, 1024, 0.8);

            // Convert base64 back to File object for upload
            const res = await fetch(compressedBase64);
            const blob = await res.blob();
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });

            // Use 'ocorrencias' folder in the storage bucket
            const url = await uploadPhoto(compressedFile, "ocorrencias");

            if (url) {
                setPhotos(prev => [...prev, url]);
                addToast("Foto adicionada!", "success");
            } else {
                addToast("Erro ao enviar foto.", "error");
            }
        } catch (error) {
            console.error("Erro no upload:", error);
            addToast("Erro ao processar a imagem.", "error");
        } finally {
            setIsUploading(false);
            // Reset input value to allow selecting the same file again if needed
            e.target.value = '';
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleEdit = (occ: Occurrence) => {
        setEditingOccurrence(occ);
        setPhone(occ.phone);
        setSubject(occ.subject);
        setDescription(occ.description);
        setPhotos(occ.photos || []);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        setModalConfig({
            isOpen: true,
            title: "Excluir Ocorrência?",
            message: "Esta ação é irreversível e removerá todos os dados desta ocorrência.",
            type: 'danger',
            alertOnly: false,
            onConfirm: () => {
                deleteOccurrence(id);
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSubmitting(true);
        try {
            if (editingOccurrence) {
                await updateOccurrence(editingOccurrence.id, {
                    phone,
                    subject,
                    description,
                    photos
                });
                // Toast handled by DataContext
            } else {
                await addOccurrence({
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    houseNumber: currentUser.houseNumber,
                    phone,
                    subject,
                    description,
                    photos
                });
            }

            setIsFormOpen(false);
            setEditingOccurrence(null);
            setPhone('');
            setSubject('');
            setDescription('');
            setPhotos([]);
        } catch (error) {
            console.error("Erro ao salvar ocorrência:", error);
            addToast("Erro ao salvar ocorrência.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminResponse = async (id: string) => {
        if (!responseText.trim()) return;
        await updateOccurrence(id, {
            adminResponse: responseText,
            status: 'Resolvido',
            resolvedAt: new Date().toISOString()
        });
        setRespondingTo(null);
        setResponseText('');
    };

    const handleResolve = async (id: string) => {
        await updateOccurrence(id, {
            status: 'Resolvido',
            resolvedAt: new Date().toISOString()
        });
    };

    // Filter Logic
    const filteredOccurrences = occurrences.filter(occ => {
        // First filter by visibility/ownership
        const canSee = canManageOccurrences || occ.authorId === currentUser?.id;
        if (!canSee) return false;

        // Then filter by status (tab)
        return activeTab === 'open' ? occ.status === 'Aberto' : occ.status === 'Resolvido';
    });

    const renderOccurrenceCard = (occ: Occurrence) => {
        const isAuthor = currentUser?.id === occ.authorId;
        const canEdit = isAuthor && !occ.adminResponse && occ.status === 'Aberto';
        const canDelete = currentUser?.role === Role.ADMIN;

        return (
            <div key={occ.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all relative group flex flex-col gap-4">
                {/* Header Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-4">
                        <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                            {occ.subject}
                        </h3>
                        {/* Action buttons integrated neatly */}
                        <div className="flex gap-1.5 shrink-0">
                            {canEdit && (
                                <button
                                    onClick={() => handleEdit(occ)}
                                    className="p-2 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-xl transition border border-gray-100 shadow-sm active:scale-95 duration-200"
                                    title="Editar"
                                >
                                    <EditIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(occ.id)}
                                    className="p-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition border border-gray-100 shadow-sm active:scale-95 duration-200"
                                    title="Excluir (Admin)"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Metadata Chips Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {occ.status === 'Resolvido' ? (
                            <span className="px-2.5 py-0.5 bg-green-50 text-green-700 font-bold uppercase tracking-wider text-[9px] rounded-full border border-green-150">
                                Resolvido
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold uppercase tracking-wider text-[9px] rounded-full border border-amber-150">
                                Em Aberto
                            </span>
                        )}

                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider rounded-full border border-indigo-150">
                            Casa {occ.houseNumber}
                        </span>

                        <span className="px-2.5 py-0.5 bg-gray-50 text-gray-600 font-bold text-[9px] uppercase tracking-wider rounded-full border border-gray-200">
                            📞 {occ.phone}
                        </span>
                    </div>
                </div>

                {/* Author Information */}
                <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-2 font-medium">
                    <div>
                        Por: <span className="font-bold text-gray-800">{occ.authorName}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                        {new Date(occ.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Description Box */}
                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/60 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {occ.description}
                </div>

                {/* Photos Display */}
                {occ.photos && occ.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {occ.photos.map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo}
                                alt={`Anexo ${idx + 1}`}
                                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover cursor-pointer hover:opacity-90 transition border border-gray-200"
                                onClick={() => setSelectedImage(photo)}
                            />
                        ))}
                    </div>
                )}

                {/* Admin Response Section */}
                {(occ.adminResponse || (canManageOccurrences && occ.status === 'Aberto')) && (
                    <div className="mt-2 border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                            <CheckCircleIcon className="w-4 h-4 text-indigo-500" />
                            Retorno do Síndico
                        </h4>

                        {occ.adminResponse ? (
                            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100/60 text-indigo-900 text-sm leading-relaxed">
                                {occ.adminResponse}
                            </div>
                        ) : (
                            canManageOccurrences && !respondingTo && (
                                <button
                                    onClick={() => setRespondingTo(occ.id)}
                                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                                >
                                    Responder Ocorrência
                                </button>
                            )
                        )}

                        {/* Admin Reply Form */}
                        {respondingTo === occ.id && (
                            <div className="mt-2 animate-fade-in space-y-3">
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    className="w-full p-4 border border-gray-250 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                                    placeholder="Escreva uma resposta para o morador..."
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setRespondingTo(null)}
                                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleAdminResponse(occ.id)}
                                        className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                    >
                                        Enviar Resposta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Resolve Button for Admin */}
                {canManageOccurrences && occ.status === 'Aberto' && (
                    <div className="mt-1 flex justify-end">
                        <button
                            onClick={() => handleResolve(occ.id)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-green-700 transition shadow-sm active:scale-95"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            Marcar como Resolvido
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {setView && (
                        <button
                            onClick={() => setView('home')}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 touch-active shrink-0"
                            title="Voltar para o Início"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Livro de Ocorrências</h1>
                        <p className="text-gray-500 text-[10px] md:text-sm mt-1 font-semibold leading-tight">Registre ocorrências ou denúncias de forma segura e privada.</p>
                    </div>
                </div>

                {!isFormOpen && (
                    <button
                        onClick={() => {
                            setEditingOccurrence(null);
                            setPhone('');
                            setSubject('');
                            setDescription('');
                            setPhotos([]);
                            setIsFormOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full md:w-auto justify-center font-black text-xs uppercase tracking-widest active:scale-95 touch-active self-start md:self-auto"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Nova Ocorrência</span>
                    </button>
                )}
            </div>

            <div className="bg-white/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-fade-in">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <InfoIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-indigo-900 flex items-center gap-2 uppercase tracking-tight">
                        Demanda Confidencial
                    </h4>
                    <p className="text-xs font-semibold text-indigo-700/80 mt-0.5">
                        Apenas o síndico terá acesso ao que você escrever aqui. Fique tranquilo para relatar problemas confidenciais.
                    </p>
                </div>
            </div>

            {/* Tabs for all Users */}
            {!isFormOpen && (
                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 w-full sm:w-fit shadow-sm">
                    <button
                        onClick={() => setActiveTab('open')}
                        className={`flex-1 sm:flex-none px-8 py-2.5 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all touch-active ${
                            activeTab === 'open'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Em Aberto
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`flex-1 sm:flex-none px-8 py-2.5 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all touch-active ${
                            activeTab === 'resolved'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Arquivadas
                    </button>
                </div>
            )}

            {/* Modal Overlay Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4 bg-black/40 backdrop-blur-md animate-fade-in text-left overflow-y-auto">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50 max-h-[90vh] flex flex-col my-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-transparent flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {editingOccurrence ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                                </h3>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Preencha os detalhes abaixo</p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
 
                        <div className="overflow-y-auto p-5 custom-scrollbar flex-1 bg-transparent">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">Nome</label>
                                        <input
                                            type="text"
                                            value={currentUser?.name}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-gray-150 border-2 border-gray-300 rounded-xl text-gray-500 font-medium text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">Casa</label>
                                        <input
                                            type="text"
                                            value={currentUser?.houseNumber}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-gray-150 border-2 border-gray-300 rounded-xl text-gray-500 font-medium text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">Telefone de Contato <span className="text-red-500">*</span></label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all font-semibold text-gray-900 placeholder-gray-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">Assunto <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Ex: Barulho..."
                                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all font-semibold text-gray-900 placeholder-gray-400 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">Descrição Detalhada <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all font-semibold text-gray-900 placeholder-gray-400 resize-none text-sm"
                                        placeholder="Descreva o que aconteceu..."
                                    ></textarea>
                                </div>

                                {/* Photos Upload */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 pl-1">Anexos (Fotos)</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="relative w-20 h-20 group">
                                                <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                            <div className="bg-indigo-100 p-1.5 rounded-full mb-0.5 group-hover:bg-white transition-colors">
                                                <UploadIcon className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Adicionar</span>
                                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition-colors active:scale-95 shadow-sm text-center"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isUploading}
                                        className={`flex-[2] px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 font-bold flex justify-center items-center gap-2 text-xs ${(isSubmitting || isUploading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? <span className="animate-pulse">Salvando...</span> : (isUploading ? <span className="animate-pulse">Enviando foto...</span> : <><CheckCircleIcon className="w-4 h-4" /> Salvar Ocorrência</>)}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* List View (Always rendered effectively since Modal is overlays) */}
            {!isFormOpen && (
                <div className="space-y-4">
                    {filteredOccurrences.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200 backdrop-blur-sm">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">
                                {canManageOccurrences
                                    ? `Nenhuma ocorrência ${activeTab === 'open' ? 'em aberto' : 'resolvida'}.`
                                    : "Você não possui ocorrências registradas."}
                            </p>
                            {!canManageOccurrences && (
                                <button
                                    onClick={() => setIsFormOpen(true)}
                                    className="mt-4 text-indigo-600 font-bold hover:underline"
                                >
                                    Registrar a primeira
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredOccurrences.map(renderOccurrenceCard)
                    )}
                </div>
            )}

            {/* Image Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[120] flex items-center justify-center p-4"
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
                    />
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                alertOnly={modalConfig.alertOnly}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    );
};

export default Occurrences;
