import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";

import { supabase } from "../services/supabase";
import { User } from "../types";

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

  // BUSCA PERFIL DO USUÁRIO NO SUPABASE
  const fetchUserProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (data && !error) {
        const formattedUser: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          cpf: data.cpf,
          houseNumber: Number(data.house_number),
          role: data.role.toLowerCase() as any, // Mapeia 'ADMIN'/'MORADOR' para 'admin'/'morador'
          email: data.email,
        };
        setCurrentUser(formattedUser);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Erro ao buscar perfil do usuário no Supabase:", error);
      setCurrentUser(null);
    }
  };

  // LISTENER DE AUTH DO SUPABASE
  useEffect(() => {
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id).finally(() => setLoadingAuth(false));
      } else {
        setCurrentUser(null);
        setLoadingAuth(false);
      }
    });

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // TRANSFORMA username → email válido para o Supabase (para evitar bloqueio de MX record e usar domínio real)
  const usernameToEmail = (username: string) =>
    `${username.toLowerCase().replace(/\s+/g, "")}.ps1@gmail.com`;

  // LOGIN -------------------------------------------------------
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const email = usernameToEmail(username);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Erro no login Supabase:", err);
      return false;
    }
  };

  // LOGOUT --------------------------------------------------------
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair Supabase:", err);
    }
  };

  // REGISTRO ------------------------------------------------------
  const register = async (
    data: Omit<User, "id" | "role">
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const email = usernameToEmail(data.username);
      const cleanCpf = data.cpf.replace(/\D/g, "");

      // 1) Cria no Supabase Auth (O Trigger handle_new_user cria o perfil no banco automaticamente)
      const { error } = await supabase.auth.signUp({
        email,
        password: data.password || cleanCpf,
        options: {
          data: {
            name: data.name,
            username: data.username,
            cpf: cleanCpf,
            houseNumber: String(data.houseNumber),
            phone: (data as any).phone || "",
            role: "MORADOR",
          },
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao registrar no Supabase:", err);

      let msg = "Erro ao cadastrar usuário.";
      if (err.message?.includes("already registered") || err.message?.includes("already exists")) {
        msg = "Este nome de usuário já está em uso. Tente outro ou faça login.";
      } else if (err.message?.includes("weak password") || err.message?.includes("should be at least")) {
        msg = "A senha é muito fraca. Use pelo menos 6 caracteres.";
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
