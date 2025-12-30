import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  arrayUnion,
  writeBatch
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  User,
  Request,
  Role,
  Status,
  Notification,
  Toast,
  Reservation,
  Occurrence,
  Comment,
  Voting,
  Vote,
  Notice,
  Document as DocumentType
} from "../types";

interface DataContextType {
  users: User[];
  requests: Request[];
  notifications: Notification[];
  toasts: Toast[];
  loading: boolean;
  removeToast: (id: string) => void;
  findUserByCpf: (cpf: string) => User | undefined;
  addUser: (userData: Omit<User, "id" | "role">, authUid?: string) => Promise<User | null>;
  updateUserRole: (userId: string, role: Role) => void;
  deleteUser: (userId: string) => void;
  addRequest: (
    requestData: Omit<
      Request,
      "id" | "authorName" | "createdAt" | "comments" | "status"
    >
  ) => void;
  updateRequest: (updatedRequest: Request) => void;
  deleteRequest: (requestId: string) => void;
  updateRequestStatus: (requestId: string, newStatus: Status, adminResponse?: string, userId?: string) => void;
  addComment: (
    requestId: string,
    commentData: Omit<Comment, "id" | "createdAt">
  ) => void;
  deleteComment: (requestId: string, commentId: string) => void;
  updateComment: (requestId: string, commentId: string, newText: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string, showToast?: boolean) => void;
  addToast: (message: string, type: "success" | "error" | "info") => void;

