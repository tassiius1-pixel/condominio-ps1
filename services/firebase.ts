import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
  authDomain: "manutencao-condominio-ps1.firebaseapp.com",
  projectId: "manutencao-condominio-ps1",
  storageBucket: "manutencao-condominio-ps1.firebasestorage.app",
  messagingSenderId: "581878893480",
  appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
