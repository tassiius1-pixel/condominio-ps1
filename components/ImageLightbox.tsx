import React, { useEffect } from 'react';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 z-[102]">
        <XIcon className="w-8 h-8" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
            <>
                <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 z-[102]">
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 z-[102]">
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            </>
        )}
        <img
          src={images[currentIndex]}
          alt={`Visualização ${currentIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
         {images.length > 1 && (
            <div className="absolute bottom-4 text-white text-lg bg-black bg-opacity-50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {images.length}
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
