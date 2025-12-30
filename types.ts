export enum Role {
  MORADOR = 'morador',
  GESTAO = 'gestao',
  ADMIN = 'admin',
  SINDICO = 'sindico',
  SUBSINDICO = 'subsindico',
}

export enum Status {
  PENDENTE = 'Pendente',
  EM_ANALISE = 'Em Análise',
  APROVADA = 'Aprovada',
  RECUSADA = 'Recusada',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'Concluído',
  EM_VOTACAO = 'Em Votação',
}

export enum Priority {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  URGENTE = 'Urgente',
}

export enum Sector {
  CHURRASCO_1 = 'Area de churrasco 1',
  CHURRASCO_2 = 'Area de churrasco 2',
  SALAO_FESTAS = 'Salão de festas',
  PISCINA_AREA = 'Piscina',
  QUADRA_VOLEI = 'Quadra de vôlei',
  QUADRA_FUTEBOL = 'Quadra de futebol',
  PARQUINHO = 'Parquinho',
  BANHEIROS = 'Banheiros',
  RUAS = 'Ruas',
  PORTARIA = 'Portaria',
  JARDINS = 'Jardins',
  OUTROS = 'Outros'
}

export enum RequestType {
  ELETRICA = 'Elétrica',
  HIDRAULICA = 'Hidráulica',
  PREDIAL = 'Predial',
  SEGURANCA = 'Sistemas de segurança',
  INCENDIO = 'Sistemas de incêndio',
  AR_CONDICIONADO = 'Ar condicionado e ventilação',
  JARDINAGEM = 'Jardinagem e paisagismo',
  LIMPEZA = 'Limpeza e conservação',
  PORTOES = 'Portões',
  PISCINA = 'Piscina',
  PEQUENOS_REPAROS = 'Pequenos reparos',
  SUGESTOES = 'Sugestões',
}

export interface User {
  id: string;
  name: string;
  username: string;
  cpf: string;
  houseNumber: number;
  password?: string;
  role: Role;
  email: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  houseNumber?: number;
  text: string;
  createdAt: string;
  type?: 'regular' | 'status_change';
  newStatus?: Status;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  sector: Sector;
  type: RequestType;
  status: Status;
  priority: Priority;
  photos: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  comments: Comment[];
  likes?: string[];
  adminResponse?: string;
  statusUpdatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;       // pode ser "all"
  requestId: string;    // pode ser ""
  message: string;      // <-- CORRETO
  createdAt: string;
  readBy: string[];     // quem já leu
}




export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  area: 'churrasco1' | 'churrasco2' | 'salao_festas';
  houseNumber: number;
  createdAt: string;
}

export interface Occurrence {
  id: string;
  authorId: string;
  authorName: string;
  houseNumber: number;
  phone: string;
  subject: string;
  description: string;
  createdAt: string;
  photos?: string[];
  status: 'Aberto' | 'Resolvido';
  adminResponse?: string;
  resolvedAt?: string;
}

export interface VotingOption {
  id: string;
  text: string;
  imageUrl?: string; // Optional image for visual voting
}

export interface Vote {
  userId: string;
  userName: string;
  houseNumber: number;
  optionIds: string[];
  timestamp: string;
}

export interface Voting {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allowMultipleChoices: boolean;
  options: VotingOption[];
  votes: Vote[];
  createdBy: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  photos?: string[];
  likes: string[];    // IDs of users who liked
  dislikes: string[]; // IDs of users who disliked
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  isPinned?: boolean;
}

export type View = "home" | "dashboard" | "users" | "reports" | "reservations" | "occurrences" | "voting" | "documents";
