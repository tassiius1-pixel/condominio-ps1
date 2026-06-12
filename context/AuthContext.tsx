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
    console.log("🔍 [AuthContext] fetchUserProfile iniciando para UID:", uid);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) {
        console.error("❌ [AuthContext] Erro ao buscar perfil no Supabase:", error);
        setCurrentUser(null);
        return;
      }

      if (data) {
        console.log("🔍 [AuthContext] Perfil encontrado no banco:", data);
        const formattedUser: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          cpf: data.cpf,
          houseNumber: Number(data.house_number),
          role: data.role.toLowerCase() as any, // Mapeia 'ADMIN'/'MORADOR' para 'admin'/'morador'
          email: data.email,
        };
        console.log("🔍 [AuthContext] formattedUser gerado:", formattedUser);
        setCurrentUser(formattedUser);
      } else {
        console.warn("⚠️ [AuthContext] Perfil retornado vazio (null) para UID:", uid);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("❌ [AuthContext] Erro fatal ao buscar perfil:", error);
      setCurrentUser(null);
    }
  };

  // LISTENER DE AUTH DO SUPABASE
  useEffect(() => {
    console.log("🔌 [AuthContext] Inicializando listener do Auth...");
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔌 [AuthContext] getSession resolvido. Sessão:", session?.user?.id ? "Sim" : "Não");
      if (session?.user) {
        fetchUserProfile(session.user.id).finally(() => setLoadingAuth(false));
      } else {
        setCurrentUser(null);
        setLoadingAuth(false);
      }
    });

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔌 [AuthContext] onAuthStateChange disparado! Evento: ${event}, User UID: ${session?.user?.id || 'Nenhum'}`);
      setTimeout(async () => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          console.log("🔌 [AuthContext] Sem usuário na sessão, definindo currentUser para null.");
          setCurrentUser(null);
        }
        setLoadingAuth(false);
      }, 0);
    });

    return () => {
      console.log("🔌 [AuthContext] Desinscrevendo listener do Auth...");
      subscription.unsubscribe();
    };
  }, []);

  // TRANSFORMA username → email válido para o Supabase (para evitar domínio inválido)
  const usernameToEmail = (username: string) =>
    `${username.toLowerCase().replace(/\s+/g, "")}.ps1@gmail.com`;

  // LOGIN -------------------------------------------------------
  const login = async (username: string, password: string): Promise<boolean> => {
    console.log(`⏳ [AuthContext] Iniciando login para usuário '${username}'...`);
    try {
      const email = usernameToEmail(username);
      console.log(`⏳ [AuthContext] Email gerado: ${email}`);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ [AuthContext] signInWithPassword retornou erro:", error.message);
        throw error;
      }
      console.log("✅ [AuthContext] signInWithPassword resolvido com sucesso!");
      return true;
    } catch (err) {
      console.error("❌ [AuthContext] Erro capturado no login:", err);
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
