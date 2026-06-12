import { messagingPromise, vapidKey } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { supabase } from "./supabase";

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
        // ... já verificado no Header, mas garantimos aqui
        let permission: NotificationPermission = Notification.permission;

        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
            return { status: 'denied' };
        }

        const messaging = await messagingPromise;
        if (!messaging) return { status: 'unsupported' };

        // --- MELHORIA SOS: PWA Controller Sync ---
        let registration = customRegistration;
        if (!registration) {
            registration = await navigator.serviceWorker.getRegistration('/');
            if (!registration) registration = await navigator.serviceWorker.ready;
        }

        // Aguarda ativação
        let attempts = 0;
        while (!registration.active && attempts < 15) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (!registration.active) return { status: 'error' };

        // Fallback para quando o SW está ativo mas não controla a página
        if (!navigator.serviceWorker.controller) {
            console.warn("⚠️ Página sem controller. Isso pode falhar no PWA.");
            // Não bloqueamos, mas avisamos no log
        }

        console.log("⏳ Solicitando Token FCM no escopo:", registration.scope);

        let token = "";
        try {
            token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: registration
            });
        } catch (tokenErr: any) {
            console.error("❌ Erro na tentativa primária de token:", tokenErr.message);
            // Se falhou por falta de SW, tentamos o método "root" pronto
            if (tokenErr.message?.includes("service worker")) {
                const readyReg = await navigator.serviceWorker.ready;
                token = await getToken(messaging, {
                    vapidKey,
                    serviceWorkerRegistration: readyReg
                });
            } else {
                throw tokenErr; // Re-joga se for outro erro
            }
        }

        if (!token) return { status: 'error' };

        console.log("✅ Token obtido:", token.substring(0, 10) + "...");
        const { error: tokenError } = await supabase
            .from("user_push_tokens")
            .upsert({ user_id: userId, token: token }, { onConflict: "token" });

        if (tokenError) {
            console.error("❌ Erro ao salvar token no Supabase:", tokenError.message);
        } else {
            console.log("💾 Token sincronizado no Supabase para usuário:", userId);
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .update({ push_enabled: true })
            .eq("id", userId);

        if (profileError) {
            console.error("❌ Erro ao atualizar push_enabled no perfil:", profileError.message);
        }

        return { status: 'granted', token };

    } catch (error: any) {
        console.error("❌ ERRO FINAL NO TOKEN:", error);
        // Error is logged, caller can handle UI if needed
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
