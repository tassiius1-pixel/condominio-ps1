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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Por favor, justifique a alteração de status desta pendência. Esta informação ficará visível para todos.
                </p>

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={justification}
                        onChange={(e) => {
                            setJustification(e.target.value);
                            setError('');
                        }}
                        rows={3}
                        className="w-full border rounded-md px-3 py-2 bg-white border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                        placeholder="Escreva a justificativa..."
                        autoFocus
                    />
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
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
