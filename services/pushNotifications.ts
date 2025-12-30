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
        console.log("📍 [Push] Status da permissão:", permission);

        if (permission !== "granted") {
            console.warn("❌ Permissão negada pelo usuário.");
            return { status: 'denied' };
        }

        const messaging = await messagingPromise;
        if (!messaging) {
            console.warn("⚠️ Messaging não suportado neste dispositivo.");
            return { status: 'unsupported' };
        }

        // --- MELHORIA: Aguarda o Service Worker explicitamente ---
        console.log("⏳ Aguardando Service Worker ready...");
        let registration;
        try {
            registration = await navigator.serviceWorker.ready;
            console.log("✅ Service Worker pronto:", registration.scope);

            // Força o SW a estar "ativo" antes de pegar o token
            if (registration.installing || registration.waiting) {
                console.log("⏳ SW em instalação/espera, aguardando ativação...");
                await new Promise((resolve) => {
                    const worker = registration.installing || registration.waiting;
                    if (worker) {
                        worker.addEventListener('statechange', (e: any) => {
                            if (e.target.state === 'activated') resolve(true);
                        });
                    } else resolve(true);
                });
            }
        } catch (swErr) {
            console.error("❌ Erro ao aguardar Service Worker:", swErr);
            return { status: 'error' };
        }

        if (!registration.pushManager) {
            console.error("❌ Erro: pushManager não disponível no Service Worker.");
            return { status: 'unsupported' };
        }

        console.log("⏳ Solicitando FCM Token...");
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
        });
        // --------------------------------------------------------

        if (!token) {
            console.warn("❌ Não foi possível gerar token (vazio).");
            return { status: 'error' };
        }

        console.log("✅ FCM Token gerado com sucesso!");

        // Salva token no documento do usuário para facilitar o envio direcionado
        await updateDoc(doc(db, "users", userId), {
            fcmToken: token,
            pushEnabled: true,
            lastTokenSync: new Date().toISOString(),
        });

        return { status: 'granted', token };

    } catch (error: any) {
        console.error("❌ Erro CRÍTICO no requestPushPermission:", error);
        alert("Erro no Token: " + (error.message || "Desconhecido"));
        return { status: 'error' };
    }
};

/**
 * Envia uma notificação push via Supabase Edge Function
 */
export const sendPushNotification = async (
    targetUserId: string | "all",
    title: string,
    body: string,
    data: any = {}
) => {
    try {
        // Forçamos o uso da URL correta se a variável estiver ausente
        const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
            "https://hjrhipbzuzkxrzlffwlb.supabase.co/functions/v1";

        const response = await fetch(
            `${functionsUrl}/send-push-notification`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
                },
                body: JSON.stringify({
                    userId: targetUserId,
                    title,
                    body,
                    data: { ...data, url: window.location.origin },
                }),
            }
        );
        const result = await response.json();
        console.log("✅ Servidor respondeu:", result);
        return result;
    } catch (error) {
        console.error("❌ Erro ao disparar Push Notification:", error);
        return { error };
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
