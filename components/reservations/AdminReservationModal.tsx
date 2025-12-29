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
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-scale-in border border-white/50">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white/0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Nova Reserva</h3>
                        <p className="text-xs font-medium text-indigo-600 uppercase tracking-widest mt-1">Área Administrativa</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-5">
                        <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                Unidade / Casa <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all text-xl font-bold text-gray-900 placeholder-gray-300 shadow-inner"
                                placeholder="000"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                Responsável (Opcional)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <UsersIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Nome do morador..."
                                />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 pl-1 uppercase tracking-wider">
                                {userName ? 'Reserva será registrada para este nome' : 'Será salvo como "Admin (Casa X)"'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-4 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 flex justify-center items-center gap-2"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminReservationModal;
