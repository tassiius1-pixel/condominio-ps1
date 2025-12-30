// Importa Firebase 10 (mais estável e compatível com as versões recentes)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Config Firebase (MESMO DO FIREBASE.TS)
firebase.initializeApp({
    apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
    authDomain: "manutencao-condominio-ps1.firebaseapp.com",
    projectId: "manutencao-condominio-ps1",
    storageBucket: "manutencao-condominio-ps1.appspot.com",
    messagingSenderId: "581878893480",
    appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d"
});

// Inicializa Messaging
const messaging = firebase.messaging();

// Quando chegar notificação em background
messaging.onBackgroundMessage((payload) => {
    console.log("[FCM - BACKGROUND] Recebido:", payload);

    // Prioriza notification, depois data, depois fallback
    const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
    const body = payload.notification?.body || payload.data?.body || "";

    const notificationOptions = {
        body: body,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "gestao-ps1",
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
            url: payload.data?.url || "https://condominio-ps1.vercel.app/",
            ...payload.data
        }
    };

    return self.registration.showNotification(title, notificationOptions);
});

// ===============================
// CACHE / PWA (Offline Support)
// ===============================
// ===============================
// CACHE / PWA (Offline Support)
// ===============================
const CACHE_NAME = 'porto-seguro-v3'; // Bump version for SOS Sync
const urlsToCache = [
    '/',
    '/index.html',
    '/logo.png'
];

// Install SW
self.addEventListener('install', (event) => {
    console.log('[SW] Install: Forçando ativação imediata...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate the SW
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate: Limpando caches antigos e reivindicando clientes...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        Promise.all([
            // Limpa caches antigos
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheWhitelist.includes(cacheName)) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Reivindica os clientes imediatamente (necessário para PWA)
            self.clients.claim()
        ])
    );
});

// Listen for requests
self.addEventListener('fetch', (event) => {
    // Strategy: Network First for HTML (navigation), Cache First for assets
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    }
});

// Activate the SW
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
