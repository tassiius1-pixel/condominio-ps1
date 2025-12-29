import { Status } from "../types";

export interface StatusStyle {
    bg: string;
    text: string;
    border: string;
    icon: string;
}

export const getStatusStyle = (status: Status | string): StatusStyle => {
    switch (status) {
        case Status.PENDENTE:
            return {
                bg: 'bg-slate-100',
                text: 'text-slate-600',
                border: 'border-slate-200',
                icon: '⏳'
            };
        case Status.EM_ANALISE:
            return {
                bg: 'bg-indigo-100',
                text: 'text-indigo-700',
                border: 'border-indigo-200',
                icon: '🔍'
            };
        case Status.APROVADA:
            return {
                bg: 'bg-emerald-100',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
                icon: '✅'
            };
        case Status.RECUSADA:
            return {
                bg: 'bg-rose-100',
                text: 'text-rose-700',
                border: 'border-rose-200',
                icon: '❌'
            };
        case Status.EM_ANDAMENTO:
            return {
                bg: 'bg-amber-100',
                text: 'text-amber-700',
                border: 'border-amber-200',
                icon: '🏗️'
            };
        case Status.CONCLUIDO:
            return {
                bg: 'bg-sky-100',
                text: 'text-sky-700',
                border: 'border-sky-200',
                icon: '🎉'
            };
        case Status.EM_VOTACAO:
            return {
                bg: 'bg-violet-100',
                text: 'text-violet-700',
                border: 'border-violet-200',
                icon: '🗳️'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                border: 'border-gray-200',
                icon: '•'
            };
    }
};
