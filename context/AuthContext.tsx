import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";

import { auth } from "../services/firebase";
import { useData } from "../hooks/useData";
import { User } from "../types";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: Omit<User, "id" | "role">) => Promise<{ success: boolean; message?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("condo-currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const { users, addUser, addToast, loading } = useData();

  // SALVAR login no sessionStorage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem("condo-currentUser", JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem("condo-currentUser");
    }
  }, [currentUser]);

  // TRANSFORMA username → email para Firebase
  const usernameToEmail = (username: string) =>
    `${username.toLowerCase()}@condominio-ps1.local`;

  // LOGIN -------------------------------------------------------
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // 1) Espera o DataContext carregar usuários
      if (loading) {
        addToast("Carregando dados... aguarde 1 segundo e tente novamente.", "info");
        return false;
      }

      // 2) Autentica no Firebase
      const email = usernameToEmail(username);
      await signInWithEmailAndPassword(auth, email, password);

      // 3) Busca o usuário no Firestore
      const user = users.find((u) => u.username === username);

      if (!user) {
        addToast("Erro: usuário existe no Auth, mas não no cadastro.", "error");
        return false;
      }

      setCurrentUser(user);
      return true;
    } catch (err) {
      console.error("Erro no login:", err);
      addToast("Usuário ou senha incorretos.", "error");
      return false;
    }
  };

  // LOGOUT --------------------------------------------------------
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      setCurrentUser(null);
    }
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
      // Passamos o UID para evitar que o addUser tente criar no Auth novamente
      const newUser = await addUser(data, uid);
      if (!newUser) {
        return { success: false, message: "Erro ao salvar dados no banco de dados." };
      }

      setCurrentUser(newUser);
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
    <AuthContext.Provider value={{ currentUser, login, logout, register }}>
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
