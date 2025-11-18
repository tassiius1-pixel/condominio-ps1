export enum Role {
  MORADOR = 'morador',
  GESTAO = 'gestao',
  ADMIN = 'admin',
}

export enum Status {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'Concluído',
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
  JARDINS = 'Jardins'
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
}

export interface User {
  id: string;
  name: string;
  username: string;
  cpf: string;
  houseNumber: number;
  password?: string;
  role: Role;
  email: string; // <-- ADICIONADO
}


export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
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
}

export interface Notification {
  id: string;
  message: string;     // texto da notificação
  type: string;        // tipo da notificação ("request", "info", etc)
  createdAt: string;   // ISO date string
  readBy: string[];    // lista de usuários que já leram
}


export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
