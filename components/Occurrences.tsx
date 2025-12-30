import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Occurrence } from '../types';
import { PlusIcon, UploadIcon, XIcon, CheckCircleIcon, ChevronLeftIcon, EditIcon, TrashIcon, BookIcon } from './Icons';
import { uploadPhoto } from '../services/storage';
import { compressImage } from '../utils/fileUtils';

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
        if (window.confirm("Tem certeza que deseja excluir esta ocorrência?")) {
            await deleteOccurrence(id);
        }
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
            // Don't close automatically, just reply
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
        if (canManageOccurrences) {
            return activeTab === 'open' ? occ.status === 'Aberto' : occ.status === 'Resolvido';
        } else {
            // Residents see only their own
            return occ.authorId === currentUser?.id;
        }
    });

    const renderOccurrenceCard = (occ: Occurrence) => {
        const isAuthor = currentUser?.id === occ.authorId;
        const canEdit = isAuthor && !occ.adminResponse && occ.status === 'Aberto';
        const canDelete = currentUser?.role === Role.ADMIN;

        return (
            <div key={occ.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                {/* Actions: Edit (Author) / Delete (Admin) */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    {canEdit && (
                        <button
                            onClick={() => handleEdit(occ)}
                            className="p-1.5 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition border border-gray-100 shadow-sm"
                            title="Editar"
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(occ.id)}
                            className="p-1.5 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition border border-gray-100 shadow-sm"
                            title="Excluir (Admin)"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
                    <div className="w-full pr-0 sm:pr-16">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{occ.subject}</h3>
                            {occ.status === 'Resolvido' && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full">Resolvido</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Por:</span> <span className="font-medium text-gray-900">{occ.authorName}</span>
                                <span className="mx-1.5 text-gray-300 hidden sm:inline">|</span>
                                <span className="block sm:inline text-gray-500">Casa {occ.houseNumber}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                                {new Date(occ.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-100 self-start sm:self-auto">
                        📞 {occ.phone}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {occ.description}
                </div>

                {/* Photos Display */}
                {occ.photos && occ.photos.length > 0 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                        {occ.photos.map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo}
                                alt={`Anexo ${idx + 1}`}
                                className="h-24 w-24 rounded-lg object-cover cursor-pointer hover:opacity-90 transition border border-gray-200"
                                onClick={() => setSelectedImage(photo)}
                            />
                        ))}
                    </div>
                )}

                {/* Admin Response Section */}
                {(occ.adminResponse || (canManageOccurrences && occ.status === 'Aberto')) && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-indigo-600" />
                            Retorno da Gestão
                        </h4>

                        {occ.adminResponse ? (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-900 text-sm">
                                {occ.adminResponse}
                            </div>
                        ) : (
                            canManageOccurrences && !respondingTo && (
                                <button
                                    onClick={() => setRespondingTo(occ.id)}
                                    className="text-sm text-indigo-600 hover:underline font-medium"
                                >
                                    Responder
                                </button>
                            )
                        )}

                        {/* Admin Reply Form */}
                        {respondingTo === occ.id && (
                            <div className="mt-2 animate-fade-in">
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Escreva uma resposta para o morador..."
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setRespondingTo(null)}
                                        className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleAdminResponse(occ.id)}
                                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                        Enviar Resposta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Admin Actions */}
                {canManageOccurrences && occ.status === 'Aberto' && (
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => handleResolve(occ.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition shadow-sm"
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setView && setView('home')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Livro de Ocorrências</h2>
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm w-full md:w-auto justify-center"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Nova Ocorrência</span>
                    </button>
                )}
            </div>

            {/* Tabs for Admin */}
            {canManageOccurrences && !isFormOpen && (
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('open')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'open' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Em Aberto
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'resolved' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Resolvidas
                    </button>
                </div>
            )}

            {/* Modal Overlay Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in text-left">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50 max-h-[90vh] flex flex-col">
                        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white/0 flex-shrink-0">
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

                        <div className="overflow-y-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="group">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Nome</label>
                                        <input
                                            type="text"
                                            value={currentUser?.name}
                                            disabled
                                            className="w-full px-4 py-3 bg-gray-100/50 border border-gray-200 rounded-xl text-gray-500 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Casa</label>
                                        <input
                                            type="text"
                                            value={currentUser?.houseNumber}
                                            disabled
                                            className="w-full px-4 py-3 bg-gray-100/50 border border-gray-200 rounded-xl text-gray-500 font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Telefone de Contato <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Assunto <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Ex: Barulho excessivo, Lâmpada queimada..."
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Descrição Detalhada <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400 resize-none"
                                        placeholder="Descreva o que aconteceu..."
                                    ></textarea>
                                </div>

                                {/* Photos Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 pl-1">Anexos (Fotos)</label>
                                    <div className="flex flex-wrap gap-3">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="relative w-24 h-24 group">
                                                <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                            <div className="bg-indigo-100 p-2 rounded-full mb-1 group-hover:bg-white transition-colors">
                                                <UploadIcon className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Adicionar</span>
                                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="flex-1 px-4 py-3.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isUploading}
                                        className={`flex-[2] px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 font-bold flex justify-center items-center gap-2 ${(isSubmitting || isUploading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? <span className="animate-pulse">Salvando...</span> : (isUploading ? <span className="animate-pulse">Enviando foto...</span> : <><CheckCircleIcon className="w-5 h-5" /> Salvar Ocorrência</>)}
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
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default Occurrences;
