import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, View, Document as DocumentType } from '../types';
import {
    PlusIcon,
    FileIcon,
    DownloadIcon,
    TrashIcon,
    SearchIcon,
    XIcon
} from './Icons';
import Skeleton from './Skeleton';
import { uploadFile } from '../services/storage';

interface DocumentsProps {
    setView: (view: View) => void;
}

const CATEGORIES = ['Todos', 'Regimento', 'Atas', 'Financeiro', 'Comunicados', 'Outros'];

const Documents: React.FC<DocumentsProps> = () => {
    const { documents, addDocument, deleteDocument, loading } = useData();
    const { currentUser } = useAuth();

    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // New Document State
    const [newDoc, setNewDoc] = useState({
        title: '',
        description: '',
        category: 'Regimento',
        fileUrl: '',
        fileName: '',
    });

    const canManage = currentUser?.role === Role.ADMIN ||
        currentUser?.role === Role.GESTAO ||
        currentUser?.role === Role.SINDICO;

    const filteredDocuments = documents.filter(doc => {
        const matchesCategory = activeCategory === 'Todos' || doc.category === activeCategory;
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoc.title || (!selectedFile && !newDoc.fileUrl)) return;

        setIsUploading(true);
        try {
            let finalFileUrl = newDoc.fileUrl;
            let finalFileName = newDoc.fileName;
            let finalFileSize = Math.floor(Math.random() * 5000000) + 500000;

            if (selectedFile) {
                const uploadedUrl = await uploadFile(selectedFile, 'archives', 'documents');
                if (uploadedUrl) {
                    finalFileUrl = uploadedUrl;
                    finalFileName = selectedFile.name;
                    finalFileSize = selectedFile.size;
                } else {
                    throw new Error("Falha no upload do arquivo.");
                }
            }

            await addDocument({
                ...newDoc,
                fileUrl: finalFileUrl,
                fileName: finalFileName,
                fileType: 'pdf',
                fileSize: finalFileSize,
                uploadedBy: currentUser?.name || 'Admin',
            });

            setNewDoc({ title: '', description: '', category: 'Regimento', fileUrl: '', fileName: '' });
            setSelectedFile(null);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Erro ao adicionar documento:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                    <Skeleton className="h-12 w-full md:w-64 rounded-xl" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Central de Documentos</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Acesse e faça download de documentos importantes do Porto Seguro 1.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-72 group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>

                    {canManage && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                            title="Adicionar Documento"
                        >
                            <PlusIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`
              px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
              ${activeCategory === cat
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-gray-100'}
            `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Document List */}
            {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                        <FileIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-gray-900 font-bold">Nenhum documento encontrado</h3>
                    <p className="text-gray-500 text-sm mt-1">Tente mudar a categoria ou o termo de busca.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocuments.map((doc) => (
                        <div
                            key={doc.id}
                            className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div className="flex gap-4">
                                <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                                    <FileIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-md mb-2 inline-block">
                                            {doc.category}
                                        </span>
                                        {canManage && (
                                            <button
                                                onClick={() => deleteDocument(doc.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{doc.title}</h3>
                                    <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                                        {doc.description || 'Sem descrição.'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                    {formatFileSize(doc.fileSize)} • PDF
                                </div>
                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-600 hover:text-white text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    Download
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Document Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xl font-black text-gray-900">Novo Documento</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
                                type="button"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddDocument} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                                <input
                                    required
                                    type="text"
                                    value={newDoc.title}
                                    onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Ex: Regimento Interno 2024"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Descrição (Opcional)</label>
                                <textarea
                                    value={newDoc.description}
                                    onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
                                    placeholder="Informações adicionais sobre o documento..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoria</label>
                                    <select
                                        value={newDoc.category}
                                        onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                    >
                                        {CATEGORIES.filter(c => c !== 'Todos').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Arquivo (PDF)</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSelectedFile(file);
                                                // Preenche o título automaticamente se estiver vazio
                                                if (!newDoc.title) {
                                                    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                                                    setNewDoc(prev => ({ ...prev, title: cleanName, fileName: file.name }));
                                                } else {
                                                    setNewDoc(prev => ({ ...prev, fileName: file.name }));
                                                }
                                            }
                                        }}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="flex items-center justify-center gap-3 p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-all text-indigo-600 font-bold h-[52px]"
                                    >
                                        <PlusIcon className="w-5 h-5 flex-shrink-0" />
                                        <span className="truncate">{selectedFile ? selectedFile.name : 'Selecionar'}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Ou use um link externo (PDF)</label>
                                <input
                                    type="url"
                                    value={newDoc.fileUrl}
                                    onChange={e => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-2 py-4 px-8 text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Enviando...
                                        </>
                                    ) : (
                                        'Salvar Documento'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
