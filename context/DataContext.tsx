import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import React, { createContext, useState, useEffect, ReactNode } from "react";

import {
  User,
  Request,
  Role,
  Status,
  Comment,
  Notification,
  Toast,
} from "../types";

import { isValidCPF } from "../utils/cpfValidator";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../services/firebase";

interface DataContextType {
  users: User[];
  requests: Request[];
  notifications: Notification[];
  toasts: Toast[];
  loading: boolean;

  removeToast: (id: string) => void;
  findUserByCpf: (cpf: string) => User | undefined;

  addUser: (user: Omit<User, "id" | "role">) => Promise<User | null>;
  updateUserRole: (userId: string, role: Role) => void;
  deleteUser: (userId: string) => void;

  addRequest: (
    request: Omit<
      Request,
      "id" | "authorName" | "createdAt" | "comments" | "status"
    >
  ) => void;

  updateRequest: (updatedRequest: Request) => void;
  deleteRequest: (requestId: string) => void;

  updateRequestStatus: (requestId: string, newStatus: Status) => void;

  updateRequestStatusWithComment: (
    requestId: string,
    oldStatus: Status,
    newStatus: Status,
    justification: string,
    currentUser: User
  ) => void;

  addComment: (
    requestId: string,
    comment: Omit<Comment, "id" | "createdAt">
  ) => void;

  markAllNotificationsAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;
  deleteAllNotifications: () => void;

  addToast: (message: string, type: "success" | "error" | "info") => void;
}

