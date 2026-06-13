import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { uploadFile } from '../services/storage';
import ConfirmModal from './ConfirmModal';
import {
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  LoaderCircleIcon
} from './Icons';

// Inline premium SVGs for icons not present in Icons.tsx
const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.25A2.25 2.25 0 0 0 4.5 17.5h15a2.25 2.25 0 0 0 2.25-2.25V14a2.25 2.25 0 0 0-2.25-2.25H4.5A2.25 2.25 0 0 0 2.25 14v.25M12 5.25v6M9 8.25h6" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

interface GalleryProps {
  setView: (view: any) => void;
}

interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
}

export const Gallery: React.FC<GalleryProps> = ({ setView }) => {
  const { currentUser } = useAuth();
  const {
    albums,
    addAlbum,
    deleteAlbum,
    galleryMedia,
    addGalleryMedia,
    deleteGalleryMedia,
    addToast
  } = useData();

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);

  // Modals & Confirmation States
  const [showAddAlbumModal, setShowAddAlbumModal] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);

  // Upload States
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox States
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Checks for management role
  const isManager = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO, Role.GESTAO].includes(currentUser.role);

  // Find active album object
  const activeAlbum = albums.find(a => a.id === activeAlbumId);
  const activeAlbumMedia = galleryMedia.filter(m => m.albumId === activeAlbumId);

  // Handle Download directly via Blob to preserve quality and trigger file save prompt
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      addToast('Download concluído!', 'success');
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      // Fallback
      window.open(url, '_blank');
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!showLightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
      if (e.key === 'ArrowLeft') handlePrevMedia();
      if (e.key === 'ArrowRight') handleNextMedia();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, lightboxIndex, activeAlbumMedia.length]);

  const handlePrevMedia = () => {
    setLightboxIndex(prev => (prev === 0 ? activeAlbumMedia.length - 1 : prev - 1));
  };

  const handleNextMedia = () => {
    setLightboxIndex(prev => (prev === activeAlbumMedia.length - 1 ? 0 : prev + 1));
  };

  // Album creation
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle.trim() || !currentUser) return;

    setIsCreatingAlbum(true);
    try {
      await addAlbum({
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        createdBy: currentUser.id
      });
      setAlbumTitle('');
      setAlbumDesc('');
      setShowAddAlbumModal(false);
    } catch (err) {
      console.error("Erro ao criar álbum:", err);
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  // Album Deletion
  const handleConfirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    try {
      await deleteAlbum(albumToDelete);
      if (activeAlbumId === albumToDelete) {
        setActiveAlbumId(null);
      }
      setAlbumToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar álbum:", err);
    }
  };

  // Media Deletion
  const handleConfirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    try {
      await deleteGalleryMedia(mediaToDelete);
      setMediaToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar mídia:", err);
    }
  };

  // Upload queue management
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    const items: UploadQueueItem[] = selectedFiles.map((file, idx) => ({
      id: `queue-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }));

    setUploadQueue(items);
  };

  const handleStartUpload = async () => {
    if (uploadQueue.length === 0 || !activeAlbumId || !currentUser || !fileInputRef.current?.files) return;

    setIsUploading(true);
    const files = Array.from(fileInputRef.current.files);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const queueItem = uploadQueue[i];

        setUploadQueue(prev =>
          prev.map(item => (item.id === queueItem.id ? { ...item, status: 'uploading' } : item))
        );

        // Simulated progress steps for better UX since Supabase upload doesn't offer progress hooks easily in default JS client
        const progressInterval = setInterval(() => {
          setUploadQueue(prev =>
            prev.map(item => {
              if (item.id === queueItem.id && item.status === 'uploading' && item.progress < 90) {
                return { ...item, progress: item.progress + 15 };
              }
              return item;
            })
          );
        }, 150);

        const folderPath = `gallery/${activeAlbumId}`;
        // Upload to fotos bucket
        const publicUrl = await uploadFile(file, folderPath, 'fotos');
        clearInterval(progressInterval);

        if (publicUrl) {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          await addGalleryMedia({
            albumId: activeAlbumId,
            url: publicUrl,
            type,
            createdBy: currentUser.id
          });

          setUploadQueue(prev =>
            prev.map(item => (item.id === queueItem.id ? { ...item, status: 'completed', progress: 100 } : item))
          );
        } else {
          setUploadQueue(prev =>
            prev.map(item => (item.id === queueItem.id ? { ...item, status: 'error', progress: 0 } : item))
          );
        }
      }

      addToast('Upload concluído com sucesso!', 'success');
      setTimeout(() => {
        setShowAddMediaModal(false);
        setUploadQueue([]);
        setIsUploading(false);
      }, 1200);

    } catch (err) {
      console.error("Erro no upload múltiplo:", err);
      addToast('Erro ao realizar upload de arquivos.', 'error');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* 1. ALBUM LIST VIEW */}
      {!activeAlbumId ? (
        <>
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Galeria de Eventos</h1>
              <p className="text-gray-500 font-medium mt-1">Fotos e vídeos dos momentos marcantes do nosso condomínio.</p>
            </div>
            {isManager && (
              <button
                onClick={() => setShowAddAlbumModal(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-100/50 hover:shadow-indigo-100 transition-all active:scale-95 self-start sm:self-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Novo Álbum</span>
              </button>
            )}
          </header>

          {albums.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <FolderIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum álbum criado</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                {isManager
                  ? "Crie o primeiro álbum para começar a compartilhar fotos e vídeos de festividades, reuniões ou obras no condomínio!"
                  : "Ainda não existem álbuns de fotos ou vídeos criados na galeria."}
              </p>
              {isManager && (
                <button
                  onClick={() => setShowAddAlbumModal(true)}
                  className="mt-6 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider hover:underline"
                >
                  Criar Álbum Agora →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map(album => {
                const albumMedia = galleryMedia.filter(m => m.albumId === album.id);
                const firstMedia = albumMedia[0];
                const mediaCount = albumMedia.length;
                const imageCount = albumMedia.filter(m => m.type === 'image').length;
                const videoCount = albumMedia.filter(m => m.type === 'video').length;

                return (
                  <div
                    key={album.id}
                    onClick={() => setActiveAlbumId(album.id)}
                    className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full relative"
                  >
                    {/* Capa */}
                    <div className="aspect-[4/3] bg-slate-100/50 relative overflow-hidden flex items-center justify-center">
                      {firstMedia ? (
                        firstMedia.type === 'image' ? (
                          <img
                            src={firstMedia.url}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full relative">
                            <video
                              src={firstMedia.url}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <PlayIcon className="w-12 h-12 text-white/90 drop-shadow" />
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center text-indigo-400/80">
                          <FolderIcon className="w-16 h-16" />
                          <span className="text-xs font-black uppercase tracking-wider mt-2">Álbum Vazio</span>
                        </div>
                      )}

                      {/* Contador total */}
                      {mediaCount > 0 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                          {mediaCount === 1 ? '1 arquivo' : `${mediaCount} arquivos`}
                        </div>
                      )}
                    </div>

                    {/* Informações do Álbum */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {album.title}
                        </h3>
                        {album.description && (
                          <p className="text-slate-500 text-sm font-medium line-clamp-2">
                            {album.description}
                          </p>
                        )}
                      </div>

                      {/* Metadados */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                        <div>
                          {imageCount > 0 && <span>{imageCount} {imageCount === 1 ? 'foto' : 'fotos'}</span>}
                          {imageCount > 0 && videoCount > 0 && <span> • </span>}
                          {videoCount > 0 && <span>{videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}</span>}
                          {mediaCount === 0 && <span>Nenhuma mídia</span>}
                        </div>
                        <span>
                          {new Date(album.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Excluir Álbum (Administração) */}
                    {isManager && (
                      <div className="absolute top-3 left-3 lg:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlbumToDelete(album.id);
                          }}
                          className="p-2 bg-white/95 hover:bg-red-500 hover:text-white rounded-xl text-red-500 shadow-md transition-all border border-slate-100/50"
                          title="Excluir Álbum"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* 2. ALBUM DETAIL VIEW */
        <>
          <div className="space-y-6">
            <button
              onClick={() => setActiveAlbumId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black text-xs uppercase tracking-wider transition-colors active:scale-95"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Voltar para Álbuns</span>
            </button>

            {activeAlbum && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{activeAlbum.title}</h1>
                  {activeAlbum.description && (
                    <p className="text-gray-500 font-medium mt-1">{activeAlbum.description}</p>
                  )}
                </div>
                {isManager && (
                  <div className="flex gap-3 self-start sm:self-auto">
                    <button
                      onClick={() => setShowAddMediaModal(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-100/50 hover:shadow-indigo-100 transition-all active:scale-95"
                    >
                      <UploadIcon className="w-5 h-5" />
                      <span>Adicionar Mídias</span>
                    </button>
                    <button
                      onClick={() => setAlbumToDelete(activeAlbum.id)}
                      className="flex items-center justify-center p-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all active:scale-95"
                      title="Excluir Álbum"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeAlbumMedia.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Álbum vazio</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                {isManager
                  ? "Envie fotos ou vídeos originais de eventos para preencher este álbum."
                  : "Este álbum ainda não possui mídias para visualização."}
              </p>
              {isManager && (
                <button
                  onClick={() => setShowAddMediaModal(true)}
                  className="mt-6 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider hover:underline"
                >
                  Adicionar Fotos e Vídeos →
                </button>
              )}
            </div>
          ) : (
            /* Media Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activeAlbumMedia.map((media, index) => (
                <div
                  key={media.id}
                  onClick={() => {
                    setLightboxIndex(index);
                    setShowLightbox(true);
                  }}
                  className="group aspect-square bg-slate-100 rounded-2xl border border-slate-100 overflow-hidden relative shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer"
                >
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={`Foto do evento ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full relative">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <PlayIcon className="w-5 h-5 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ações em Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5 z-10">
                    <div className="flex justify-end">
                      {isManager && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaToDelete(media.id);
                          }}
                          className="p-1.5 bg-white/95 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90"
                          title="Deletar Mídia"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-white">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(media.url, `${activeAlbum?.title || 'galeria'}-${index + 1}.${media.url.split('.').pop()}`);
                        }}
                        className="p-1.5 bg-white/20 text-white hover:bg-white/40 hover:scale-105 rounded-lg transition-all border border-white/20 backdrop-blur-sm active:scale-90"
                        title="Baixar em qualidade original"
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </button>
                      <span className="text-[9px] font-black tracking-wider uppercase bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {media.type === 'image' ? 'FOTO' : 'VÍDEO'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 3. LIGHTBOX VIEWER */}
      {showLightbox && activeAlbumMedia.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* Topbar do Lightbox */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[102] bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white">
              <h3 className="font-bold text-sm tracking-tight">{activeAlbum?.title}</h3>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-0.5 tracking-wider">
                Mídia {lightboxIndex + 1} de {activeAlbumMedia.length} • {activeAlbumMedia[lightboxIndex].type === 'image' ? 'Foto' : 'Vídeo'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isManager && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const mediaId = activeAlbumMedia[lightboxIndex]?.id;
                    if (mediaId) {
                      setMediaToDelete(mediaId);
                      setShowLightbox(false);
                    }
                  }}
                  className="p-2.5 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 active:scale-95"
                  title="Excluir Mídia"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(activeAlbumMedia[lightboxIndex].url, `${activeAlbum?.title || 'galeria'}-${lightboxIndex + 1}.${activeAlbumMedia[lightboxIndex].url.split('.').pop()}`);
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 active:scale-95"
                title="Baixar em qualidade original"
              >
                <DownloadIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLightbox(false)}
                className="p-2.5 bg-white/10 hover:bg-red-500 text-white rounded-xl transition-all border border-white/10 active:scale-95"
                title="Fechar"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navegação de slides */}
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {activeAlbumMedia.length > 1 && (
              <>
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-4 p-3 bg-black/40 hover:bg-indigo-600/80 rounded-2xl text-white transition-all z-[102] active:scale-90 border border-white/5"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextMedia}
                  className="absolute right-4 p-3 bg-black/40 hover:bg-indigo-600/80 rounded-2xl text-white transition-all z-[102] active:scale-90 border border-white/5"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Renderização de Imagem ou Player de Vídeo */}
            <div className="max-h-[80vh] max-w-[90vw] flex items-center justify-center">
              {activeAlbumMedia[lightboxIndex].type === 'image' ? (
                <img
                  src={activeAlbumMedia[lightboxIndex].url}
                  alt={`Mídia ${lightboxIndex + 1}`}
                  className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl animate-fade-in"
                />
              ) : (
                <video
                  key={activeAlbumMedia[lightboxIndex].id}
                  src={activeAlbumMedia[lightboxIndex].url}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl animate-fade-in"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: ADICIONAR ÁLBUM */}
      {showAddAlbumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 border border-slate-100 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowAddAlbumModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-black text-slate-800 mb-2">Criar Novo Álbum</h2>
            <p className="text-xs font-medium text-slate-500 mb-6">Agrupe fotos e vídeos de eventos em uma pasta específica.</p>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Título do Álbum <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Festa Junina 2026"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Descrição (Opcional)
                </label>
                <textarea
                  placeholder="Ex: Fotos e vídeos do arraiá realizado no dia 12 de Junho na área comum."
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAddAlbumModal(false)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAlbum || !albumTitle.trim()}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md shadow-indigo-100/50 hover:shadow-indigo-100 transition-all"
                >
                  {isCreatingAlbum && <LoaderCircleIcon className="w-4 h-4" />}
                  <span>Criar Álbum</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: UPLOAD DE MÍDIAS (PROGRESS BAR) */}
      {showAddMediaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 border border-slate-100 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => !isUploading && setShowAddMediaModal(false)}
              className={`absolute top-4 right-4 text-slate-400 hover:text-slate-600 ${isUploading ? 'pointer-events-none opacity-30' : ''}`}
            >
              <XIcon className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-black text-slate-800 mb-2">Adicionar Fotos e Vídeos</h2>
            <p className="text-xs font-medium text-slate-500 mb-6">
              Envie fotos ou vídeos de alta qualidade. Você pode selecionar múltiplos arquivos simultaneamente.
            </p>

            <div className="space-y-6">
              {/* Seletor de Arquivos */}
              {!isUploading && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200/80 hover:border-indigo-500 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/10 transition-all group"
                >
                  <UploadIcon className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                  <span className="text-sm font-black text-slate-700">Clique para selecionar arquivos</span>
                  <span className="text-[10px] text-slate-400 mt-1">Imagens (PNG, JPG, WEBP) e Vídeos (MP4, WEBM)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                  />
                </div>
              )}

              {/* Fila de Uploads */}
              {uploadQueue.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Fila de envio ({uploadQueue.length} {uploadQueue.length === 1 ? 'arquivo' : 'arquivos'})
                  </h3>

                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1.5 no-scrollbar">
                    {uploadQueue.map(item => (
                      <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{(item.size / (1024 * 1024)).toFixed(2)} MB</p>
                          
                          {/* Barra de progresso */}
                          {item.status === 'uploading' && (
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-150"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0">
                          {item.status === 'pending' && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Aguardando</span>
                          )}
                          {item.status === 'uploading' && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full flex items-center gap-1">
                              <LoaderCircleIcon className="w-2.5 h-2.5" />
                              Enviando
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">OK</span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 px-2 py-1 rounded-full">Erro</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões do modal */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setUploadQueue([]);
                    setShowAddMediaModal(false);
                  }}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-30"
                >
                  Fechar
                </button>
                {uploadQueue.length > 0 && !isUploading && (
                  <button
                    type="button"
                    onClick={handleStartUpload}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md transition-all active:scale-95"
                  >
                    Iniciar Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALS DE CONFIRMAÇÃO (REUSADO ConfirmModal) */}
      <ConfirmModal
        isOpen={!!albumToDelete}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={handleConfirmDeleteAlbum}
        title="Excluir Álbum"
        message="Tem certeza que deseja excluir este álbum? Todas as fotos e vídeos associados a ele serão permanentemente excluídos."
        confirmText="Excluir Álbum"
        cancelText="Cancelar"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleConfirmDeleteMedia}
        title="Excluir Arquivo"
        message="Tem certeza que deseja remover este arquivo (foto/vídeo) da galeria? Esta ação não pode ser desfeita."
        confirmText="Remover Arquivo"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Gallery;
