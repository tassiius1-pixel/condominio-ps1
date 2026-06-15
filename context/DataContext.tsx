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
  Document as DocumentType,
  Boleto,
  BoletoUpload,
  Sector,
  RequestType,
  Priority,
  GalleryAlbum,
  GalleryMedia
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
  deleteNotifications: (ids: string[]) => Promise<void>;
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

  boletos: Boleto[];
  addBoleto: (boleto: Omit<Boleto, 'id' | 'createdAt'>) => Promise<any>;
  addBoletos: (boletosData: Omit<Boleto, 'id' | 'createdAt'>[]) => Promise<void>;
  deleteBoletosByMonth: (month: string) => Promise<void>;
  getBoletoSignedUrl: (fileUrl: string) => Promise<string>;

  boletoUploads: BoletoUpload[];
  addBoletoUpload: (upload: Omit<BoletoUpload, 'id' | 'uploadedAt'>) => Promise<void>;

  albums: GalleryAlbum[];
  galleryMedia: GalleryMedia[];
  addAlbum: (albumData: Omit<GalleryAlbum, 'id' | 'createdAt'>) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  addGalleryMedia: (mediaData: Omit<GalleryMedia, 'id' | 'createdAt'>) => Promise<void>;
  deleteGalleryMedia: (id: string) => Promise<void>;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fetchNotificationsTimeout = React.useRef<any>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [votings, setVotings] = useState<Voting[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [boletoUploads, setBoletoUploads] = useState<BoletoUpload[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = React.useRef<string | null>(null);

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
        status: (() => {
          if (req.status === 'RESOLVIDO') return Status.CONCLUIDO;
          if (req.status === 'REJEITADO') return Status.RECUSADA;
          if (req.status === 'EM_ANDAMENTO') return Status.EM_ANDAMENTO;
          return Status.PENDENTE;
        })(),
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

  const fetchBoletos = useCallback(async () => {
    const { data, error } = await supabase
      .from("boletos")
      .select("*")
      .order("reference_month", { ascending: false })
      .order("house_number", { ascending: true });
    if (data && !error) {
      setBoletos(data.map(b => ({
        id: b.id,
        houseNumber: b.house_number,
        referenceMonth: b.reference_month,
        fileUrl: b.file_url,
        fileName: b.file_name,
        fileSize: b.file_size,
        uploadedBy: b.uploaded_by,
        createdAt: b.created_at
      })));
    }
  }, []);

  const fetchBoletoUploads = useCallback(async () => {
    const { data, error } = await supabase
      .from("boleto_uploads")
      .select("*")
      .order("reference_month", { ascending: false });
    if (data && !error) {
      setBoletoUploads(data.map(bu => ({
        id: bu.id,
        referenceMonth: bu.reference_month,
        uploadedAt: bu.uploaded_at,
        uploadedBy: bu.uploaded_by,
        fileName: bu.file_name,
        fileSize: bu.file_size,
        totalFiles: bu.total_files,
        matchedFiles: bu.matched_files
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

  const fetchAlbums = useCallback(async () => {
    const { data, error } = await supabase
      .from("gallery_albums")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && !error) {
      setAlbums(data.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description || "",
        createdAt: d.created_at,
        createdBy: d.created_by
      })));
    }
  }, []);

  const fetchGalleryMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from("gallery_media")
      .select("*")
      .order("created_at", { ascending: true });
    if (data && !error) {
      setGalleryMedia(data.map(d => ({
        id: d.id,
        albumId: d.album_id,
        url: d.url,
        type: d.type as 'image' | 'video',
        createdAt: d.created_at,
        createdBy: d.created_by
      })));
    }
  }, []);

  const fetchNotificationsDebounced = useCallback(() => {
    if (fetchNotificationsTimeout.current) {
      clearTimeout(fetchNotificationsTimeout.current);
    }
    fetchNotificationsTimeout.current = setTimeout(() => {
      fetchNotifications();
    }, 300); // 300ms debounce
  }, [fetchNotifications]);

  // Gerenciamento unificado de carregamento de dados e conexões Realtime de acordo com a sessão
  useEffect(() => {
    let activeChannels: any[] = [];

    const unsubscribeAll = () => {
      if (activeChannels.length > 0) {
        console.log("🧹 [DataContext] Removendo assinaturas de Realtime antigas...");
        activeChannels.forEach(ch => {
          try {
            ch.unsubscribe();
          } catch (e) {
            console.error("Erro ao remover canal Realtime:", e);
          }
        });
        activeChannels = [];
      }
    };

    const loadDataAndSubscribe = async (userId: string) => {
      if (loadedUserIdRef.current === userId) {
        console.log(`ℹ️ [DataContext] Sessão já carregada para ${userId}. Ignorando recarregamento redundante.`);
        return;
      }
      loadedUserIdRef.current = userId;
      setLoading(true);
      console.log(`🔑 [DataContext] Sessão ativa para ${userId}. Carregando dados e ativando Realtime...`);
      
      try {
        await Promise.all([
          fetchUsers(),
          fetchRequests(),
          fetchReservations(),
          fetchOccurrences(),
          fetchVotings(),
          fetchNotices(),
          fetchDocuments(),
          fetchNotifications(),
          fetchBoletos(),
          fetchBoletoUploads(),
          fetchAlbums(),
          fetchGalleryMedia()
        ]);
      } catch (err) {
        console.error("Erro ao carregar dados protegidos:", err);
      } finally {
        setLoading(false);
      }

      // Desinscreve canais antigos antes de abrir novos
      unsubscribeAll();

      // Assina canais Realtime apenas enquanto estiver logado
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
      const chBoletos = supabase.channel("rt-boletos").on("postgres_changes", { event: "*", schema: "public", table: "boletos" }, fetchBoletos).subscribe();
      const chBoletoUploads = supabase.channel("rt-boleto-uploads").on("postgres_changes", { event: "*", schema: "public", table: "boleto_uploads" }, fetchBoletoUploads).subscribe();
      const chNotif = supabase.channel("rt-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotificationsDebounced).subscribe();
      const chNotifReads = supabase.channel("rt-notif-reads").on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, fetchNotificationsDebounced).subscribe();
      const chAlbums = supabase.channel("rt-gallery-albums").on("postgres_changes", { event: "*", schema: "public", table: "gallery_albums" }, fetchAlbums).subscribe();
      const chMedia = supabase.channel("rt-gallery-media").on("postgres_changes", { event: "*", schema: "public", table: "gallery_media" }, fetchGalleryMedia).subscribe();

      activeChannels = [
        chUsers, chRequests, chLikes, chComments, chCommentLikes,
        chRes, chOcc, chVotings, chVotes, chNotices, chReactions,
        chDocs, chBoletos, chBoletoUploads, chNotif, chNotifReads,
        chAlbums, chMedia
      ];
    };

    const clearAllData = () => {
      console.log("🧹 [DataContext] Usuário deslogado. Limpando dados da memória e desativando Realtime...");
      unsubscribeAll();
      loadedUserIdRef.current = null;
      setUsers([]);
      setRequests([]);
      setReservations([]);
      setOccurrences([]);
      setVotings([]);
      setNotices([]);
      setDocuments([]);
      setBoletos([]);
      setBoletoUploads([]);
      setNotifications([]);
      setAlbums([]);
      setGalleryMedia([]);
      setLoading(false);
    };

    // Verifica sessão inicial imediatamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadDataAndSubscribe(session.user.id);
      } else {
        clearAllData();
      }
    });

    // Escuta mudanças de sessão de forma unificada
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            loadDataAndSubscribe(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          clearAllData();
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeAll();
    };
  }, [fetchUsers, fetchRequests, fetchReservations, fetchOccurrences, fetchVotings, fetchNotices, fetchDocuments, fetchNotifications, fetchBoletos, fetchBoletoUploads, fetchAlbums, fetchGalleryMedia]);

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
    // Atualização otimista local imediata
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (error) {
      if (showToast) addToast("Erro ao remover notificação.", "error");
      fetchNotificationsDebounced(); // Restaura em caso de erro
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    if (ids.length === 0) return;

    // Atualização otimista local imediata
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", ids);

    if (error) {
      addToast("Erro ao remover notificações.", "error");
      fetchNotificationsDebounced(); // Restaura em caso de erro
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
              role: 'PROPRIETARIO'
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
        role: Role.PROPRIETARIO,
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
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
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

      setUsers((prev) => prev.filter((u) => u.id !== userId));
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
    const tempId = `temp-${Date.now()}`;
    const author = users.find((u) => u.id === requestData.authorId);
    const authorName = author?.name || "Proprietário";
    const newRequest: Request = {
      id: tempId,
      title: requestData.title,
      description: requestData.description,
      sector: requestData.sector || Sector.OUTROS,
      type: requestData.type || RequestType.SUGESTOES,
      status: Status.PENDENTE,
      priority: requestData.priority || Priority.MEDIA,
      photos: requestData.photos || [],
      authorId: requestData.authorId,
      authorName,
      createdAt: new Date().toISOString(),
      likes: [],
      adminResponse: "",
      statusUpdatedAt: "",
      comments: []
    };

    // Atualização otimista
    setRequests(prev => [newRequest, ...prev]);

    const { data, error } = await supabase.from("requests").insert({
      title: requestData.title,
      description: requestData.description,
      author_id: requestData.authorId
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário para o ID real do banco
      setRequests(prev => prev.map(r => r.id === tempId ? { ...r, id: data.id, createdAt: data.created_at } : r));

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
      // Reverte em caso de erro
      setRequests(prev => prev.filter(r => r.id !== tempId));
    }
  };

  const updateRequest = async (updatedRequest: Request) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));

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
      setRequests(previousRequests);
    }
  };

  const deleteRequest = async (requestId: string) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.filter(r => r.id !== requestId));

    const { error } = await supabase.from("requests").delete().eq("id", requestId);
    if (!error) {
      addToast("Sugestão excluída.", "success");
    } else {
      addToast("Erro ao excluir sugestão.", "error");
      setRequests(previousRequests);
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    newStatus: Status,
    adminResponse?: string,
    userId?: string
  ) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: newStatus,
          adminResponse: adminResponse || req.adminResponse,
          statusUpdatedAt: new Date().toISOString()
        };
      }
      return req;
    }));

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

      const request = previousRequests.find(r => r.id === requestId);
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
      setRequests(previousRequests);
    }
  };

  const toggleRequestLike = async (requestId: string, userId: string) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const hasLiked = req.likes.includes(userId);
        return {
          ...req,
          likes: hasLiked ? req.likes.filter(id => id !== userId) : [...req.likes, userId]
        };
      }
      return req;
    }));

    const { data } = await supabase
      .from("request_likes")
      .select("*")
      .eq("request_id", requestId)
      .eq("user_id", userId)
      .maybeSingle();

    try {
      if (data) {
        const { error } = await supabase.from("request_likes").delete().eq("request_id", requestId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("request_likes").insert({ request_id: requestId, user_id: userId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Erro ao curtir:", err);
      setRequests(previousRequests);
    }
  };

  const addComment = async (requestId: string, commentData: Omit<Comment, "id" | "createdAt">) => {
    const tempId = `temp-${Date.now()}`;
    const previousRequests = [...requests];

    const newComment: Comment = {
      id: tempId,
      authorId: commentData.authorId,
      authorName: commentData.authorName,
      houseNumber: commentData.houseNumber,
      text: commentData.text,
      createdAt: new Date().toISOString(),
      type: commentData.type || 'regular',
      newStatus: commentData.newStatus || null,
      likes: []
    };

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          comments: [...req.comments, newComment]
        };
      }
      return req;
    }));

    const { data, error } = await supabase.from("comments").insert({
      request_id: requestId,
      author_id: commentData.authorId,
      text: commentData.text,
      type: commentData.type || 'regular'
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário do comentário para o ID real do banco
      setRequests(prev => prev.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            comments: req.comments.map(c => c.id === tempId ? { ...c, id: data.id, createdAt: data.created_at } : c)
          };
        }
        return req;
      }));

      const request = previousRequests.find((r) => r.id === requestId);
      if (request) {
        // 1. Notificação geral de novo comentário
        await addNotification({
          message: `${commentData.authorName} comentou em: "${request.title}"`,
          userId: "all",
          requestId: request.id,
        });

        // 2. Detecção e envio de notificações para usuários mencionados (@Nome ou @usuario)
        const mentionRegex = /@([A-Za-zÀ-ÖØ-öø-ÿ0-9._-]+)/g;
        let match;
        const mentionedUserIds = new Set<string>();

        while ((match = mentionRegex.exec(commentData.text)) !== null) {
          const cleanName = match[1].toLowerCase();
          
          // Encontra o usuário correspondente (desconsiderando o próprio autor)
          const mentionedUser = users.find(u => 
            u.id !== commentData.authorId && 
            (u.name.split(' ')[0].toLowerCase() === cleanName || 
             u.username.toLowerCase() === cleanName)
          );

          if (mentionedUser && !mentionedUserIds.has(mentionedUser.id)) {
            mentionedUserIds.add(mentionedUser.id);
            
            // Grava a notificação interna para o usuário mencionado
            await addNotification({
              message: `${commentData.authorName} mencionou você na demanda: "${request.title}"`,
              userId: mentionedUser.id,
              requestId: request.id,
            });

            // Dispara a Push Notification para o celular do morador
            sendPushNotification(
              mentionedUser.id,
              "Você foi mencionado",
              `${commentData.authorName} mencionou você em "${request.title}"`
            );
          }
        }
      }
      addToast("Comentário adicionado.", "success");
    } else {
      addToast("Erro ao adicionar comentário.", "error");
      setRequests(previousRequests);
    }
  };

  const deleteComment = async (requestId: string, commentId: string) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          comments: req.comments.filter(c => c.id !== commentId)
        };
      }
      return req;
    }));

    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      addToast("Erro ao excluir comentário.", "error");
      setRequests(previousRequests);
    } else {
      addToast("Comentário excluído.", "success");
    }
  };

  const updateComment = async (requestId: string, commentId: string, newText: string) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          comments: req.comments.map(c => c.id === commentId ? { ...c, text: newText } : c)
        };
      }
      return req;
    }));

    const { error } = await supabase
      .from("comments")
      .update({ text: newText })
      .eq("id", commentId);

    if (error) {
      addToast("Erro ao atualizar comentário.", "error");
      setRequests(previousRequests);
    } else {
      addToast("Comentário atualizado.", "success");
    }
  };

  const toggleCommentLike = async (requestId: string, commentId: string, userId: string) => {
    const previousRequests = [...requests];

    // Atualização otimista
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          comments: req.comments.map(c => {
            if (c.id === commentId) {
              const hasLiked = c.likes.includes(userId);
              return {
                ...c,
                likes: hasLiked ? c.likes.filter(id => id !== userId) : [...c.likes, userId]
              };
            }
            return c;
          })
        };
      }
      return req;
    }));

    const { data } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    try {
      if (data) {
        const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Erro ao curtir comentário:", err);
      setRequests(previousRequests);
    }
  };

  const markAllNotificationsAsRead = async (userId: string) => {
    const unread = notifications.filter((n) => !n.readBy?.includes(userId));
    if (unread.length === 0) return;

    // Atualização otimista local imediata
    setNotifications(prev => prev.map(n => {
      if (!n.readBy.includes(userId)) {
        return { ...n, readBy: [...n.readBy, userId] };
      }
      return n;
    }));

    try {
      const inserts = unread.map(n => ({
        notification_id: n.id,
        user_id: userId
      }));

      const { error } = await supabase.from("notification_reads").insert(inserts);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao marcar como lidas:", err);
      fetchNotificationsDebounced(); // Restaura em caso de erro
    }
  };

  const addReservation = async (reservation: Omit<Reservation, "id" | "createdAt">) => {
    const tempId = `temp-${Date.now()}`;
    const user = users.find(u => u.id === reservation.userId);
    const newRes: Reservation = {
      id: tempId,
      userId: reservation.userId,
      userName: user?.name || "Desconhecido",
      houseNumber: Number(user?.houseNumber || 0),
      area: reservation.area,
      date: reservation.date,
      createdAt: new Date().toISOString()
    };

    // Atualização otimista local imediata
    setReservations(prev => [...prev, newRes]);

    const { data, error } = await supabase.from("reservations").insert({
      user_id: reservation.userId,
      area: reservation.area,
      date: reservation.date
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário para o ID real do banco
      setReservations(prev => prev.map(r => r.id === tempId ? {
        ...r,
        id: data.id,
        createdAt: data.created_at
      } : r));
      addToast("Reserva realizada com sucesso!", "success");
    } else {
      addToast("Área ocupada ou erro na reserva.", "error");
      // Reverte em caso de erro
      setReservations(prev => prev.filter(r => r.id !== tempId));
    }
  };

  const cancelReservation = async (reservationId: string) => {
    const previousReservations = [...reservations];

    // Atualização otimista local imediata
    setReservations(prev => prev.filter(r => r.id !== reservationId));

    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (!error) {
      addToast("Reserva cancelada.", "info");
    } else {
      addToast("Erro ao cancelar reserva.", "error");
      // Reverte em caso de erro
      setReservations(previousReservations);
    }
  };

  const addOccurrence = async (data: Omit<Occurrence, 'id' | 'createdAt' | 'status'>) => {
    const tempId = `temp-${Date.now()}`;
    const newOcc: Occurrence = {
      id: tempId,
      authorId: data.authorId,
      authorName: data.authorName,
      houseNumber: data.houseNumber,
      phone: data.phone || "",
      subject: data.subject,
      description: data.description,
      createdAt: new Date().toISOString(),
      photos: data.photos || [],
      status: 'Aberto',
      adminResponse: ""
    };

    // Atualização otimista local imediata
    setOccurrences(prev => [newOcc, ...prev]);

    const { data: dbData, error } = await supabase.from("occurrences").insert({
      author_id: data.authorId,
      subject: data.subject,
      description: data.description,
      image_url: data.photos && data.photos.length > 0 ? data.photos[0] : null,
      status: 'Aberto'
    }).select().single();

    if (!error && dbData) {
      // Atualiza o ID temporário para o ID real do banco
      setOccurrences(prev => prev.map(o => o.id === tempId ? { ...o, id: dbData.id, createdAt: dbData.created_at } : o));
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
      // Reverte em caso de erro
      setOccurrences(prev => prev.filter(o => o.id !== tempId));
    }
  };

  const updateOccurrence = async (id: string, data: Partial<Occurrence>) => {
    const previousOccurrences = [...occurrences];

    // Atualização otimista local imediata
    setOccurrences(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: data.status !== undefined ? data.status : o.status,
          adminResponse: data.adminResponse !== undefined ? data.adminResponse : o.adminResponse
        };
      }
      return o;
    }));

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.adminResponse !== undefined) updateData.admin_response = data.adminResponse;

    const { error } = await supabase.from("occurrences").update(updateData).eq("id", id);

    if (!error) {
      if (data.adminResponse) {
        const occurrence = previousOccurrences.find(o => o.id === id);
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
      // Reverte em caso de erro
      setOccurrences(previousOccurrences);
    }
  };

  const deleteOccurrence = async (id: string) => {
    const previousOccurrences = [...occurrences];

    // Atualização otimista local imediata
    setOccurrences(prev => prev.filter(o => o.id !== id));

    const { error } = await supabase.from("occurrences").delete().eq("id", id);
    if (!error) {
      addToast("Ocorrência excluída.", "info");
    } else {
      addToast("Erro ao excluir ocorrência.", "error");
      // Reverte em caso de erro
      setOccurrences(previousOccurrences);
    }
  };

  const addVoting = async (voting: Omit<Voting, 'id' | 'votes' | 'createdAt'>) => {
    const tempId = `temp-${Date.now()}`;
    const newVoting: Voting = {
      id: tempId,
      title: voting.title,
      description: voting.description,
      options: voting.options,
      startDate: voting.startDate,
      endDate: voting.endDate,
      allowMultipleChoices: voting.allowMultipleChoices,
      createdBy: voting.createdBy,
      createdAt: new Date().toISOString(),
      votes: []
    };

    // Atualização otimista local imediata
    setVotings(prev => [newVoting, ...prev]);

    const { data, error } = await supabase.from("votings").insert({
      title: voting.title,
      description: voting.description,
      options: voting.options,
      start_date: voting.startDate,
      end_date: voting.endDate,
      allow_multiple_choices: voting.allowMultipleChoices,
      created_by: voting.createdBy
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário para o ID real do banco
      setVotings(prev => prev.map(v => v.id === tempId ? { ...v, id: data.id, createdAt: data.created_at } : v));

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
      // Reverte em caso de erro
      setVotings(prev => prev.filter(v => v.id !== tempId));
    }
  };

  const deleteVoting = async (id: string) => {
    const previousVotings = [...votings];

    // Atualização otimista local imediata
    setVotings(prev => prev.filter(v => v.id !== id));

    const { error } = await supabase.from("votings").delete().eq("id", id);
    if (!error) {
      addToast('Votação excluída.', 'info');
    } else {
      addToast('Erro ao excluir votação.', 'error');
      // Reverte em caso de erro
      setVotings(previousVotings);
    }
  };

  const castVote = async (votingId: string, optionIds: string[], currentUser: User) => {
    if (!currentUser) return;

    if (currentUser.role === Role.INQUILINO) {
      addToast('Inquilinos não têm permissão para participar de votações.', 'error');
      return;
    }

    const previousVotings = [...votings];

    // Atualização otimista local imediata do voto
    setVotings(prev => prev.map(v => {
      if (v.id === votingId) {
        const filteredVotes = v.votes.filter(vt => vt.userId !== currentUser.id);
        const newVote = {
          userId: currentUser.id,
          userName: currentUser.name,
          houseNumber: currentUser.houseNumber,
          optionIds,
          timestamp: new Date().toISOString()
        };
        return {
          ...v,
          votes: [...filteredVotes, newVote]
        };
      }
      return v;
    }));

    const { error } = await supabase.from("votes").insert({
      voting_id: votingId,
      user_id: currentUser.id,
      option_ids: optionIds
    });

    if (!error) {
      addToast('Voto registrado com sucesso!', 'success');
    } else {
      // Reverte em caso de erro
      setVotings(previousVotings);
      if (error.message?.includes("votes_voting_id_user_id_key") || error.code === "23505") {
        addToast('Sua unidade já registrou um voto nesta votação.', 'error');
      } else {
        addToast('Erro ao registrar voto.', 'error');
      }
    }
  };

  const addNotice = async (notice: Omit<Notice, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => {
    const tempId = `temp-${Date.now()}`;
    const newNotice: Notice = {
      id: tempId,
      title: notice.title,
      content: notice.content,
      createdAt: new Date().toISOString(),
      likes: [],
      dislikes: [],
      authorId: "admin",
      authorName: "Administração",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    };

    // Atualização otimista local imediata
    setNotices(prev => [newNotice, ...prev]);

    const { data, error } = await supabase.from("notices").insert({
      title: notice.title,
      content: notice.content
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário para o ID real do banco
      setNotices(prev => prev.map(n => n.id === tempId ? {
        ...n,
        id: data.id,
        createdAt: data.created_at,
        startDate: data.created_at,
        endDate: data.created_at
      } : n));

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
      // Reverte em caso de erro
      setNotices(prev => prev.filter(n => n.id !== tempId));
    }
  };

  const deleteNotice = async (noticeId: string) => {
    const previousNotices = [...notices];

    // Atualização otimista local imediata
    setNotices(prev => prev.filter(n => n.id !== noticeId));

    const { error } = await supabase.from("notices").delete().eq("id", noticeId);
    if (!error) {
      addToast('Aviso removido.', 'info');
    } else {
      addToast('Erro ao remover aviso.', 'error');
      // Reverte em caso de erro
      setNotices(previousNotices);
    }
  };

  const toggleNoticeReaction = async (noticeId: string, userId: string, type: 'like' | 'dislike') => {
    const previousNotices = [...notices];

    // Atualização otimista local imediata das reações do aviso
    setNotices(prev => prev.map(n => {
      if (n.id === noticeId) {
        const hasLike = n.likes.includes(userId);
        const hasDislike = n.dislikes.includes(userId);
        
        let newLikes = [...n.likes];
        let newDislikes = [...n.dislikes];

        if (type === 'like') {
          if (hasLike) {
            newLikes = newLikes.filter(id => id !== userId);
          } else {
            newLikes.push(userId);
            if (hasDislike) {
              newDislikes = newDislikes.filter(id => id !== userId);
            }
          }
        } else {
          if (hasDislike) {
            newDislikes = newDislikes.filter(id => id !== userId);
          } else {
            newDislikes.push(userId);
            if (hasLike) {
              newLikes = newLikes.filter(id => id !== userId);
            }
          }
        }

        return {
          ...n,
          likes: newLikes,
          dislikes: newDislikes
        };
      }
      return n;
    }));

    const { data } = await supabase
      .from("notice_reactions")
      .select("*")
      .eq("notice_id", noticeId)
      .eq("user_id", userId)
      .maybeSingle();

    try {
      if (data) {
        if (data.type === type) {
          const { error } = await supabase.from("notice_reactions").delete().eq("notice_id", noticeId).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("notice_reactions").update({ type }).eq("notice_id", noticeId).eq("user_id", userId);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("notice_reactions").insert({ notice_id: noticeId, user_id: userId, type });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Erro ao reagir ao aviso:", err);
      // Reverte em caso de erro
      setNotices(previousNotices);
    }
  };

  const addDocument = async (docData: Omit<DocumentType, 'id' | 'createdAt'>) => {
    const tempId = `temp-${Date.now()}`;
    const newDoc: DocumentType = {
      id: tempId,
      title: docData.title,
      description: docData.description || "",
      category: docData.category,
      fileUrl: docData.fileUrl,
      fileName: docData.fileName,
      fileType: docData.fileType,
      fileSize: docData.fileSize,
      uploadedBy: docData.uploadedBy,
      createdAt: new Date().toISOString(),
      isPinned: !!docData.isPinned
    };

    // Atualização otimista local imediata
    setDocuments(prev => [newDoc, ...prev]);

    const { data, error } = await supabase.from("documents").insert({
      title: docData.title,
      description: docData.description || "",
      category: docData.category,
      file_url: docData.fileUrl,
      file_name: docData.fileName,
      file_type: docData.fileType,
      file_size: docData.fileSize,
      uploaded_by: docData.uploadedBy,
      is_pinned: !!docData.isPinned
    }).select().single();

    if (!error && data) {
      // Atualiza o ID temporário para o ID real do banco
      setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, id: data.id, createdAt: data.created_at } : d));

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
      // Reverte em caso de erro
      setDocuments(prev => prev.filter(d => d.id !== tempId));
    }
  };

  const updateDocument = async (id: string, data: Partial<DocumentType>) => {
    const previousDocuments = [...documents];

    // Atualização otimista local imediata
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          title: data.title !== undefined ? data.title : d.title,
          description: data.description !== undefined ? data.description : d.description,
          category: data.category !== undefined ? data.category : d.category,
          isPinned: data.isPinned !== undefined ? data.isPinned : d.isPinned
        };
      }
      return d;
    }));

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
      // Reverte em caso de erro
      setDocuments(previousDocuments);
    }
  };

  const deleteDocument = async (id: string) => {
    const previousDocuments = [...documents];

    // Atualização otimista local imediata
    setDocuments(prev => prev.filter(d => d.id !== id));

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (!error) {
      addToast('Documento removido.', 'info');
    } else {
      addToast('Erro ao remover documento.', 'error');
      // Reverte em caso de erro
      setDocuments(previousDocuments);
    }
  };

  const toggleDocumentPin = async (id: string) => {
    const document = documents.find(d => d.id === id);
    if (!document) return;

    const previousDocuments = [...documents];

    // Atualização otimista local imediata
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, isPinned: !d.isPinned };
      }
      return d;
    }));

    const { error } = await supabase
      .from("documents")
      .update({ is_pinned: !document.isPinned })
      .eq("id", id);

    if (!error) {
      addToast(!document.isPinned ? 'Documento fixado no topo!' : 'Documento desfixado.', 'success');
    } else {
      addToast('Erro ao alterar destaque.', 'error');
      // Reverte em caso de erro
      setDocuments(previousDocuments);
    }
  };

  const rotateOldBoletos = async () => {
    try {
      // 1. Busca todos os meses únicos na tabela de boletos
      const { data: allBoletos, error: fetchError } = await supabase
        .from("boletos")
        .select("reference_month");

      if (fetchError || !allBoletos) {
        console.error("Erro ao buscar meses de referência para rotação:", fetchError);
        return;
      }

      // 2. Extrai os meses únicos e ordena em ordem decrescente (mais recente primeiro)
      const uniqueMonths = Array.from(new Set(allBoletos.map(b => b.reference_month)))
        .sort((a, b) => b.localeCompare(a));

      // Se temos 3 ou menos meses, não há necessidade de rotação
      if (uniqueMonths.length <= 3) return;

      // 3. Os meses antigos são todos aqueles após os 3 primeiros
      const monthsToRotate = uniqueMonths.slice(3);
      console.log("Meses a serem rotacionados:", monthsToRotate);

      for (const oldMonth of monthsToRotate) {
        // Busca os boletos desse mês antigo para extrair as URLs de arquivo
        const { data: boletosToDelete, error: selectError } = await supabase
          .from("boletos")
          .select("file_url")
          .eq("reference_month", oldMonth);

        if (selectError) {
          console.error(`Erro ao buscar boletos para rotação do mês ${oldMonth}:`, selectError);
          continue;
        }

        if (boletosToDelete && boletosToDelete.length > 0) {
          const filePaths = boletosToDelete.map(b => b.file_url).filter(Boolean);
          
          if (filePaths.length > 0) {
            console.log(`Deletando ${filePaths.length} arquivos físicos do storage para o mês ${oldMonth}...`);
            const { error: storageError } = await supabase.storage
              .from("boletos")
              .remove(filePaths);

            if (storageError) {
              console.error(`Erro ao remover arquivos físicos do storage para ${oldMonth}:`, storageError);
            }
          }
        }

        // Deleta as linhas no banco de dados para esse mês
        console.log(`Deletando registros no banco de dados para o mês ${oldMonth}...`);
        const { error: deleteError } = await supabase
          .from("boletos")
          .delete()
          .eq("reference_month", oldMonth);

        if (deleteError) {
          console.error(`Erro ao deletar registros de boletos do banco para ${oldMonth}:`, deleteError);
        } else {
          addToast(`Boletos do período antigo (${oldMonth}) arquivados automaticamente.`, "info");
        }
      }
    } catch (err) {
      console.error("Erro geral na rotação de boletos:", err);
    }
  };

  const addBoleto = async (boleto: Omit<Boleto, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from("boletos").insert({
      house_number: boleto.houseNumber,
      reference_month: boleto.referenceMonth,
      file_url: boleto.fileUrl,
      file_name: boleto.fileName,
      file_size: boleto.fileSize,
      uploaded_by: boleto.uploadedBy
    }).select().single();

    if (error) {
      console.error("Erro ao adicionar boleto:", error);
      throw error;
    }

    // Dispara a rotação de boletos se necessário
    await rotateOldBoletos();

    return data;
  };

  const addBoletos = async (boletosData: Omit<Boleto, 'id' | 'createdAt'>[]) => {
    const inserts = boletosData.map(b => ({
      house_number: b.houseNumber,
      reference_month: b.referenceMonth,
      file_url: b.fileUrl,
      file_name: b.fileName,
      file_size: b.fileSize,
      uploaded_by: b.uploadedBy
    }));

    const { error } = await supabase.from("boletos").insert(inserts);

    if (error) {
      console.error("Erro ao adicionar boletos em lote:", error);
      addToast("Erro ao salvar boletos no banco.", "error");
      throw error;
    }

    // Dispara a rotação de boletos se necessário
    await rotateOldBoletos();

    addToast(`${boletosData.length} boletos cadastrados com sucesso!`, "success");
  };

  const deleteBoletosByMonth = async (month: string) => {
    const previousBoletos = [...boletos];

    // Atualização otimista local imediata
    setBoletos(prev => prev.filter(b => b.referenceMonth !== month));

    // 1. Buscar boletos do mês para obter os file_urls (caminhos no storage)
    const { data: list, error: fetchError } = await supabase
      .from("boletos")
      .select("file_url")
      .eq("reference_month", month);

    if (fetchError) {
      console.error("Erro ao buscar boletos para deleção:", fetchError);
      addToast("Erro ao buscar boletos antigos.", "error");
      setBoletos(previousBoletos);
      return;
    }

    if (list && list.length > 0) {
      const filePaths = list.map(b => b.file_url);
      
      // 2. Deletar os arquivos do storage
      const { error: storageError } = await supabase.storage
        .from("boletos")
        .remove(filePaths);

      if (storageError) {
        console.error("Erro ao remover arquivos antigos do storage:", storageError);
      }
    }

    // 3. Deletar os registros do banco de dados
    const { error: dbError } = await supabase
      .from("boletos")
      .delete()
      .eq("reference_month", month);

    if (dbError) {
      console.error("Erro ao remover registros de boletos do banco:", dbError);
      addToast("Erro ao remover boletos antigos do banco.", "error");
      setBoletos(previousBoletos);
      throw dbError;
    }

    addToast(`Boletos do mês ${month} removidos para reupload.`, "info");
  };

  const getBoletoSignedUrl = async (fileUrl: string) => {
    const { data, error } = await supabase.storage
      .from('boletos')
      .createSignedUrl(fileUrl, 3600); // 1 hora
    if (error || !data) {
      console.error("Erro ao gerar URL assinada:", error);
      return "";
    }
    return data.signedUrl;
  };

  const addBoletoUpload = async (upload: Omit<BoletoUpload, 'id' | 'uploadedAt'>) => {
    const { error } = await supabase.from("boleto_uploads").insert({
      reference_month: upload.referenceMonth,
      uploaded_by: upload.uploadedBy,
      file_name: upload.fileName,
      file_size: upload.fileSize,
      total_files: upload.totalFiles,
      matched_files: upload.matchedFiles
    });

    if (error) {
      console.error("Erro ao salvar log de upload de boleto:", error);
      addToast("Erro ao registrar histórico de upload.", "error");
      throw error;
    }
  };

  const addAlbum = async (albumData: Omit<GalleryAlbum, 'id' | 'createdAt'>) => {
    const tempId = `temp-${Date.now()}`;
    const newAlbum: GalleryAlbum = {
      id: tempId,
      title: albumData.title,
      description: albumData.description || "",
      createdAt: new Date().toISOString(),
      createdBy: albumData.createdBy
    };

    setAlbums(prev => [newAlbum, ...prev]);

    const { data, error } = await supabase.from("gallery_albums").insert({
      title: albumData.title,
      description: albumData.description || "",
      created_by: albumData.createdBy
    }).select().single();

    if (!error && data) {
      setAlbums(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id, createdAt: data.created_at } : a));
      addToast('Álbum criado com sucesso!', 'success');
    } else {
      addToast('Erro ao criar álbum.', 'error');
      setAlbums(prev => prev.filter(a => a.id !== tempId));
    }
  };

  const deleteAlbum = async (id: string) => {
    const previousAlbums = [...albums];

    setAlbums(prev => prev.filter(a => a.id !== id));

    const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
    if (!error) {
      addToast('Álbum excluído.', 'info');
    } else {
      addToast('Erro ao excluir álbum.', 'error');
      setAlbums(previousAlbums);
    }
  };

  const addGalleryMedia = async (mediaData: Omit<GalleryMedia, 'id' | 'createdAt'>) => {
    const tempId = `temp-${Date.now()}`;
    const newMedia: GalleryMedia = {
      id: tempId,
      albumId: mediaData.albumId,
      url: mediaData.url,
      type: mediaData.type,
      createdAt: new Date().toISOString(),
      createdBy: mediaData.createdBy
    };

    setGalleryMedia(prev => [...prev, newMedia]);

    const { data, error } = await supabase.from("gallery_media").insert({
      album_id: mediaData.albumId,
      url: mediaData.url,
      type: mediaData.type,
      created_by: mediaData.createdBy
    }).select().single();

    if (!error && data) {
      setGalleryMedia(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, createdAt: data.created_at } : m));
    } else {
      addToast('Erro ao adicionar arquivo à galeria.', 'error');
      setGalleryMedia(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const deleteGalleryMedia = async (id: string) => {
    const previousMedia = [...galleryMedia];

    setGalleryMedia(prev => prev.filter(m => m.id !== id));

    const { error } = await supabase.from("gallery_media").delete().eq("id", id);
    if (!error) {
      addToast('Arquivo removido da galeria.', 'info');
    } else {
      addToast('Erro ao remover arquivo da galeria.', 'error');
      setGalleryMedia(previousMedia);
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
    deleteNotifications,
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
    boletos,
    addBoleto,
    addBoletos,
    deleteBoletosByMonth,
    getBoletoSignedUrl,
    boletoUploads,
    addBoletoUpload,
    albums,
    addAlbum,
    deleteAlbum,
    galleryMedia,
    addGalleryMedia,
    deleteGalleryMedia,
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
    documents,
    boletos,
    boletoUploads,
    albums,
    galleryMedia
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
