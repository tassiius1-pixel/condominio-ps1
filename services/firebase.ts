import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
  authDomain: "manutencao-condominio-ps1.firebaseapp.com",
  projectId: "manutencao-condominio-ps1",
  storageBucket: "manutencao-condominio-ps1.appspot.com",
  messagingSenderId: "581878893480",
  appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d",
};

// Inicializa o app
export const app = initializeApp(firebaseConfig);

// Serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ===============================
// 🔥 FIREBASE CLOUD MESSAGING (FCM)
// ===============================

// Sua VAPID PUBLIC KEY para Web Push
export const vapidKey =
  "BIxR1esxfOwxt0n3Vv9nolz_KECfU5LcgYiqI2HXGbqPugs8Ydci34XI6HJVEnzkWvA0P974XwyIZ-b0pHglrCQ";

// O messaging só funciona se o navegador suportar push notifications
export const messagingPromise = isSupported().then((supported) =>
  supported ? getMessaging(app) : null
);