export const DataContext = createContext<DataContextType | undefined>(
  undefined
);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [adminSeeded, setAdminSeeded] = useState(false);

  // LISTENERS
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const loadedUsers: User[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<User, "id">),
      }));

      setUsers(loadedUsers);
      setLoading(false);

      if (!adminSeeded && loadedUsers.length === 0) {
        seedAdminUser();
      }
    });

    const unsubRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      const loadedRequests: Request[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Request, "id">),
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

      setRequests(loadedRequests);
    });

    const unsubNotifications = onSnapshot(
      collection(db, "notifications"),
      (snapshot) => {
        const loaded: Notification[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Notification, "id">),
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

        setNotifications(loaded);
      }
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubNotifications();
    };
  }, [adminSeeded]);

  // SEED ADMIN
  const seedAdminUser = async () => {
    try {
      const email = "admin@condominio-ps1.local";
      const password = "P0lyc@rt";

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await addDoc(collection(db, "users"), {
        id: cred.user.uid,
        name: "Admin Master",
        username: "admin",
        cpf: "000.000.000-00",
        houseNumber: 0,
        password,
        role: Role.ADMIN,
        email,
      });

      setAdminSeeded(true);
      addToast("Usuário admin criado automaticamente.", "info");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setAdminSeeded(true);
      } else {
        addToast("Erro ao criar admin.", "error");
      }
    }
  };

  // TOASTS
  const addToast = (message: string, type: "success" | "error" | "info") => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}`, message, type },
    ]);
  };

  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // NOTIFICAÇÕES
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      addToast("Erro ao remover notificação.", "error");
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const ids = notifications.map((n) => n.id);
      for (const id of ids) await deleteNotification(id);
      addToast("Todas notificações removidas.", "info");
    } catch {
      addToast("Erro ao remover notificações.", "error");
    }
  };

  // CRUD USERS
  const findUserByCpf = (cpf: string) => users.find((u) => u.cpf === cpf);

  const addUser = async (
    userData: Omit<User, "id" | "role">
  ): Promise<User | null> => {
    if (!isValidCPF(userData.cpf)) {
      addToast("CPF inválido.", "error");
      return null;
    }

    if (users.some((u) => u.cpf === userData.cpf)) {
      addToast("CPF já cadastrado.", "error");
      return null;
    }

    if (users.some((u) => u.username === userData.username)) {
      addToast("Usuário já existe.", "error");
      return null;
    }

    try {
      const email = `${userData.username.toLowerCase()}@condominio-ps1.local`;

      const docRef = await addDoc(collection(db, "users"), {
        ...userData,
        role: Role.MORADOR,
        email,
      });

      const newUser: User = {
        ...userData,
        id: docRef.id,
        role: Role.MORADOR,
        email,
      };

      addToast("Usuário cadastrado.", "success");
      return newUser;
    } catch {
      addToast("Erro ao cadastrar usuário.", "error");
      return null;
    }
  };

  const updateUserRole = (userId: string, role: Role) => {
    updateDoc(doc(db, "users", userId), { role })
      .then(() => addToast("Perfil atualizado.", "success"))
      .catch(() => addToast("Erro ao atualizar perfil.", "error"));
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      addToast("Usuário excluído.", "success");
    } catch {
      addToast("Erro ao excluir usuário.", "error");
    }
  };

  // REQUESTS
  const addRequest = async (
    requestData: Omit<
      Request,
      "id" | "authorName" | "createdAt" | "comments" | "status"
    >
  ) => {
    const author = users.find((u) => u.id === requestData.authorId);
    if (!author) return;

    const newRequest: Omit<Request, "id"> = {
      ...requestData,
      authorName: author.name,
      createdAt: new Date().toISOString(),
      comments: [],
      status: Status.PENDENTE,
    };

    await addDoc(collection(db, "requests"), newRequest);

    await addDoc(collection(db, "notifications"), {
      userId: "all",
      requestId: "",
      message: `Nova pendência criada por ${author.name}`,
      createdAt: new Date().toISOString(),
      readBy: [],
    });

    addToast("Pendência registrada.", "success");
  };

  const updateRequest = (updatedRequest: Request) => {
    const { id, ...data } = updatedRequest;

    updateDoc(doc(db, "requests", id), data).then(() =>
      addToast("Pendência atualizada.", "success")
    );
  };

  const deleteRequest = (requestId: string) => {
    deleteDoc(doc(db, "requests", requestId)).then(() =>
      addToast("Pendência excluída.", "success")
    );
  };

  // ❗ FUNÇÃO ANTIGA (mantida)
  const updateRequestStatus = (requestId: string, newStatus: Status) => {
    updateDoc(doc(db, "requests", requestId), { status: newStatus }).then(() =>
      addToast("Status atualizado.", "info")
    );
  };

  // ✅ FUNÇÃO NOVA — COMENTÁRIO + TIMELINE PREMIUM
  const updateRequestStatusWithComment = async (
    requestId: string,
    oldStatus: Status,
    newStatus: Status,
    justification: string,
    currentUser: User
  ) => {
    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        text: justification,
        createdAt: new Date().toISOString(),
        type: "status-change",
        fromStatus: oldStatus,
        toStatus: newStatus,
      };

      const updatedComments = [...request.comments, newComment];

      await updateDoc(doc(db, "requests", requestId), {
        status: newStatus,
        comments: updatedComments,
      });

      addToast("Status atualizado com justificativa.", "success");
    } catch {
      addToast("Erro ao atualizar status.", "error");
    }
  };

  // COMMENTS
 // COMMENTS
const addComment = async (
  requestId: string,
  commentData: Omit<Comment, "id" | "createdAt">
) => {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return;

  const newComment: Comment = {
    ...commentData,
    id: `comment-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const updatedComments = [...request.comments, newComment];

  await updateDoc(doc(db, "requests", requestId), {
    comments: updatedComments,
  });
};



  // MARCAR NOTIFICAÇÕES COMO LIDAS
  const markAllNotificationsAsRead = async (userId: string) => {
    const unread = notifications.filter((n) => !n.readBy?.includes(userId));

    for (const n of unread) {
      updateDoc(doc(db, "notifications", n.id), {
        readBy: [...n.readBy, userId],
      });
    }
  };

  return (
    <DataContext.Provider
      value={{
        users,
        requests,
        notifications,
        toasts,
        loading,

        removeToast,
        findUserByCpf,
        addUser,
        updateUserRole,
        deleteUser,
        addRequest,

        updateRequest,
        deleteRequest,

        updateRequestStatus,
        updateRequestStatusWithComment,

        addComment,
        markAllNotificationsAsRead,
        addToast,
        deleteNotification,
        deleteAllNotifications,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
