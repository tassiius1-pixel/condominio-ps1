// Importa Firebase 9 em modo compat (obrigatório para SW)
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

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

    const notificationTitle = payload.notification?.title || "Nova Notificação";
    const notificationOptions = {
        body: payload.notification?.body || "",
        icon: "/logo.png"
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// ===============================
// CACHE / PWA (Offline Support)
// ===============================
const CACHE_NAME = 'porto-seguro-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/logo.png'
];

// Install SW
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Listen for requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
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
