import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Occurrence } from '../types';
import { PlusIcon, UploadIcon, XIcon, CheckCircleIcon, ChevronLeftIcon, EditIcon, TrashIcon } from './Icons';
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
            addToast("Processando e enviando foto...", "info");

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
                addToast("Foto adicionada com sucesso!", "success");
            } else {
                addToast("Erro ao enviar foto. Tente novamente.", "error");
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
                addToast("Ocorrência atualizada com sucesso!", "success");
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

        return (
            <div key={occ.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                {/* Edit/Delete Actions for Author */}
                {canEdit && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleEdit(occ)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                            title="Editar"
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDelete(occ.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                            title="Excluir"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-start mb-4 pr-16">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{occ.subject}</h3>
                            {occ.status === 'Resolvido' && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Resolvido</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Registrado por <span className="font-medium text-gray-900">{occ.authorName}</span> (Casa {occ.houseNumber})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(occ.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">
                        Tel: {occ.phone}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {occ.description}
                </div>

                {/* Photos Display */}
                {occ.photos && occ.photos.length > 0 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {occ.photos.map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo}
                                alt={`Anexo ${idx + 1}`}
                                className="h-24 w-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
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
                    <button onClick={() => setView && setView('notices')} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
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

            {/* Form */}
            {isFormOpen ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-slide-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {editingOccurrence ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
                        </h3>
                        <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={currentUser?.name}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Casa</label>
                                <input
                                    type="text"
                                    value={currentUser?.houseNumber}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone de Contato *</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Ex: Barulho excessivo, Lâmpada queimada..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                            ></textarea>
                        </div>

                        {/* Photos Upload */}
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
                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                    <UploadIcon className="w-6 h-6 text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-1">Add</span>
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || isUploading}
                                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium ${(isSubmitting || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Salvando...' : (isUploading ? 'Enviando foto...' : 'Salvar')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* List View */
                <div className="space-y-4">
                    {filteredOccurrences.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                            <p className="text-gray-500">
                                {canManageOccurrences
                                    ? `Nenhuma ocorrência ${activeTab === 'open' ? 'em aberto' : 'resolvida'}.`
                                    : "Você não possui ocorrências registradas."}
                            </p>
                        </div>
                    ) : (
                        filteredOccurrences.map(renderOccurrenceCard)
                    )}
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
        </div>
    );
};

export default Occurrences;
