import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";

import { auth, db } from "../services/firebase";
import { useData } from "../hooks/useData";
import { User } from "../types";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: Omit<User, "id" | "role">) => Promise<{ success: boolean; message?: string }>;
  loadingAuth: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const { addUser, addToast } = useData();

  // LISTENER DE AUTH DO FIREBASE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuário está logado no Firebase, buscar dados no Firestore
        try {
          // Tenta buscar pelo email (que é username@...)
          const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data() as User;
            setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
          } else {
            // Fallback: Tenta buscar pelo authUid se tiver salvo (menos provável no modelo atual mas bom ter)
            const qUid = query(collection(db, "users"), where("authUid", "==", firebaseUser.uid));
            const querySnapshotUid = await getDocs(qUid);
            if (!querySnapshotUid.empty) {
              const userData = querySnapshotUid.docs[0].data() as User;
              setCurrentUser({ ...userData, id: querySnapshotUid.docs[0].id });
            } else {
              console.error("Usuário autenticado mas não encontrado no Firestore.");
              setCurrentUser(null);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar usuário logado:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // TRANSFORMA username → email para Firebase
  const usernameToEmail = (username: string) =>
    `${username.toLowerCase()}@condominio-ps1.local`;

  // LOGIN -------------------------------------------------------
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const email = usernameToEmail(username);
      await signInWithEmailAndPassword(auth, email, password);
      // O onAuthStateChanged vai lidar com o setCurrentUser
      return true;
    } catch (err) {
      console.error("Erro no login:", err);
      return false;
    }
  };

  // LOGOUT --------------------------------------------------------
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
    // onAuthStateChanged lidará com o null
  };

  // REGISTRO ------------------------------------------------------
  const register = async (
    data: Omit<User, "id" | "role">
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const email = usernameToEmail(data.username);

      // 1) Cria no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const uid = userCredential.user.uid;

      // 2) Grava no Firestore
      const newUser = await addUser(data, uid);
      if (!newUser) {
        return { success: false, message: "Erro ao salvar dados no banco de dados." };
      }

      // O onAuthStateChanged vai atualizar o currentUser automaticamente
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao registrar:", err);

      let msg = "Erro ao cadastrar usuário.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Este nome de usuário já está em uso. Tente outro ou faça login.";
      } else if (err.code === 'auth/weak-password') {
        msg = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Nome de usuário inválido.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Erro de conexão. Verifique sua internet.";
      }

      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext deve estar dentro de AuthProvider");
  return ctx;
};
