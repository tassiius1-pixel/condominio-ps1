import { messagingPromise, vapidKey } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

export type PushPermissionResult =
    | { status: 'granted'; token: string }
    | { status: 'denied' }
    | { status: 'blocked' }
    | { status: 'unsupported' }
    | { status: 'error' };

export const requestPushPermission = async (userId: string): Promise<PushPermissionResult> => {
    if (!("Notification" in window)) {
        console.warn("❌ Notificações não suportadas neste navegador.");
        return { status: 'unsupported' };
    }

    if (Notification.permission === "denied") {
        console.warn("❌ Permissão já bloqueada no navegador.");
        return { status: 'blocked' };
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            console.warn("❌ Permissão negada pelo usuário.");
            return { status: 'denied' };
        }

        const messaging = await messagingPromise;
        if (!messaging) {
            console.warn("⚠️ Messaging não suportado neste dispositivo.");
            return { status: 'unsupported' };
        }

        const token = await getToken(messaging, { vapidKey });

        if (!token) {
            console.warn("❌ Não foi possível gerar token.");
            return { status: 'error' };
        }

        // Salva token no documento do usuário para facilitar o envio direcionado
        await updateDoc(doc(db, "users", userId), {
            fcmToken: token,
            pushEnabled: true,
            lastTokenSync: new Date().toISOString(),
        });

        return { status: 'granted', token };

    } catch (error) {
        console.error("Erro ao ativar notificações:", error);
        return { status: 'error' };
    }
};

/**
 * Registra o listener para mensagens em foreground (app aberto)
 */
export const setupForegroundNotifications = async (onMessageReceived: (payload: any) => void) => {
    const messaging = await messagingPromise;
    if (!messaging) return;

    return onMessage(messaging, (payload) => {
        console.log("🔥 [FCM - FOREGROUND] Mensagem recebida:", payload);
        onMessageReceived(payload);
    });
};
