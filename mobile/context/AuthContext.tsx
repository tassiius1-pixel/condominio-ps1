import React, {
    createContext,
    useState,
    useEffect,
    ReactNode,
    useContext,
} from "react";
import { auth, db } from "../services/firebase";
import { User } from "../types";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

interface AuthContextType {
    currentUser: User | null;
    loadingAuth: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // LISTENER DE AUTH DO FIREBASE
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserProfile(firebaseUser);
            } else {
                setCurrentUser(null);
                setLoadingAuth(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
        try {
            // Tenta buscar pelo email
            const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data() as User;
                setCurrentUser({ ...userData, id: querySnapshot.docs[0].id });
            } else {
                // Fallback: Tenta buscar pelo authUid
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
        } finally {
            setLoadingAuth(false);
        }
    };

    // HELPER: username -> email
    const usernameToEmail = (username: string) =>
        `${username.toLowerCase()}@condominio-ps1.local`;

    // LOGIN
    const login = async (username: string, password: string) => {
        try {
            const email = usernameToEmail(username);
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err: any) {
            console.error("Erro no login:", err);
            let msg = "Erro desconhecido.";
            if (err.code === "auth/invalid-email") msg = "Usuário inválido.";
            if (err.code === "auth/user-not-found") msg = "Usuário não encontrado.";
            if (err.code === "auth/wrong-password") msg = "Senha incorreta.";
            if (err.code === "auth/invalid-credential") msg = "Credenciais inválidas.";
            return { success: false, message: msg };
        }
    };

    // LOGOUT
    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, loadingAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
    return context;
};
