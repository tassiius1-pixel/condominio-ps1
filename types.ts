// ROLES
export enum Role {
  MORADOR = 'morador',
  GESTAO = 'gestao',
  ADMIN = 'admin',
}

// STATUS
export enum Status {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'Concluído',
}

// PRIORIDADE
export enum Priority {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  URGENTE = 'Urgente',
}

// SETORES
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
  JARDINS = 'Jardins'
}

// TIPO DE MANUTENÇÃO
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
}

// USUÁRIO
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

// TIPO DO COMENTÁRIO (NORMAL OU MUDANÇA DE STATUS)
export type CommentType = "manual" | "status-change";

// COMENTÁRIO / HISTÓRICO
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;              // comentário ou justificativa da mudança
  createdAt: string;
  type: CommentType;         // "manual" ou "status-change"
  fromStatus?: Status;       // usado quando muda status
  toStatus?: Status;         // usado quando muda status
}

// PENDÊNCIA
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
  comments: Comment[];       // agora suporta histórico completo
}

// NOTIFICAÇÃO
export interface Notification {
  id: string;
  userId: string;     
  requestId: string;  
  message: string;
  createdAt: string;
  readBy: string[];
}

// TOAST (SNACKBAR)
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
