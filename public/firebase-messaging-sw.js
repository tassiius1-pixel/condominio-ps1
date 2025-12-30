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

messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Notificação recebida em background:", payload);
    const title = payload.notification?.title || payload.data?.title || "Notificação";
    const body = payload.notification?.body || payload.data?.body || "";
    const options = {
        body: body,
        icon: "/logo.png",
        badge: "/logo.png",
        data: payload.data || {}
    };
    return self.registration.showNotification(title, options);
});
