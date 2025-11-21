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
  Reservation,
  Occurrence,
  Voting,
  Vote,
  Notice
} from "../types";

import { isValidCPF } from "../utils/cpfValidator";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  arrayUnion
} from "firebase/firestore";

import { db } from "../services/firebase";

interface DataContextType {
  users: User[];
  requests: Request[];
  notifications: Notification[];
  reservations: Reservation[];
  occurrences: Occurrence[];
  votings: Voting[];
  notices: Notice[];
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
  updateRequestStatus: (requestId: string, newStatus: Status, justification?: string, userId?: string) => void;

  addComment: (
    requestId: string,
    comment: Omit<Comment, "id" | "createdAt">
  ) => void;

  markAllNotificationsAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;

  addToast: (message: string, type: "success" | "error" | "info") => void;

  addReservation: (data: Omit<Reservation, 'id' | 'createdAt'>) => Promise<void>;
  cancelReservation: (reservationId: string) => Promise<void>;
  addOccurrence: (data: Omit<Occurrence, 'id' | 'createdAt' | 'status'>) => Promise<void>;

  addVoting: (voting: Omit<Voting, 'id' | 'votes' | 'createdAt'>) => Promise<void>;
  castVote: (votingId: string, optionIds: string[], currentUser: User) => Promise<void>;

  addNotice: (notice: Omit<Notice, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  toggleNoticeReaction: (noticeId: string, userId: string, type: 'like' | 'dislike') => Promise<void>;
}


export const DataContext = createContext<DataContextType | undefined>(
  undefined
);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [votings, setVotings] = useState<Voting[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [adminSeeded, setAdminSeeded] = useState(false);

  // LISTENERS EM TEMPO REAL
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

    const unsubReservations = onSnapshot(collection(db, "reservations"), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
      setReservations(loaded);
    });

