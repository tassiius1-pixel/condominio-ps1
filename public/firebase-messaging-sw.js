// Importa Firebase 10
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
    authDomain: "manutencao-condominio-ps1.firebaseapp.com",
    projectId: "manutencao-condominio-ps1",
    storageBucket: "manutencao-condominio-ps1.appspot.com",
    messagingSenderId: "581878893480",
    appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d"
});

const messaging = firebase.messaging();

// Handler de background
messaging.onBackgroundMessage((payload) => {
    console.log("[FCM - BACKGROUND] Recebido:", payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || "Nova Notificação";
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || "",
        icon: "/logo.png",
        badge: "/logo.png",
        tag: 'porto-seguro-alert',
        vibrate: [200, 100, 200], // Vibração para Android
        data: {
            url: payload.data?.url || "/"
        }
    };

    // Tenta atualizar o ícone (bolinha)
    if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(1).catch(() => { });
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
