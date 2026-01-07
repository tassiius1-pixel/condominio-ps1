import React, { useState, useEffect } from 'react';
import { BellIcon, XIcon } from './Icons';
import { requestPushPermission } from '../services/pushNotifications';
import { useAuth } from '../hooks/useAuth';

const NotificationPrompt: React.FC = () => {
    const { currentUser } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        // Verifica se a permissão já foi dada ou negada
        if ("Notification" in window) {
            if (Notification.permission === 'default') {
                setShowPrompt(true);
            }
        }
    }, [currentUser]);

    const handleEnable = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const result = await requestPushPermission(currentUser.id);
            if (result.status === 'granted') {
                setShowPrompt(false);
            }
        } catch (error) {
            console.error("Erro ao solicitar permissão:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed top-24 left-4 right-4 z-[90] animate-bounce-in">
            <div className="bg-indigo-600 rounded-3xl shadow-xl p-4 flex items-center justify-between gap-4 border border-indigo-500">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-2xl text-white">
                        <BellIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-tight">Ativar Notificações</h4>
                        <p className="text-indigo-100 text-xs font-medium">Não perca os alertas de SOS e recados importantes.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEnable}
                        disabled={loading}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Ativando...' : 'Ativar'}
                    </button>
                    <button
                        onClick={() => setShowPrompt(false)}
                        className="text-indigo-200 p-2 hover:text-white transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPrompt;
