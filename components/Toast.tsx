import React, { useEffect } from 'react';
import { Toast as ToastType } from '../types';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from './Icons';

interface ToastProps {
    toast: ToastType;
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 4500);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
        error: <AlertTriangleIcon className="w-6 h-6 text-red-500" />,
        info: <InfoIcon className="w-6 h-6 text-blue-500" />,
    };

    return (
        <div
            className="
        pointer-events-auto 
        w-full max-w-sm 
        bg-white/95 
        backdrop-blur 
        shadow-xl 
        rounded-xl 
        ring-1 ring-black/10 
        flex items-center gap-3 
        p-4 animate-slide-in
      "
            style={{ animation: "slide-in 0.25s ease-out" }}
        >
            <div className="flex-shrink-0">{icons[toast.type]}</div>

            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 leading-snug">
                    {toast.message}
                </p>
            </div>

            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition"
            >
                <XIcon className="w-5 h-5" />
            </button>

            <style>
                {`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
            </style>
        </div>
    );
};

export default Toast;
