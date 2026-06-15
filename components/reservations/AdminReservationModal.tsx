import React, { useState } from 'react';
import { XIcon, UsersIcon, CheckCircleIcon } from '../Icons';

interface AdminReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (houseNumber: number, userName: string) => void;
}

const AdminReservationModal: React.FC<AdminReservationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [houseNumber, setHouseNumber] = useState('');
    const [userName, setUserName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const number = parseInt(houseNumber);
        if (!isNaN(number)) {
            const finalName = userName.trim() || `Admin (Casa ${number})`;
            onConfirm(number, finalName);
            setHouseNumber('');
            setUserName('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-transparent">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Nova Reserva</h3>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Área Administrativa</p>
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
                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">
                                Unidade / Casa <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all text-lg font-bold text-gray-900 placeholder-gray-300 shadow-sm"
                                placeholder="000"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 pl-1">
                                Responsável (Opcional)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <UsersIcon className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400 text-sm shadow-sm"
                                    placeholder="Nome do morador..."
                                />
                            </div>
                            <p className="text-[9px] font-bold text-gray-400 mt-1.5 pl-1 uppercase tracking-wider">
                                {userName ? 'Reserva será registrada para este nome' : 'Será salvo como "Admin (Casa X)"'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-600 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-colors active:scale-95 shadow-sm text-center"
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

export default AdminReservationModal;
