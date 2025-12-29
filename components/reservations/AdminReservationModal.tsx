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
            // Se o nome estiver vazio, usa um padrão
            const finalName = userName.trim() || `Admin (Casa ${number})`;
            onConfirm(number, finalName);
            // Reset
            setHouseNumber('');
            setUserName('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Reservar para Morador</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-200"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Número da Casa/Unidade <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg font-medium placeholder-gray-300"
                                placeholder="Ex: 101"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Nome do Responsável (Opcional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UsersIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Se deixado em branco, será salvo como "Admin (Casa X)".</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            Confirmar Reserva
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminReservationModal;
