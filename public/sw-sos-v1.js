// SOS UNIFIED SERVICE WORKER - VERSION 1.2
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
    console.log("[FCM SOS] Background message:", payload);
    const title = payload.data?.title || payload.notification?.title || "Porto Seguro 1";
    const body = payload.data?.body || payload.notification?.body || "";
    const tag = "gestao-ps1"; // Tag unificada para evitar duplicação

    return self.registration.showNotification(title, {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: tag,
        renotify: true,
        vibrate: [200, 100, 200],
        lang: 'pt-BR' // Dica para o OS usar português
    });
});

// PWA Cache
const CACHE_NAME = 'porto-seguro-sos-v1.2';
const assetsToCache = ['/logo.png', '/favicon.png'];

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

    // Estratégia Network First para o index.html e navegação
    // Isso garante que se houver internet, ele pegue a versão mais nova.
    // Se estiver offline ou a rede falhar, ele busca no cache.
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/index.html') || caches.match('/'))
        );
        return;
    }

    // Estratégia Cache First para assets estáticos
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
