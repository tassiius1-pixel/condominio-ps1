import React from 'react';
import { Request, Status } from '../types';
import Card from './Card';

// Skeleton component for loading state
const CardSkeleton: React.FC = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
        <div className="flex justify-between items-start">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
        <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-28"></div>
            </div>
        </div>
    </div>
);

interface ColumnProps {
    status: Status;
    requests: Request[];
    loading: boolean;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: () => void;
    onDragStartCard: (requestId: string) => void;
}

const statusStyles = {
    [Status.PENDENTE]: {
        bg: 'bg-yellow-50',
        headerBg: 'bg-yellow-100',
        title: 'text-yellow-800',
    },
    [Status.EM_ANDAMENTO]: {
        bg: 'bg-blue-50',
        headerBg: 'bg-blue-100',
        title: 'text-blue-800',
    },
    [Status.CONCLUIDO]: {
        bg: 'bg-green-100',
        headerBg: 'bg-green-200',
        title: 'text-green-900',
    },
};


const Column: React.FC<ColumnProps> = ({ status, requests, loading, onDragOver, onDrop, onDragStartCard }) => {
    const styles = statusStyles[status];

    return (
        <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`rounded-xl shadow-md ${styles.bg}`}
        >
            <div className={`px-5 py-3 rounded-t-xl ${styles.headerBg}`}>
                <h3 className={`text-lg font-bold ${styles.title}`}>{status} ({loading ? '...' : requests.length})</h3>
            </div>
            <div className="p-5 space-y-4">
                {loading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : requests.length > 0 ? (
                    requests.map(request => (
                        <Card key={request.id} request={request} onDragStart={onDragStartCard} />
                    ))
                ) : (
                    <div className="text-center py-10 px-4 text-gray-500">
                        <p>Nenhuma pendência aqui.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Column;