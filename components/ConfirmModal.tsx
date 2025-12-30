import React from 'react';
import { XIcon, AlertTriangleIcon } from './Icons';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void; // Optional for simple alerts
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
    alertOnly?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancelar',
    type = 'info',
    alertOnly = false
}) => {
    if (!isOpen) return null;

    const isDanger = type === 'danger';
    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in px-6">
            <div
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-scale-in border border-gray-100"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-8 text-center">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${isDanger ? 'bg-red-50 text-red-500' :
                            isSuccess ? 'bg-green-50 text-green-500' :
                                'bg-blue-50 text-blue-500'
                        } animate-pulse-slow`}>
                        <AlertTriangleIcon className="w-10 h-10" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">
                        {title}
                    </h3>
                    <p className="text-base text-gray-500 leading-relaxed font-semibold px-2">
                        {message}
                    </p>
                </div>

                <div className="bg-gray-50 px-8 py-6 flex gap-4">
                    {!alertOnly && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 text-sm font-black text-gray-500 bg-white border-2 border-gray-100 hover:bg-gray-50 active:scale-95 rounded-2xl transition-all shadow-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-4 text-sm font-black text-white rounded-2xl shadow-xl transition-all active:scale-90 hover:brightness-110 ${isDanger ? 'bg-red-500 shadow-red-100' :
                                isSuccess ? 'bg-green-500 shadow-green-100' :
                                    'bg-blue-600 shadow-blue-100'
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
