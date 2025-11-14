import React, { useState, useEffect, useRef } from 'react';
import { Request, Role, Status, Priority } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { SECTORS, REQUEST_TYPES, STATUSES, PRIORITIES } from '../constants';
import { fileToBase64 } from '../utils/fileUtils';
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
  const [sector, setSector] = useState(request?.sector || SECTORS[0]);
  const [type, setType] = useState(request?.type || REQUEST_TYPES[0]);
  const [status, setStatus] = useState(request?.status || Status.PENDENTE);
  const [priority, setPriority] = useState(request?.priority || Priority.MEDIA);
  const [photos, setPhotos] = useState<string[]>(request?.photos || []);
  const [newComment, setNewComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
            } catch (error) {
                console.error(error);
                addToast('Falha ao obter sugestões da IA.', 'error');
            } finally {
                setIsSuggesting(false);
            }
        }, 1000);
    } else {
        setIsSuggesting(false);
    }

    return () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [description, isEditing]);

  if (!currentUser) return null;

  const canManage = currentUser.role === Role.ADMIN || currentUser.role === Role.GESTAO;
  const isAuthor = currentUser.id === request?.authorId;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const remainingSlots = MAX_PHOTOS - photos.length;
      if (remainingSlots <= 0) {
        addToast(`Você pode adicionar no máximo ${MAX_PHOTOS} fotos.`, 'info');
        return;
      }

      const files = Array.from(e.target.files).slice(0, remainingSlots);
      if (e.target.files.length > remainingSlots) {
         addToast(`Limite de ${MAX_PHOTOS} fotos atingido. Apenas as primeiras ${remainingSlots} foram adicionadas.`, 'info');
      }

      const base64Photos = await Promise.all(files.map(fileToBase64));
      setPhotos(prev => [...prev, ...base64Photos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'O título é obrigatório.';
    if (!description.trim()) newErrors.description = 'A descrição é obrigatória.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (request) {
      const updatedRequest: Request = { ...request, title, description, sector, type, status, priority, photos };
      updateRequest(updatedRequest);
    } else {
      addRequest({ title, description, sector, type, priority, photos, authorId: currentUser.id });
    }
    onClose();
  };

  const handleDelete = () => {
    if (request && window.confirm('Tem certeza que deseja excluir esta pendência?')) {
      deleteRequest(request.id);
      onClose();
    }
  };
  
  const handleAddComment = () => {
    if (newComment.trim() && request) {
      addComment(request.id, { authorId: currentUser.id, text: newComment, authorName: currentUser.name });
      setNewComment('');
    }
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const renderFormField = (label: string, value: any, onChange: (val: any) => void, options: string[], disabled: boolean, isLoading?: boolean) => (
     <div>
        <label className="block text-sm font-medium text-gray-700 flex items-center">
          {label}
          {isLoading && <LoaderCircleIcon className="w-4 h-4 ml-2 text-indigo-500" />}
        </label>
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 bg-white text-gray-900">
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
  );

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{request ? 'Detalhes da Pendência' : 'Nova Pendência'}</h2>
                <div className="flex items-center space-x-2">
                    {request && (isAuthor || canManage) && !isEditing && (
                        <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600"><EditIcon className="w-5 h-5"/></button>
                    )}
                    {request && (isAuthor || canManage) && (
                        <button onClick={handleDelete} className="p-2 rounded-full hover:bg-gray-100 text-red-600"><TrashIcon className="w-5 h-5"/></button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-600"><XIcon className="w-6 h-6"/></button>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={!isEditing} aria-invalid={!!errors.title} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm disabled:bg-gray-200 bg-white ${errors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} disabled={!isEditing} rows={4} aria-invalid={!!errors.description} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm disabled:bg-gray-200 bg-white ${errors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`} />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFormField('Setor', sector, setSector, SECTORS, !isEditing, isSuggesting)}
                {renderFormField('Tipo', type, setType, REQUEST_TYPES, !isEditing, isSuggesting)}
              </div>
              
              {canManage &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderFormField('Status', status, setStatus, STATUSES, !isEditing || !canManage)}
                  {renderFormField('Prioridade', priority, setPriority, PRIORITIES, !isEditing || !canManage, isSuggesting)}
                </div>
              }
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Fotos ({photos.length}/{MAX_PHOTOS})</label>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img src={photo} alt={`Foto ${index + 1}`} onClick={() => openLightbox(index)} className="w-full h-24 object-cover rounded-md cursor-pointer"/>
                      {isEditing && (
                        <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && photos.length < MAX_PHOTOS && (
                     <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                           <PlusIcon className="w-8 h-8 text-gray-500"/>
                            <p className="text-xs text-gray-500">Adicionar</p>
                        </div>
                        <input type="file" multiple onChange={handlePhotoUpload} className="hidden" accept="image/*"/>
                    </label>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={request ? () => setIsEditing(false) : onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Salvar</button>
                </div>
              )}
            </form>
            
            {request && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Comentários</h3>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                    {request.comments.length > 0 ? request.comments.map(c => (
                        <div key={c.id} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-800">{c.text}</p>
                            <p className="text-xs text-gray-500 mt-1">- {c.authorName} em {new Date(c.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                    )) : <p className="text-sm text-gray-500">Nenhum comentário ainda.</p>}
                </div>
                 <div className="mt-4 flex space-x-3">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Adicione um comentário..." className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white" />
                    <button onClick={handleAddComment} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Enviar</button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
    {isLightboxOpen && (
      <ImageLightbox
        images={photos}
        currentIndex={currentImageIndex}
        onClose={() => setIsLightboxOpen(false)}
        onPrev={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
        onNext={() => setCurrentImageIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
      />
    )}
    </>
  );
};

export default RequestModal;