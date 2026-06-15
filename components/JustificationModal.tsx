import React, { useState } from 'react';
import { XIcon, CheckCircleIcon } from './Icons';
 
interface JustificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (justification: string) => void;
    title?: string;
}
 
const JustificationModal: React.FC<JustificationModalProps> = ({ isOpen, onClose, onConfirm, title = "Justificativa Necessária" }) => {
    const [justification, setJustification] = useState('');
    const [error, setError] = useState('');
 
    if (!isOpen) return null;
 
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!justification.trim()) {
            setError('A justificativa é obrigatória.');
            return;
        }
        onConfirm(justification);
        setJustification('');
        setError('');
    };
 
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[120] flex justify-center items-start sm:items-center p-4 pt-12 sm:pt-4 overflow-y-auto animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50 my-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-transparent">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">{title}</h3>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Ação Requerida</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"
                        aria-label="Fechar"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                        Por favor, justifique a alteração de status desta pendência. Esta informação ficará visível para todos.
                    </p>

                    <div>
                        <textarea
                            value={justification}
                            onChange={(e) => {
                                  setJustification(e.target.value);
                                  setError('');
                              }}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400 text-sm shadow-sm resize-none"
                            placeholder="Escreva a justificativa..."
                            autoFocus
                        />
                        {error && <p className="mt-1.5 px-2 text-[10px] font-bold text-red-500">{error}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-650 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-colors active:scale-95 shadow-sm text-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 flex justify-center items-center gap-2 active:scale-95"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JustificationModal;
