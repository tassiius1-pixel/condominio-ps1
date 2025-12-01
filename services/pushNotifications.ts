import { messagingPromise, vapidKey } from "./firebase";

import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getToken } from "firebase/messaging";

export const requestPushPermission = async (userId: string) => {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            console.warn("❌ Permissão negada pelo usuário.");
            return null;
        }

        const messaging = await messagingPromise;
        if (!messaging) {
            console.warn("⚠️ Messaging não suportado neste dispositivo.");
            return null;
        }

        const token = await getToken(messaging, { vapidKey });

        if (!token) {
            console.warn("❌ Não foi possível gerar token.");
            return null;
        }

        // Salva no Firestore
        await setDoc(doc(db, "pushTokens", userId), {
            token,
            updatedAt: new Date().toISOString(),
        });

        return token;

    } catch (error) {
        console.error("Erro ao ativar notificações:", error);
        return null;
    }
};
