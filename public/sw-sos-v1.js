// SOS UNIFIED SERVICE WORKER - VERSION 1.1
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
    const tag = payload.data?.tag || "porto-seguro-push";

    return self.registration.showNotification(title, {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "porto-seguro-push",
        renotify: true,
        vibrate: [200, 100, 200]
    });
});

// PWA Cache
const CACHE_NAME = 'porto-seguro-sos-v1';
const urlsToCache = ['/', '/index.html', '/logo.png'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});
