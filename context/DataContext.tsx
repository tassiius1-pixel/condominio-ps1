import React, { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "../services/supabase";
import { sendPushNotification } from "../services/pushNotifications";
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
  toggleCommentLike: (requestId: string, commentId: string, userId: string) => Promise<void>;
  deleteVoting: (id: string) => Promise<void>;
  clearLegacyData: () => Promise<void>;

  documents: DocumentType[];
  addDocument: (docData: Omit<DocumentType, 'id' | 'createdAt'>) => Promise<void>;
  updateDocument: (id: string, data: Partial<DocumentType>) => Promise<void>;
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

  const addToast = useCallback((message: string, type: "success" | "error" | "info") => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}`, message, type },
    ]);
  }, []);

  const removeToast = useCallback((id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("name");
    if (data && !error) {
      setUsers(data.map(d => ({
        id: d.id,
        name: d.name,
        username: d.username,
        cpf: d.cpf,
        houseNumber: Number(d.house_number),
        role: d.role.toLowerCase() as Role,
        email: d.email,
        phone: d.phone || ""
      })));
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("requests")
      .select(`
        *,
        request_likes (user_id),
        comments (
          *,
          comment_likes (user_id),
          profiles:profiles!comments_author_id_fkey (name, house_number)
        ),
        profiles:profiles!requests_author_id_fkey (name)
      `)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setRequests(data.map(req => ({
        id: req.id,
        title: req.title,
        description: req.description,
        sector: req.sector || "Outros",
        type: req.type || "Sugestões",
        status: req.status.replace("_", " ").toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') as any,
        priority: req.priority || "Média",
        photos: req.photos || [],
        authorId: req.author_id,
        authorName: req.profiles?.name || "Desconhecido",
        createdAt: req.created_at,
        likes: (req.request_likes || []).map((l: any) => l.user_id),
        adminResponse: req.admin_response || "",
        statusUpdatedAt: req.status_updated_at || "",
        comments: (req.comments || []).map((c: any) => ({
          id: c.id,
          authorId: c.author_id,
          authorName: c.profiles?.name || "Desconhecido",
          houseNumber: Number(c.profiles?.house_number || 0),
          text: c.text,
          createdAt: c.created_at,
          type: c.type || 'common',
          newStatus: c.new_status || null,
          likes: (c.comment_likes || []).map((cl: any) => cl.user_id)
        })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      })));
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, profiles(name, house_number)");
    if (data && !error) {
      setReservations(data.map(d => ({
        id: d.id,
        userId: d.user_id,
        userName: d.profiles?.name || "Desconhecido",
        houseNumber: Number(d.profiles?.house_number || 0),
        area: d.area as any,
        date: d.date,
        createdAt: d.created_at
      })));
    }
  }, []);

  const fetchOccurrences = useCallback(async () => {
    const { data, error } = await supabase
      .from("occurrences")
      .select("*, profiles(name, house_number, phone)");
    if (data && !error) {
      setOccurrences(data.map(d => ({
        id: d.id,
        authorId: d.author_id,
        authorName: d.profiles?.name || "Desconhecido",
        houseNumber: Number(d.profiles?.house_number || 0),
        phone: d.profiles?.phone || "",
        subject: d.subject,
        description: d.description,
        createdAt: d.created_at,
        photos: d.image_url ? [d.image_url] : [],
        status: d.status as any,
        adminResponse: d.admin_response || ""
      })));
    }
  }, []);

  const fetchVotings = useCallback(async () => {
    const { data, error } = await supabase
      .from("votings")
      .select("*, votes(*, profiles(name, house_number))")
      .order("created_at", { ascending: false });
    if (data && !error) {
      setVotings(data.map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        options: v.options,
        startDate: v.start_date,
        endDate: v.end_date,
        allowMultipleChoices: v.allow_multiple_choices,
        createdBy: v.created_by,
        createdAt: v.created_at,
        votes: (v.votes || []).map((vt: any) => ({
          userId: vt.user_id,
          userName: vt.profiles?.name || "Desconhecido",
          houseNumber: Number(vt.profiles?.house_number || 0),
          optionIds: vt.option_ids,
          timestamp: vt.timestamp
        }))
      })));
    }
  }, []);

  const fetchNotices = useCallback(async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("*, notice_reactions(*)")
      .order("created_at", { ascending: false });
    if (data && !error) {
      setNotices(data.map(n => {
        const reactions = n.notice_reactions || [];
        return {
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: n.created_at,
          likes: reactions.filter((r: any) => r.type === "like").map((r: any) => r.user_id),
          dislikes: reactions.filter((r: any) => r.type === "dislike").map((r: any) => r.user_id),
          authorId: "admin",
          authorName: "Administração",
          startDate: n.created_at,
          endDate: n.created_at
        };
      }));
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && !error) {
      setDocuments(data.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        fileUrl: d.file_url,
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        uploadedBy: d.uploaded_by,
        isPinned: d.is_pinned,
        createdAt: d.created_at
      })));
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*, notification_reads(user_id)")
      .order("created_at", { ascending: false });
    if (data && !error) {
      setNotifications(data.map(n => ({
        id: n.id,
        userId: n.user_id || "all",
        requestId: n.request_id || "",
        message: n.message,
        createdAt: n.created_at,
        readBy: (n.notification_reads || []).map((r: any) => r.user_id)
      })));
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchUsers(),
      fetchRequests(),
      fetchReservations(),
      fetchOccurrences(),
      fetchVotings(),
      fetchNotices(),
      fetchDocuments(),
      fetchNotifications()
    ]).finally(() => setLoading(false));

    const chUsers = supabase.channel("rt-users").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers).subscribe();
    const chRequests = supabase.channel("rt-requests").on("postgres_changes", { event: "*", schema: "public", table: "requests" }, fetchRequests).subscribe();
    const chLikes = supabase.channel("rt-likes").on("postgres_changes", { event: "*", schema: "public", table: "request_likes" }, fetchRequests).subscribe();
    const chComments = supabase.channel("rt-comments").on("postgres_changes", { event: "*", schema: "public", table: "comments" }, fetchRequests).subscribe();
    const chCommentLikes = supabase.channel("rt-comment-likes").on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, fetchRequests).subscribe();
    const chRes = supabase.channel("rt-reservations").on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchReservations).subscribe();
    const chOcc = supabase.channel("rt-occurrences").on("postgres_changes", { event: "*", schema: "public", table: "occurrences" }, fetchOccurrences).subscribe();
    const chVotings = supabase.channel("rt-votings").on("postgres_changes", { event: "*", schema: "public", table: "votings" }, fetchVotings).subscribe();
    const chVotes = supabase.channel("rt-votes").on("postgres_changes", { event: "*", schema: "public", table: "votes" }, fetchVotings).subscribe();
    const chNotices = supabase.channel("rt-notices").on("postgres_changes", { event: "*", schema: "public", table: "notices" }, fetchNotices).subscribe();
    const chReactions = supabase.channel("rt-reactions").on("postgres_changes", { event: "*", schema: "public", table: "notice_reactions" }, fetchNotices).subscribe();
    const chDocs = supabase.channel("rt-docs").on("postgres_changes", { event: "*", schema: "public", table: "documents" }, fetchDocuments).subscribe();
    const chNotif = supabase.channel("rt-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifications).subscribe();
    const chNotifReads = supabase.channel("rt-notif-reads").on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, fetchNotifications).subscribe();

    return () => {
      chUsers.unsubscribe();
      chRequests.unsubscribe();
      chLikes.unsubscribe();
      chComments.unsubscribe();
      chCommentLikes.unsubscribe();
      chRes.unsubscribe();
      chOcc.unsubscribe();
      chVotings.unsubscribe();
      chVotes.unsubscribe();
      chNotices.unsubscribe();
      chReactions.unsubscribe();
      chDocs.unsubscribe();
      chNotif.unsubscribe();
      chNotifReads.unsubscribe();
    };
  }, [fetchUsers, fetchRequests, fetchReservations, fetchOccurrences, fetchVotings, fetchNotices, fetchDocuments, fetchNotifications]);

  const findUserByCpf = (cpf: string) => users.find((u) => u.cpf === cpf);

  const addNotification = async (
    notificationData: Omit<Notification, "id" | "createdAt" | "readBy">
  ) => {
    const isGlobal = notificationData.userId === "all";
    await supabase.from("notifications").insert({
      message: notificationData.message,
      user_id: isGlobal ? null : notificationData.userId,
      request_id: notificationData.requestId || null
    });
  };

  const deleteNotification = async (notificationId: string, showToast = true) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (error && showToast) {
      addToast("Erro ao remover notificação.", "error");
    }
  };

  const addUser = async (userData: Omit<User, "id" | "role">, authUid?: string) => {
    const usernameClean = userData.username.toLowerCase().replace(/\s+/g, '');
    const email = `${usernameClean}.ps1@gmail.com`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/manage-supabase-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'create',
            email,
            password: userData.password || userData.cpf.replace(/\D/g, ''),
            metadata: {
              name: userData.name,
              username: userData.username,
              cpf: userData.cpf.replace(/\D/g, ''),
              houseNumber: String(userData.houseNumber),
              phone: (userData as any).phone || "",
              role: 'MORADOR'
            }
          }),
        }
      );

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Erro ao cadastrar no Supabase.");
      }

      addToast("Usuário cadastrado com sucesso!", "success");

      await addNotification({
        message: `Novo morador cadastrado: ${userData.name} (Unidade ${userData.houseNumber})`,
        userId: "all",
        requestId: "",
      });

      return {
        ...userData,
        id: resData.uid,
        role: Role.MORADOR,
        email,
      };
    } catch (e: any) {
      console.error("Erro no addUser:", e);
      addToast("Erro ao cadastrar usuário: " + e.message, "error");
      return null;
    }
  };

  const updateUserRole = async (userId: string, role: Role) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: role.toUpperCase() })
      .eq("id", userId);

    if (!error) {
      addToast("Perfil atualizado.", "success");
    } else {
      addToast("Erro ao atualizar perfil.", "error");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/manage-supabase-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'delete',
            userId: userId
          }),
        }
      );

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Erro ao excluir no Supabase.");
      }

      addToast("Usuário excluído completamente!", "success");
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      addToast("Erro ao excluir usuário: " + error.message, "error");
    }
  };

  const addRequest = async (
    requestData: Omit<
      Request,
      "id" | "authorName" | "createdAt" | "comments" | "status"
    >
  ) => {
    const { error } = await supabase.from("requests").insert({
      title: requestData.title,
      description: requestData.description,
      author_id: requestData.authorId
    });

    if (!error) {
      const author = users.find((u) => u.id === requestData.authorId);
      const authorName = author?.name || "Morador";

      await addNotification({
        message: `Nova sugestão criada por ${authorName}`,
        userId: "all",
        requestId: "",
      });

      sendPushNotification(
        "all",
        "Nova Sugestão Criada",
        `${authorName} sugeriu: ${requestData.title}`
      );

      addToast("Sugestão registrada.", "success");
    } else {
      addToast("Erro ao registrar sugestão.", "error");
    }
  };

  const updateRequest = async (updatedRequest: Request) => {
    const { error } = await supabase
      .from("requests")
      .update({
        title: updatedRequest.title,
        description: updatedRequest.description
      })
      .eq("id", updatedRequest.id);

    if (!error) {
      addToast("Sugestão atualizada.", "success");
    } else {
      addToast("Erro ao atualizar sugestão.", "error");
    }
  };

  const deleteRequest = async (requestId: string) => {
    const { error } = await supabase.from("requests").delete().eq("id", requestId);
    if (!error) {
      addToast("Sugestão excluída.", "success");
    } else {
      addToast("Erro ao excluir sugestão.", "error");
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    newStatus: Status,
    adminResponse?: string,
    userId?: string
  ) => {
    let status = 'PENDENTE';
    const s = newStatus.toUpperCase();
    if (s.includes('PENDENTE')) status = 'PENDENTE';
    else if (s.includes('ANDAMENTO')) status = 'EM_ANDAMENTO';
    else if (s.includes('APROVADA') || s.includes('CONCLUIDO')) status = 'RESOLVIDO';
    else if (s.includes('RECUSADA')) status = 'REJEITADO';

    const updateData: any = {
      status,
      status_updated_at: new Date().toISOString()
    };
    if (adminResponse) {
      updateData.admin_response = adminResponse;
    }

    const { error } = await supabase.from("requests").update(updateData).eq("id", requestId);

    if (!error) {
      if (userId) {
        await supabase.from("comments").insert({
          request_id: requestId,
          author_id: userId,
          text: `Alterou o status para "${newStatus}".${adminResponse ? ` Justificativa: ${adminResponse}` : ''}`,
          type: 'status_change',
          new_status: newStatus
        });
      }

      const request = requests.find(r => r.id === requestId);
      if (request) {
        await addNotification({
          message: `Status da sugestão "${request.title}" alterado para ${newStatus}`,
          userId: request.authorId,
          requestId: request.id,
        });

        sendPushNotification(
          request.authorId,
          "Atualização na sua Sugestão",
          `O status de "${request.title}" mudou para ${newStatus}.`
        );
      }
      addToast("Status atualizado.", "info");
    } else {
      addToast("Erro ao atualizar status.", "error");
    }
  };

  const toggleRequestLike = async (requestId: string, userId: string) => {
    const { data } = await supabase
      .from("request_likes")
      .select("*")
      .eq("request_id", requestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      await supabase.from("request_likes").delete().eq("request_id", requestId).eq("user_id", userId);
    } else {
      await supabase.from("request_likes").insert({ request_id: requestId, user_id: userId });
    }
  };

  const addComment = async (requestId: string, commentData: Omit<Comment, "id" | "createdAt">) => {
    const { error } = await supabase.from("comments").insert({
      request_id: requestId,
      author_id: commentData.authorId,
      text: commentData.text,
      type: commentData.type || 'common'
    });

    if (!error) {
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        await addNotification({
          message: `${commentData.authorName} comentou em: "${request.title}"`,
          userId: "all",
          requestId: request.id,
        });
      }
      addToast("Comentário adicionado.", "success");
    } else {
      addToast("Erro ao adicionar comentário.", "error");
    }
  };

  const deleteComment = async (requestId: string, commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      addToast("Comentário excluído.", "success");
    } else {
      addToast("Erro ao excluir comentário.", "error");
    }
  };

  const updateComment = async (requestId: string, commentId: string, newText: string) => {
    const { error } = await supabase
      .from("comments")
      .update({ text: newText })
      .eq("id", commentId);

    if (!error) {
      addToast("Comentário atualizado.", "success");
    } else {
      addToast("Erro ao atualizar comentário.", "error");
    }
  };

  const toggleCommentLike = async (requestId: string, commentId: string, userId: string) => {
    const { data } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
    }
  };

  const markAllNotificationsAsRead = async (userId: string) => {
    const unread = notifications.filter((n) => !n.readBy?.includes(userId));
    if (unread.length === 0) return;

    try {
      for (const n of unread) {
        await supabase.from("notification_reads").insert({
          notification_id: n.id,
          user_id: userId
        });
      }
    } catch (err) {
      console.error("Erro ao marcar como lidas:", err);
    }
  };

  const addReservation = async (reservation: Omit<Reservation, "id" | "createdAt">) => {
    const { error } = await supabase.from("reservations").insert({
      user_id: reservation.userId,
      area: reservation.area,
      date: reservation.date
    });

    if (!error) {
      addToast("Reserva realizada com sucesso!", "success");
    } else {
      addToast("Área ocupada ou erro na reserva.", "error");
    }
  };

  const cancelReservation = async (reservationId: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (!error) {
      addToast("Reserva cancelada.", "info");
    } else {
      addToast("Erro ao cancelar reserva.", "error");
    }
  };

  const addOccurrence = async (data: Omit<Occurrence, 'id' | 'createdAt' | 'status'>) => {
    const { error } = await supabase.from("occurrences").insert({
      author_id: data.authorId,
      subject: data.subject,
      description: data.description,
      image_url: data.photos && data.photos.length > 0 ? data.photos[0] : null,
      status: 'Aberto'
    });

    if (!error) {
      addToast("Ocorrência registrada.", "success");

      const admins = users.filter(u => [Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(u.role));
      admins.forEach(admin => {
        addNotification({
          message: `Nova ocorrência: ${data.subject} (Unidade ${data.houseNumber})`,
          userId: admin.id,
          requestId: "",
        });
        sendPushNotification(
          admin.id,
          "Nova Ocorrência",
          `${data.authorName} (Casa ${data.houseNumber}): ${data.subject}`
        );
      });
    } else {
      addToast("Erro ao registrar ocorrência.", "error");
    }
  };

  const updateOccurrence = async (id: string, data: Partial<Occurrence>) => {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.adminResponse !== undefined) updateData.admin_response = data.adminResponse;

    const { error } = await supabase.from("occurrences").update(updateData).eq("id", id);

    if (!error) {
      if (data.adminResponse) {
        const occurrence = occurrences.find(o => o.id === id);
        if (occurrence) {
          await addNotification({
            message: `Sua ocorrência "${occurrence.subject}" foi respondida pela gestão.`,
            userId: occurrence.authorId,
            requestId: "",
          });

          sendPushNotification(
            occurrence.authorId,
            "Ocorrência Respondida",
            `A gestão respondeu à sua ocorrência: ${occurrence.subject}`
          );
        }
      }
      addToast("Ocorrência atualizada.", "success");
    } else {
      addToast("Erro ao atualizar ocorrência.", "error");
    }
  };

  const deleteOccurrence = async (id: string) => {
    const { error } = await supabase.from("occurrences").delete().eq("id", id);
    if (!error) {
      addToast("Ocorrência excluída.", "info");
    } else {
      addToast("Erro ao excluir ocorrência.", "error");
    }
  };

  const addVoting = async (voting: Omit<Voting, 'id' | 'votes' | 'createdAt'>) => {
    const { error } = await supabase.from("votings").insert({
      title: voting.title,
      description: voting.description,
      options: voting.options,
      start_date: voting.startDate,
      end_date: voting.endDate,
      allow_multiple_choices: voting.allowMultipleChoices,
      created_by: voting.createdBy
    });

    if (!error) {
      await addNotification({
        message: `Nova votação disponível: ${voting.title}`,
        userId: "all",
        requestId: "",
      });

      sendPushNotification(
        "all",
        "Nova Votação Aberta",
        `Participe: ${voting.title}`
      );

      addToast('Votação criada com sucesso!', 'success');
    } else {
      addToast('Erro ao criar votação.', 'error');
    }
  };

  const deleteVoting = async (id: string) => {
    const { error } = await supabase.from("votings").delete().eq("id", id);
    if (!error) {
      addToast('Votação excluída.', 'info');
    } else {
      addToast('Erro ao excluir votação.', 'error');
    }
  };

  const castVote = async (votingId: string, optionIds: string[], currentUser: User) => {
    if (!currentUser) return;

    const { error } = await supabase.from("votes").insert({
      voting_id: votingId,
      user_id: currentUser.id,
      option_ids: optionIds
    });

    if (!error) {
      addToast('Voto registrado com sucesso!', 'success');
    } else {
      if (error.message?.includes("votes_voting_id_user_id_key") || error.code === "23505") {
        addToast('Sua unidade já registrou um voto nesta votação.', 'error');
      } else {
        addToast('Erro ao registrar voto.', 'error');
      }
    }
  };

  const addNotice = async (notice: Omit<Notice, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => {
    const { error } = await supabase.from("notices").insert({
      title: notice.title,
      content: notice.content
    });

    if (!error) {
      await addNotification({
        message: `Novo aviso publicado: ${notice.title}`,
        userId: "all",
        requestId: "",
      });

      sendPushNotification(
        "all",
        "Novo Aviso Publicado",
        notice.title
      );

      addToast('Aviso publicado com sucesso!', 'success');
    } else {
      addToast('Erro ao publicar aviso.', 'error');
    }
  };

  const deleteNotice = async (noticeId: string) => {
    const { error } = await supabase.from("notices").delete().eq("id", noticeId);
    if (!error) {
      addToast('Aviso removido.', 'info');
    } else {
      addToast('Erro ao remover aviso.', 'error');
    }
  };

  const toggleNoticeReaction = async (noticeId: string, userId: string, type: 'like' | 'dislike') => {
    const { data } = await supabase
      .from("notice_reactions")
      .select("*")
      .eq("notice_id", noticeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      if (data.type === type) {
        await supabase.from("notice_reactions").delete().eq("notice_id", noticeId).eq("user_id", userId);
      } else {
        await supabase.from("notice_reactions").update({ type }).eq("notice_id", noticeId).eq("user_id", userId);
      }
    } else {
      await supabase.from("notice_reactions").insert({ notice_id: noticeId, user_id: userId, type });
    }
  };

  const addDocument = async (docData: Omit<DocumentType, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from("documents").insert({
      title: docData.title,
      description: docData.description || "",
      category: docData.category,
      file_url: docData.fileUrl,
      file_name: docData.fileName,
      file_type: docData.fileType,
      file_size: docData.fileSize,
      uploaded_by: docData.uploadedBy,
      is_pinned: !!docData.isPinned
    });

    if (!error) {
      await addNotification({
        message: `Novo documento disponível: ${docData.title}`,
        userId: "all",
        requestId: "",
      });

      sendPushNotification(
        "all",
        "Novo Documento Adicionado",
        `${docData.title} (${docData.category})`
      );

      addToast('Documento adicionado com sucesso!', 'success');
    } else {
      addToast('Erro ao adicionar documento.', 'error');
    }
  };

  const updateDocument = async (id: string, data: Partial<DocumentType>) => {
    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.isPinned !== undefined) updateData.is_pinned = data.isPinned;

    const { error } = await supabase.from("documents").update(updateData).eq("id", id);
    if (!error) {
      addToast('Documento atualizado com sucesso!', 'success');
    } else {
      addToast('Erro ao atualizar documento.', 'error');
    }
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (!error) {
      addToast('Documento removido.', 'info');
    } else {
      addToast('Erro ao remover documento.', 'error');
    }
  };

  const toggleDocumentPin = async (id: string) => {
    const document = documents.find(d => d.id === id);
    if (!document) return;

    const { error } = await supabase
      .from("documents")
      .update({ is_pinned: !document.isPinned })
      .eq("id", id);

    if (!error) {
      addToast(!document.isPinned ? 'Documento fixado no topo!' : 'Documento desfixado.', 'success');
    }
  };

  const clearLegacyData = async () => {
    try {
      await supabase.from("requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      addToast("Dados antigos limpos com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      addToast("Erro ao limpar dados.", "error");
    }
  };

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
    toggleCommentLike,
    clearLegacyData,
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    toggleDocumentPin,
  }), [
    users,
    requests,
    notifications,
    toasts,
    loading,
    reservations,
    occurrences,
    votings,
    notices,
    documents
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