    const unsubOccurrences = onSnapshot(collection(db, "occurrences"), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Occurrence))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOccurrences(loaded);
    });

    const unsubVotings = onSnapshot(collection(db, "votings"), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Voting))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVotings(loaded);
    });

    const unsubNotices = onSnapshot(collection(db, "notices"), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotices(loaded);
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubNotifications();
      unsubReservations();
      unsubOccurrences();
      unsubVotings();
      unsubNotices();
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

  // NOTIFICAÇÕES (MODELO CORRETO)
  const addNotification = async (
    notificationData: Omit<Notification, "id" | "createdAt" | "readBy">
  ) => {
    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      createdAt: new Date().toISOString(),
      readBy: [], // cada usuário marcará a sua
    });
  };

  // DELETAR NOTIFICAÇÃO (LIMPAR INDIVIDUAL)
  const deleteNotification = async (notificationId: string, showToast = true) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));


    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
      addToast("Erro ao remover notificação.", "error");
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const batchIds = notifications.map((n) => n.id);

      // exclui sem mostrar toast individual
      for (const id of batchIds) {
        await deleteNotification(id, false);
      }

      // mostra apenas UM toast
      addToast("Todas as notificações foram removidas.", "info");
    } catch (error) {
      console.error("Erro ao excluir todas:", error);
      addToast("Erro ao remover notificações.", "error");
    }
  };


  // FIND USER
  const findUserByCpf = (cpf: string) => users.find((u) => u.cpf === cpf);

  // ADD USER
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
      addToast("Nome de usuário já existe.", "error");
      return null;
    }

    if (
      users.some(
        (u) => u.houseNumber === userData.houseNumber && u.houseNumber !== 0
      )
    ) {
      addToast("Número da casa já cadastrado.", "error");
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

      addToast("Usuário cadastrado com sucesso!", "success");
      return newUser;
    } catch (e) {
      addToast("Erro ao cadastrar usuário.", "error");
      return null;
    }
  };

  // UPDATE ROLE
  const updateUserRole = (userId: string, role: Role) => {
    updateDoc(doc(db, "users", userId), { role })
      .then(() => addToast("Perfil atualizado.", "success"))
      .catch(() => addToast("Erro ao atualizar perfil.", "error"));
  };

  // DELETE USER — COMPLETO (FIRESTORE + AUTH)
  const deleteUser = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        addToast("Usuário não encontrado.", "error");
        return;
      }

      // 1. Remove do Firestore
      await deleteDoc(doc(db, "users", userId));

      // 2. Chama função do Supabase (AGORA COM A URL CERTA)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/delete-firebase-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            username: user.username,
          }),
        }
      );

      const data = await response.json();
      console.log("Supabase:", data);

      if (!response.ok) {
        addToast("Erro ao excluir usuário no Auth.", "error");
        return;
      }

      addToast("Usuário excluído completamente!", "success");
    } catch (error) {
      console.error("❌ Erro ao excluir usuário:", error);
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

    // cria notificação global
    await addNotification({
      message: `Nova pendência criada por ${author.name}`,
      userId: "all",
      requestId: "",
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

  const updateRequestStatus = (requestId: string, newStatus: Status, justification?: string, userId?: string) => {
    const updateData: any = { status: newStatus };

    // Se houver justificativa, adiciona como comentário especial
    if (justification && userId) {
      const request = requests.find(r => r.id === requestId);
      const author = users.find(u => u.id === userId);

      if (request && author) {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          authorId: author.id,
          authorName: author.name,
          text: justification,
          createdAt: new Date().toISOString(),
          type: 'status_change',
          newStatus: newStatus
        };
        updateData.comments = [...request.comments, newComment];
      }
    }

    updateDoc(doc(db, "requests", requestId), updateData).then(() =>
      addToast("Status atualizado.", "info")
    );
  };

  // RESERVATIONS
  const addReservation = async (reservation: Omit<Reservation, "id" | "createdAt">) => {
    await addDoc(collection(db, "reservations"), {
      ...reservation,
      createdAt: new Date().toISOString(),
    });
    addToast("Reserva realizada com sucesso!", "success");
  };

  const cancelReservation = async (reservationId: string) => {
    await deleteDoc(doc(db, "reservations", reservationId));
    addToast("Reserva cancelada.", "info");
  };

  // OCCURRENCES
  const addOccurrence = async (data: Omit<Occurrence, 'id' | 'createdAt' | 'status'>) => {
    await addDoc(collection(db, "occurrences"), {
      ...data,
      createdAt: new Date().toISOString(),
      status: 'Aberto',
    });
    addToast("Ocorrência registrada.", "success");
  };

  // COMMENTS
  const addComment = (
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

    updateDoc(doc(db, "requests", requestId), {
      comments: updatedComments,
    });
  };

  // MARCAR COMO LIDAS
  const markAllNotificationsAsRead = async (userId: string) => {
    const unread = notifications.filter((n) => !n.readBy?.includes(userId));

    for (const n of unread) {
      updateDoc(doc(db, "notifications", n.id), {
        readBy: [...(n.readBy || []), userId],
      });
    }
  };

  // --- VOTING ---
  const addVoting = async (voting: Omit<Voting, 'id' | 'votes' | 'createdAt'>) => {
    const newVoting = {
      ...voting,
      votes: [],
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'votings'), newVoting);

    // Criar notificação global para todos os usuários
    await addNotification({
      message: `Nova votação disponível: ${voting.title}`,
      userId: "all",
      requestId: "",
    });

    addToast('Votação criada com sucesso!', 'success');
  };

  const castVote = async (votingId: string, optionIds: string[], currentUser: User) => {
    if (!currentUser) return;

    const votingRef = doc(db, 'votings', votingId);
    const votingDoc = await getDoc(votingRef);

    if (!votingDoc.exists()) {
      addToast('Votação não encontrada.', 'error');
      return;
    }

    const votingData = votingDoc.data() as Voting;

    // Check if house already voted
    const hasVoted = votingData.votes.some(v => v.houseNumber === currentUser.houseNumber);
    if (hasVoted) {
      addToast('Sua unidade já registrou um voto nesta votação.', 'error');
      return;
    }

    const newVote: Vote = {
      userId: currentUser.id,
      userName: currentUser.name,
      houseNumber: currentUser.houseNumber,
      optionIds,
      timestamp: new Date().toISOString(),
    };

    await updateDoc(votingRef, {
      votes: arrayUnion(newVote)
    });
    addToast('Voto registrado com sucesso!', 'success');
  };

  // --- NOTICES ---
  const addNotice = async (notice: Omit<Notice, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => {
    const newNotice = {
      ...notice,
      likes: [],
      dislikes: [],
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'notices'), newNotice);

    // Notify all users
    await addNotification({
      message: `Novo aviso publicado: ${notice.title}`,
      userId: "all",
      requestId: "",
    });

    addToast('Aviso publicado com sucesso!', 'success');
  };

  const deleteNotice = async (noticeId: string) => {
    await deleteDoc(doc(db, 'notices', noticeId));
    addToast('Aviso removido.', 'info');
  };

  const toggleNoticeReaction = async (noticeId: string, userId: string, type: 'like' | 'dislike') => {
    const noticeRef = doc(db, 'notices', noticeId);
    const notice = notices.find(n => n.id === noticeId);
    if (!notice) return;

    const isLiked = notice.likes.includes(userId);
    const isDisliked = notice.dislikes.includes(userId);

    let newLikes = [...notice.likes];
    let newDislikes = [...notice.dislikes];

    if (type === 'like') {
      if (isLiked) {
        newLikes = newLikes.filter(id => id !== userId); // Remove like
      } else {
        newLikes.push(userId); // Add like
        newDislikes = newDislikes.filter(id => id !== userId); // Remove dislike if exists
      }
    } else {
      if (isDisliked) {
        newDislikes = newDislikes.filter(id => id !== userId); // Remove dislike
      } else {
        newDislikes.push(userId); // Add dislike
        newLikes = newLikes.filter(id => id !== userId); // Remove like if exists
      }
    }

    await updateDoc(noticeRef, {
      likes: newLikes,
      dislikes: newDislikes
    });
  };

  // PROVIDER
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
        addComment,
        markAllNotificationsAsRead,
        deleteNotification,
        addToast,
        reservations,
        occurrences,
        votings,
        addReservation,
        cancelReservation,
        addOccurrence,
        addVoting,
        castVote,
        notices,
        addNotice,
        deleteNotice,
        toggleNoticeReaction,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
