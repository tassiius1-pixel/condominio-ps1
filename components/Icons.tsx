import React from "react";

// Helper genérico para criar ícones minimalistas estilo Lucide
const Icon = ({ path, className }: { path: string; className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

/* ============================
   ÍCONES USADOS NO HEADER
============================ */

export const LayoutDashboardIcon = (props: any) => (
  <Icon {...props} path="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 12h7v9H3z" />
);

export const EditIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
  />
);

export const BarChartIcon = (props: any) => (
  <Icon {...props} path="M12 20V10M18 20V4M6 20v-6" />
);

export const UsersIcon = (props: any) => (
  <Icon
    {...props}
    path="M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 1 3-3.87M7 7a4 4 0 1 1 8 0M5.5 20a6 6 0 0 1 13 0"
  />
);

export const BellIcon = (props: any) => (
  <Icon
    {...props}
    path="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
  />
);

export const LogOutIcon = (props: any) => (
  <Icon
    {...props}
    path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 7-4-4m4 4-4 4m4-4H9"
  />
);

export const UploadIcon = (props: any) => (
  <Icon {...props} path="M4 17v2h16v-2M12 12V3m0 0 4 4m-4-4L8 7" />
);

export const TrashIcon = (props: any) => (
  <Icon
    {...props}
    path="M3 6h18M8 6V4h8v2m-9 3v9m5-9v9m5-9v9"
  />
);

export const XIcon = (props: any) => (
  <Icon {...props} path="M18 6 6 18M6 6l12 12" />
);

/* ============================
   ÍCONES DE PRIORIDADE / STATUS
============================ */

export const LoaderCircleIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 2a10 10 0 1 1-7.07 17.07"
  />
);

export const StatusChangeIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 5v14m7-7H5"
  />
);

export const CommentIcon = (props: any) => (
  <Icon
    {...props}
    path="M21 11.5a8.38 8.38 0 0 1-.9 3.8A8.5 8.5 0 1 1 11.5 2v0a8.38 8.38 0 0 1 3.8.9L22 2z"
  />
);

export const PlusIcon = (props: any) => (
  <Icon {...props} path="M12 5v14m7-7H5" />
);

/* ============================
   ÍCONES DO CARD (TIPOS)
============================ */

// Elétrica
export const BoltIcon = (props: any) => (
  <Icon {...props} path="M13 2 3 14h7l-1 8 10-12h-7z" />
);

// Hidráulica
export const DropletIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 2.5C12 2.5 6 9 6 13.5a6 6 0 0 0 12 0C18 9 12 2.5 12 2.5z"
  />
);

// Predial
export const WrenchScrewdriverIcon = (props: any) => (
  <Icon
    {...props}
    path="M14.7 6.3 9 12l3 3 5.7-5.7a4 4 0 1 0-3-3Z M2 22l6-6"
  />
);

// Segurança
export const ShieldCheckIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 2 4 5v6c0 5 3.4 9.8 8 11 4.6-1.2 8-6 8-11V5z M9 12l2 2 4-4"
  />
);

// Incêndio
export const FlameIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 2C8 6 6 9 6 12a6 6 0 0 0 12 0c0-3-2-6-6-10z"
  />
);

// Ar condicionado
export const WindIcon = (props: any) => (
  <Icon
    {...props}
    path="M3 12h13a3 3 0 1 0 0-6M3 18h9a3 3 0 1 1 0-6"
  />
);

// Jardinagem
export const LeafIcon = (props: any) => (
  <Icon
    {...props}
    path="M4 20s6-2 10-6 6-8 4-10-6 0-10 4-6 10-4 12z"
  />
);

// Limpeza
export const SparklesIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 3v3m0 9v3M3 12h3m9 0h3M7 7l2 2m6 6 2 2m0-10-2 2m-6 6-2 2"
  />
);

// Portões
export const DoorOpenIcon = (props: any) => (
  <Icon
    {...props}
    path="M3 4h8v16H3zM11 4l10 2v12l-10 2z"
  />
);

// Piscina
export const WavesIcon = (props: any) => (
  <Icon
    {...props}
    path="M3 16c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2M3 12c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"
  />
);

// Ícone de Imagem (se quiser usar)
export const ImageIcon = (props: any) => (
  <Icon
    {...props}
    path="M4 5h16v14H4z M8 11l3 3 2-2 5 5"
  />
);

// Chevron Left (seta esquerda)
export const ChevronLeftIcon = (props: any) => (
  <Icon {...props} path="M15 18 9 12l6-6" />
);

// Chevron Right (seta direita)
export const ChevronRightIcon = (props: any) => (
  <Icon {...props} path="M9 18l6-6-6-6" />
);

// Ícone de alerta (triângulo)
export const AlertTriangleIcon = (props: any) => (
  <Icon
    {...props}
    path="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01"
  />
);

// Ícone de check (círculo)
export const CheckCircleIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z M9 12l2 2 4-4"
  />
);

// Ícone de informação
export const InfoIcon = (props: any) => (
  <Icon
    {...props}
    path="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 4h.01M11 10h2v6h-2"
  />
);