  reservations: Reservation[];
  occurrences: Occurrence[];
  votings: Voting[];
  addReservation: (reservation: Omit<Reservation, "id" | "createdAt">) => void;
  cancelReservation: (reservationId: string) => void;
  addOccurrence: (data: Omit<Occurrence, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addVoting: (voting: Omit<Voting, 'id' | 'votes' | 'createdAt'>) => void;
  vote: (votingId: string, optionIds: string[], currentUser: User) => Promise<void>;
  notices: Notice[];
  addNotice: (notice: Omit<Notice, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  toggleNoticeReaction: (noticeId: string, userId: string, type: 'like' | 'dislike') => Promise<void>;
  updateOccurrence: (id: string, data: Partial<Occurrence>) => Promise<void>;
  deleteOccurrence: (id: string) => Promise<void>;
  toggleRequestLike: (requestId: string, userId: string) => Promise<void>;
  deleteVoting: (id: string) => Promise<void>;
  clearLegacyData: () => Promise<void>;

  documents: DocumentType[];
  addDocument: (docData: Omit<DocumentType, 'id' | 'createdAt'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleDocumentPin: (id: string) => Promise<void>;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [votings, setVotings] = useState<Voting[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminSeeded, setAdminSeeded] = useState(false);

  // FETCH DATA
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User)));
    });

    const qRequests = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Request)));
    });

    const qNotifications = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    const unsubReservations = onSnapshot(collection(db, "reservations"), (snapshot) => {
      setReservations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reservation)));
    });

    const unsubOccurrences = onSnapshot(collection(db, "occurrences"), (snapshot) => {
      setOccurrences(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Occurrence)));
    });

    const unsubVotings = onSnapshot(collection(db, "votings"), (snapshot) => {
      setVotings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Voting)));
    });

    const unsubNotices = onSnapshot(collection(db, "notices"), (snapshot) => {
      setNotices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    const unsubDocuments = onSnapshot(collection(db, "documents"), (snapshot) => {
      setDocuments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DocumentType)));
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubRequests();
      unsubNotifications();
      unsubReservations();
      unsubOccurrences();
      unsubVotings();
      unsubNotices();
      unsubDocuments();
    };
  }, []);

  // SEED ADMIN
  useEffect(() => {
    if (!loading && users.length > 0 && !adminSeeded) {
      seedAdminUser();
    } else if (!loading && users.length === 0 && !adminSeeded) {
      // Se não tem usuários, também tenta criar o admin
      seedAdminUser();
    }
  }, [loading, users, adminSeeded]);

  const seedAdminUser = async () => {
    const adminExists = users.some((u) => u.role === Role.ADMIN);
    if (adminExists) {
      setAdminSeeded(true);
      return;
    }

    // Tenta criar o admin se não existir
    // Nota: Em produção, isso deve ser feito via script de backend ou console do Firebase
    // Aqui fazemos no frontend para facilitar o setup inicial
    const email = "admin@condominio-ps1.local";
    const password = "admin"; // Senha inicial simples

    try {
      // Verifica se já existe no Auth (mas não no Firestore)
      // Como não temos acesso direto ao Auth admin SDK aqui, tentamos criar
      // Se falhar com 'email-already-in-use', assumimos que existe e tentamos apenas criar o doc no Firestore se necessario
      // Mas para simplificar, vamos apenas tentar criar o documento se não achamos o admin na lista 'users'

      // A criação de usuário no Auth é feita pelo componente de Registro ou Login, aqui apenas garantimos que existe um registro no banco
      // Se o usuário Auth já existir, o login funcionará. Se não, precisará ser criado.
      // Como o 'addUser' cria no Auth e no Firestore, usamos ele.

      // POREM, o addUser atual falha se o email já existe no Auth.
      // Vamos deixar o admin criar manualmente ou usar a função de recuperação se já existir.
      // Esta função seed é apenas um helper.

      // Para garantir que o admin tenha acesso, vamos criar um documento admin se não houver nenhum usuário admin
      // Mas precisamos do UID do Auth. Sem ele, não podemos vincular.
      // Então, melhor deixar o fluxo normal ou instruir o usuário.

      // MANTENDO A LÓGICA ANTERIOR SIMPLIFICADA PARA NÃO QUEBRAR O QUE JÁ FUNCIONAVA
      // Se não tem admin, não faz nada automático perigoso. O usuário deve se cadastrar ou recuperar.
      setAdminSeeded(true);
    } catch (error) {
      console.error("Erro ao verificar admin:", error);
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

  // HELPERS
  const findUserByCpf = (cpf: string) => users.find((u) => u.cpf === cpf);

  // ADD USER
  const addUser = async (userData: Omit<User, "id" | "role">, authUid?: string) => {
    const email = `${userData.username.toLowerCase().replace(/\s+/g, '')}@condominio-ps1.local`;

    // Se já temos o UID (veio do AuthContext), usamos ele.
    // Se não, precisamos criar o usuário no Auth via função (ex: admin criando usuário).
    let uid = authUid;

    try {
      if (!uid) {
        // 1. Criar no Firebase Auth via Supabase Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-firebase-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email, password: userData.password, displayName: userData.name }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao criar usuário no Auth");
        }
        uid = data.uid;
      }

      // 2. Criar no Firestore
      // Idealmente usaríamos setDoc com o uid para vincular Auth e Firestore.
      // Mas para manter compatibilidade com o código existente que usa addDoc (IDs aleatórios),
      // vamos manter addDoc por enquanto, ou migrar gradualmente.
      // O problema do addDoc é que desvincula o ID do documento do UID do Auth.
      // Vamos usar addDoc para não quebrar nada que dependa de IDs gerados pelo Firestore,
      // mas salvar o uid do Auth dentro do documento para referência futura seria bom.

      const docRef = await addDoc(collection(db, "users"), {
        ...userData,
        role: Role.MORADOR,
        email,
        authUid: uid // Salvando o UID do Auth para referência
      });

      const newUser: User = {
        ...userData,
        id: docRef.id,
        role: Role.MORADOR,
        email,
      };

      addToast("Usuário cadastrado com sucesso!", "success");

      // Notificar todos
      await addNotification({
        message: `Novo morador cadastrado: ${userData.name} (Unidade ${userData.houseNumber})`,
        userId: "all",
        requestId: "",
      });

      return newUser;
    } catch (e: any) {
      console.error("Erro no addUser:", e);
      // Tentar extrair mensagem de erro mais útil
      const msg = e.message || "Erro desconhecido";
      if (msg.includes("email-already-in-use")) {
        addToast("Nome de usuário já existe.", "error");
      } else {
        addToast("Erro ao cadastrar usuário: " + msg, "error");
      }
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
      message: `Nova sugestão criada por ${author.name}`,
      userId: "all",
      requestId: "",
    });

    addToast("Sugestão registrada.", "success");
  };

  const updateRequest = (updatedRequest: Request) => {
    const { id, ...data } = updatedRequest;

    updateDoc(doc(db, "requests", id), data).then(() =>
      addToast("Sugestão atualizada.", "success")
    );
  };

  const deleteRequest = (requestId: string) => {
    deleteDoc(doc(db, "requests", requestId)).then(() =>
      addToast("Sugestão excluída.", "success")
    );
  };

  const updateRequestStatus = (requestId: string, newStatus: Status, adminResponse?: string, userId?: string) => {
    const updateData: any = {
      status: newStatus,
      statusUpdatedAt: new Date().toISOString()
    };

    // Update the official admin response field
    if (adminResponse) {
      updateData.adminResponse = adminResponse;
    }

    // Add a system comment for history tracking
    if (userId) {
      const request = requests.find(r => r.id === requestId);
      const author = users.find(u => u.id === userId);

      if (request && author) {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          authorId: author.id,
          authorName: author.name,
          text: `Alterou o status para "${newStatus}".${adminResponse ? ` Justificativa: ${adminResponse}` : ''}`,
          createdAt: new Date().toISOString(),
          type: 'status_change',
          newStatus: newStatus
        };
        // Ensure we don't overwrite existing comments, but append to them
        updateData.comments = [...(request.comments || []), newComment];
      }
    }

    updateDoc(doc(db, "requests", requestId), updateData).then(() => {
      const request = requests.find(r => r.id === requestId);
      if (request) {
        addNotification({
          message: `Status da sugestão "${request.title}" alterado para ${newStatus}`,
          userId: "all",
          requestId: request.id,
        });
      }
      addToast("Status atualizado.", "info");
    });
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

  const updateOccurrence = async (id: string, data: Partial<Occurrence>) => {
    await updateDoc(doc(db, "occurrences", id), data);

    // If admin responded, notify user
    if (data.adminResponse) {
      const occurrence = occurrences.find(o => o.id === id);
      if (occurrence) {
        await addNotification({
          message: `Sua ocorrência "${occurrence.subject}" foi respondida pela gestão.`,
          userId: occurrence.authorId,
          requestId: "",
        });
      }
    }

    addToast("Ocorrência atualizada.", "success");
  };

  const deleteOccurrence = async (id: string) => {
    await deleteDoc(doc(db, "occurrences", id));
    addToast("Ocorrência excluída.", "info");
  };

  // COMMENTS
  const addComment = (
    requestId: string,
    commentData: Omit<Comment, "id" | "createdAt">
  ) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      ...commentData,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...request.comments, newComment];

    updateDoc(doc(db, "requests", requestId), {
      comments: updatedComments,
    }).then(() => {
      // Notificar todos
      addNotification({
        message: `${commentData.authorName} comentou em: "${request.title}"`,
        userId: "all",
        requestId: request.id,
      });
      addToast("Comentário adicionado.", "success");
    });
  };

  const deleteComment = async (requestId: string, commentId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const updatedComments = request.comments.filter((c) => c.id !== commentId);

    await updateDoc(doc(db, "requests", requestId), {
      comments: updatedComments,
    });
    addToast("Comentário excluído.", "success");
  };

  const updateComment = async (requestId: string, commentId: string, newText: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const updatedComments = request.comments.map((c) =>
      c.id === commentId ? { ...c, text: newText } : c
    );

    await updateDoc(doc(db, "requests", requestId), {
      comments: updatedComments,
    });
    addToast("Comentário atualizado.", "success");
  };

  const toggleRequestLike = async (requestId: string, userId: string) => {
    const requestRef = doc(db, "requests", requestId);
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const likes = request.likes || [];
    const isLiked = likes.includes(userId);

    let newLikes;
    if (isLiked) {
      newLikes = likes.filter((id) => id !== userId);
    } else {
      newLikes = [...likes, userId];
    }

    await updateDoc(requestRef, { likes: newLikes });
  };

  // MARCAR COMO LIDAS
  const markAllNotificationsAsRead = async (userId: string) => {
    const unread = notifications.filter((n) => !n.readBy?.includes(userId));
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), {
          readBy: [...(n.readBy || []), userId],
        });
      });
      await batch.commit();
    } catch (err) {
      console.error("Erro ao marcar como lidas:", err);
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

  const deleteVoting = async (id: string) => {
    await deleteDoc(doc(db, 'votings', id));
    addToast('Votação excluída.', 'info');
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

    // Removido notificação global para cada voto para evitar spam

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

  const clearLegacyData = async () => {
    try {
      // Delete all requests
      const requestPromises = requests.map(r => deleteDoc(doc(db, "requests", r.id)));
      // Delete all reservations
      const reservationPromises = reservations.map(r => deleteDoc(doc(db, "reservations", r.id)));

      await Promise.all([...requestPromises, ...reservationPromises]);
      addToast("Dados antigos limpos com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      addToast("Erro ao limpar dados.", "error");
    }
  };

  // --- DOCUMENTS ---
  const addDocument = async (docData: Omit<DocumentType, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'documents'), {
      ...docData,
      createdAt: new Date().toISOString(),
    });

    addToast('Documento adicionado com sucesso!', 'success');
  };

  const deleteDocument = async (id: string) => {
    await deleteDoc(doc(db, 'documents', id));
    addToast('Documento removido.', 'info');
  };

  const toggleDocumentPin = async (id: string) => {
    const document = documents.find(d => d.id === id);
    if (!document) return;

    await updateDoc(doc(db, 'documents', id), {
      isPinned: !document.isPinned
    });

    addToast(document.isPinned ? 'Documento desfixado.' : 'Documento fixado no topo!', 'success');
  };

  // PROVIDER
  const value = React.useMemo(() => ({
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
    deleteComment,
    updateComment,
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
    vote: castVote,
    deleteVoting,
    notices,
    addNotice,
    deleteNotice,
    toggleNoticeReaction,
    updateOccurrence,
    deleteOccurrence,
    toggleRequestLike,
    clearLegacyData,
    documents,
    addDocument,
    deleteDocument,
    toggleDocumentPin,
  }), [
    users, requests, notifications, toasts, loading, reservations, occurrences, votings, notices, documents
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
