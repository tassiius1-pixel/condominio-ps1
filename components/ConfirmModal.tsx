import React from 'react';
import { XIcon, AlertTriangleIcon } from './Icons';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6 text-center">
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                        } animate-bounce-slow`}>
                        <AlertTriangleIcon className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                        {message}
                    </p>
                </div>

                <div className="bg-gray-50/50 px-6 py-4 flex gap-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:-translate-y-0.5 ${isDanger
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
