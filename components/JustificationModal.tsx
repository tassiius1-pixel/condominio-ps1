import React, { useState } from 'react';

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[120] flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50">
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white/0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Ação Requerida</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <p className="text-sm text-gray-500 leading-relaxed font-semibold">
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
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400 shadow-inner resize-none"
                            placeholder="Escreva a justificativa..."
                            autoFocus
                        />
                        {error && <p className="mt-1.5 px-2 text-[11px] font-bold text-red-500">{error}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-4 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JustificationModal;
