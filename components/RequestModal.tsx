import React, { useState, useEffect, useRef } from 'react';
import { Request, Role, Status, Priority, Sector, RequestType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { SECTORS, REQUEST_TYPES, STATUSES, PRIORITIES } from '../constants';
import { uploadPhoto } from '../services/storage';
import { EditIcon, TrashIcon, XIcon, PlusIcon, LoaderCircleIcon } from './Icons';
import { suggestRequestDetails } from '../services/gemini';
import ImageLightbox from './ImageLightbox';

interface RequestModalProps {
  request?: Request;
  onClose: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ request, onClose }) => {
  const { currentUser } = useAuth();
  const { addRequest, updateRequest, deleteRequest, addComment, addToast } = useData();

  const MAX_PHOTOS = 3;

  const [isEditing, setIsEditing] = useState(!request);
  const [title, setTitle] = useState(request?.title || '');
  const [description, setDescription] = useState(request?.description || '');
  const [sector, setSector] = useState<Sector>(request?.sector || SECTORS[0]);
  const [type, setType] = useState<RequestType>(request?.type || REQUEST_TYPES[0]);
  const [status, setStatus] = useState<Status>(request?.status || Status.PENDENTE);
  const [priority, setPriority] = useState<Priority>(request?.priority || Priority.MEDIA);
  const [photos, setPhotos] = useState<string[]>(request?.photos || []);
  const [newComment, setNewComment] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // =============================
  // IA — Sugestões automáticas
  // =============================
  useEffect(() => {
    if (isEditing && description) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

      setIsSuggesting(true);

      debounceTimeout.current = window.setTimeout(async () => {
        try {
          const suggestions = await suggestRequestDetails(description);
          if (suggestions) {
            setSector(suggestions.sector);
            setType(suggestions.type);
            setPriority(suggestions.priority);
          }
        } catch {
          addToast('Falha ao obter sugestões da IA.', 'error');
        } finally {
          setIsSuggesting(false);
        }
      }, 1000);
    }

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [description, isEditing]);

  if (!currentUser) return null;

  const canManage = currentUser.role === Role.ADMIN || currentUser.role === Role.GESTAO;
  const isAuthor = currentUser.id === request?.authorId;

  // =============================
  // Upload de Fotos (Firebase Storage)
  // =============================
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const files = Array.from(e.target.files).slice(0, remainingSlots);

    if (files.length === 0) {
      addToast(`Você pode adicionar no máximo ${MAX_PHOTOS} fotos.`, 'info');
      return;
    }

    const urls: string[] = [];

    for (const file of files) {
      const url = await uploadPhoto(file);
      urls.push(url);
    }

    setPhotos(prev => [...prev, ...urls]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'O título é obrigatório.';
    if (!description.trim()) errs.description = 'A descrição é obrigatória.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // =============================
  // SALVAR
  // =============================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (request) {
      const updated: Request = {
        ...request,
        title,
        description,
        sector,
        type,
        status,
        priority,
        photos,
      };
      updateRequest(updated);
    } else {
      addRequest({
        title,
        description,
        sector,
        type,
        priority,
        photos,
        authorId: currentUser.id,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (request && confirm("Excluir pendência?")) {
      deleteRequest(request.id);
      onClose();
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !request) return;

    addComment(request.id, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: newComment,
    });

    setNewComment('');
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  // =============================
  // Campo de SELECT genérico
  // =============================
  const renderSelect = (
    label: string,
    value: any,
    onChange: (v: any) => void,
    list: string[],
    disabled: boolean,
    loading?: boolean
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 flex items-center">
        {label}
        {loading && <LoaderCircleIcon className="w-4 h-4 ml-2 text-indigo-500" />}
      </label>

      <select
        value={value}
        onChange={e => onChange(e.target.value as any)}
        disabled={disabled}
        className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                   focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 text-gray-900"
      >
        {list.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  // =============================
  // RENDERIZAÇÃO
  // =============================
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">

          {/* Header */}
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-900">
              {request ? "Detalhes da Pendência" : "Nova Pendência"}
            </h2>

            <div className="flex gap-2">
              {request && (isAuthor || canManage) && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-100 rounded-full">
                  <EditIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {request && (isAuthor || canManage) && (
                <button onClick={handleDelete} className="p-2 hover:bg-gray-100 rounded-full">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <XIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Título</label>
              <input
                value={title}
                disabled={!isEditing}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                  focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                value={description}
                disabled={!isEditing}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full border rounded-md px-3 py-2 bg-white border-gray-300 
                  focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSelect("Setor", sector, (v) => setSector(v as Sector), SECTORS, !isEditing, isSuggesting)}
              {renderSelect("Tipo", type, (v) => setType(v as RequestType), REQUEST_TYPES, !isEditing, isSuggesting)}
            </div>

            {canManage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSelect("Status", status, (v) => setStatus(v as Status), STATUSES, !isEditing)}
                {renderSelect("Prioridade", priority, (v) => setPriority(v as Priority), PRIORITIES, !isEditing, isSuggesting)}
              </div>
            )}

            {/* FOTOS */}
            <div>
              <label className="block text-sm">Fotos ({photos.length}/{MAX_PHOTOS})</label>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      className="w-full h-24 rounded-md object-cover cursor-pointer"
                      onClick={() => openLightbox(index)}
                    />

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 
                          group-hover:opacity-100 transition"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {isEditing && photos.length < MAX_PHOTOS && (
                  <label className="flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-md h-24 cursor-pointer bg-gray-50">
                    <PlusIcon className="w-8 h-8 text-gray-500" />
                    <span className="text-xs text-gray-500">Adicionar</span>
                    <input type="file" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* BOTÕES */}
            {isEditing && (
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md bg-white">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">
                  Salvar
                </button>
              </div>
            )}
          </form>

        </div>
      </div>

      {isLightboxOpen && (
        <ImageLightbox
          images={photos}
          currentIndex={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
          onNext={() => setCurrentImageIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
        />
      )}
    </>
  );
};

export default RequestModal;
