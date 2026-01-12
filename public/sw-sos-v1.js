// SOS UNIFIED SERVICE WORKER - VERSION 1.4 (STABILITY BUMP)
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

// Background Messages
messaging.onBackgroundMessage((payload) => {
    console.log("[FCM SOS] Background message received:", payload);
    const title = payload.data?.title || payload.notification?.title || "Porto Seguro 1";
    const body = payload.data?.body || payload.notification?.body || "Nova mensagem recebida";
    const tag = payload.data?.tag || "gestao-ps1";

    const options = {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: tag,
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: {
            url: payload.data?.url || '/',
            receivedAt: new Date().toISOString()
        }
    };

    return self.registration.showNotification(title, options);
});

// Click notification handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Se já tiver uma aba aberta, foca nela
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Se não tiver, abre uma nova
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// PWA Cache
const CACHE_NAME = 'porto-seguro-sos-v1.3'; // Bumped version
const assetsToCache = [
    '/',
    '/index.html',
    '/logo.png',
    '/favicon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(assetsToCache))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.map((k) => {
                        if (k !== CACHE_NAME) {
                            return caches.delete(k);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/index.html') || caches.match('/'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
