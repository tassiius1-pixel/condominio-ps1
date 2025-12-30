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

export const requestPushPermission = async (
    userId: string,
    customRegistration?: ServiceWorkerRegistration
): Promise<PushPermissionResult> => {
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

        // --- MELHORIA SOS: Aguarda o Service Worker de forma agressiva ---
        let registration = customRegistration;
        if (!registration) {
            console.log("⏳ Buscando Service Worker pronto...");
            registration = await navigator.serviceWorker.ready;
        }

        // Aguarda até o worker estar 'active' (Essencial para PWA/Mobile)
        let attempts = 0;
        while (!registration.active && attempts < 10) {
            console.log(`⏳ Aguardando registro ativo (Tentativa ${attempts + 1})...`);
            await new Promise(r => setTimeout(r, 800));
            attempts++;
        }

        if (!registration.active) {
            console.error("❌ Erro: Service Worker não ativou a tempo.");
            alert("Erro: O motor do app (Service Worker) demorou para iniciar. Tente clicar no sino novamente.");
            return { status: 'error' };
        }

        console.log("✅ Usando Service Worker Ativo:", registration.scope);

        if (!registration.pushManager) {
            console.error("❌ Erro: pushManager não disponível.");
            return { status: 'unsupported' };
        }

        // --- TENTATIVA DE TOKEN COM RETRY ---
        console.log("⏳ Solicitando FCM Token...");
        let token = "";
        try {
            token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: registration
            });
        } catch (tokenErr: any) {
            console.warn("⚠️ Falha na primeira tentativa de token:", tokenErr.message);
            // Fallback: Tenta sem a registration explícita (às vezes o Firebase prefere o autodetect)
            await new Promise(r => setTimeout(r, 1000));
            token = await getToken(messaging, { vapidKey });
        }

        if (!token) {
            console.warn("❌ Não foi possível gerar token (vazio).");
            return { status: 'error' };
        }

        console.log("✅ FCM Token gerado com sucesso!");

        await updateDoc(doc(db, "users", userId), {
            fcmToken: token,
            pushEnabled: true,
            lastTokenSync: new Date().toISOString(),
        });

        return { status: 'granted', token };

    } catch (error: any) {
        console.error("❌ Erro CRÍTICO no requestPushPermission:", error);
        // Se o erro for "requires a service worker", damos uma dica pro usuário
        if (error.message?.includes("service worker")) {
            alert("O celular ainda está configurando o app. Por favor, feche o app, abra de novo e clique no sino.");
        } else {
            alert("Erro no Token: " + (error.message || "Desconhecido"));
        }
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
