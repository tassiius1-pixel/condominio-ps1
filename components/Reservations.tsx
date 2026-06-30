import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Reservation, Role } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

import ConfirmModal from './ConfirmModal';
import AdminReservationModal from './reservations/AdminReservationModal';
import CalendarGrid from './reservations/CalendarGrid';
import FacilityList from './reservations/FacilityList';
import Skeleton from './Skeleton';

interface ReservationsProps {
    setView?: (view: any) => void;
}

const Reservations: React.FC<ReservationsProps> = ({ setView }) => {
    const { reservations, addReservation, cancelReservation, addToast, loading } = useData();
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
    const detailsRef = React.useRef<HTMLDivElement>(null);

    // Admin Modal State
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [pendingArea, setPendingArea] = useState<'churrasco1' | 'churrasco2' | 'salao_festas' | null>(null);
    const [direction, setDirection] = useState<'forward' | 'backward' | null>(null);

    React.useEffect(() => {
        if (selectedDate && detailsRef.current) {
            setTimeout(() => {
                detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }, [selectedDate]);

    const handlePrevMonth = () => {
        setDirection('backward');
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDirection('forward');
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isDateDisabled = (date: Date, type: 'churrasco' | 'salao') => {
        // Admin, Sindico and Subsindico bypass all date restrictions
        if (currentUser?.role === Role.ADMIN || currentUser?.role === Role.SINDICO || currentUser?.role === Role.SUBSINDICO) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < today) return true;

        const diffTime = Math.abs(checkDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (type === 'churrasco') {
            return diffDays > 14;
        } else {
            return diffDays > 180;
        }
    };

    const getReservationsForDate = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        return reservations.filter(r => r.date === dateString);
    };

    const processReservation = async (area: 'churrasco1' | 'churrasco2' | 'salao_festas', houseNumber: number, userName: string) => {
        if (!selectedDate || !currentUser) return;

        const dateString = selectedDate.toISOString().split('T')[0];
        const existingReservations = getReservationsForDate(selectedDate);

        // Regra de Exclusividade (Por Casa) - Desabilitada para perfis administrativos
        const isAdminOrSindicoOrSub = currentUser.role === Role.ADMIN || currentUser.role === Role.SINDICO || currentUser.role === Role.SUBSINDICO;
        const myHouseReservations = existingReservations.filter(r => r.houseNumber === houseNumber);

        if (!isAdminOrSindicoOrSub) {
            if (area === 'salao_festas') {
                if (myHouseReservations.some(r => r.area.includes('churrasco'))) {
                    addToast('Esta unidade já reservou uma churrasqueira para este dia.', 'error');
                    return;
                }
            } else {
                if (myHouseReservations.some(r => r.area === 'salao_festas')) {
                    addToast('Esta unidade já reservou o Salão de Festas para este dia.', 'error');
                    return;
                }
            }
        }

        // Verificar disponibilidade da área específica
        if (existingReservations.some(r => r.area === area)) {
            addToast('Esta área já está reservada para este dia.', 'error');
            return;
        }

        await addReservation({
            userId: currentUser.id,
            userName: userName,
            houseNumber: houseNumber,
            date: dateString,
            area,
        });

        // Close modal if it was open
        setIsAdminModalOpen(false);
        setPendingArea(null);
    };

    const handleReserve = async (area: 'churrasco1' | 'churrasco2' | 'salao_festas') => {
        if (!selectedDate || !currentUser) return;

        // Admin, Sindico and Subsindico logic
        if (currentUser.role === Role.ADMIN || currentUser.role === Role.SINDICO || currentUser.role === Role.SUBSINDICO) {
            setPendingArea(area);
            setIsAdminModalOpen(true);
            return;
        }

        // Resident logic
        await processReservation(area, currentUser.houseNumber, currentUser.name);
    };

    const handleAdminConfirm = (houseNumber: number, userName: string) => {
        if (pendingArea) {
            processReservation(pendingArea, houseNumber, userName);
        }
    };

    const handleCancelClick = (reservation: Reservation) => {
        if (!currentUser) return;

        const isOwner = reservation.userId === currentUser.id;
        const canCancelAny = [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

        if (isOwner || canCancelAny) {
            setReservationToCancel(reservation);
        } else {
            addToast('Você não tem permissão para cancelar esta reserva.', 'error');
        }
    };

    const confirmCancel = async () => {
        if (reservationToCancel) {
            await cancelReservation(reservationToCancel.id);
            setReservationToCancel(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48 rounded-lg" />
                        <Skeleton className="h-4 w-64 rounded-lg" />
                    </div>
                    <Skeleton className="h-12 w-48 rounded-xl" />
                </div>
                <div className="flex flex-col lg:flex-row gap-8">
                    <Skeleton className="flex-1 h-[500px] rounded-3xl" />
                    <div className="w-full lg:w-96 space-y-4">
                        <Skeleton className="h-48 w-full rounded-3xl" />
                        <Skeleton className="h-48 w-full rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {setView && (
                        <button
                            onClick={() => setView('home')}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 touch-active shrink-0"
                            title="Voltar para o Início"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Reservas</h1>
                        <p className="text-gray-500 text-[10px] md:text-sm mt-1 font-semibold leading-tight">Gerencie e visualize a disponibilidade das áreas comuns.</p>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                        onClick={() => {
                            setDirection(null);
                            setCurrentDate(new Date());
                            setSelectedDate(new Date());
                        }}
                        className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-gray-200 transition-all shadow-sm active:scale-95"
                    >
                        Hoje
                    </button>
                    <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition active:scale-90">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="px-4 text-sm font-bold text-gray-800 min-w-[140px] text-center capitalize">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition active:scale-90">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Calendar Grid */}
                <CalendarGrid
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    reservations={reservations}
                    currentUser={currentUser}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onSelectDate={setSelectedDate}
                />

                {/* Sidebar / Details Panel */}
                <div className="w-full lg:w-96" ref={detailsRef}>
                    <FacilityList
                        selectedDate={selectedDate}
                        dateReservations={selectedDate ? getReservationsForDate(selectedDate) : []}
                        currentUser={currentUser}
                        onReserve={handleReserve}
                        onCancel={handleCancelClick}
                        isDateDisabled={isDateDisabled}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={!!reservationToCancel}
                onClose={() => setReservationToCancel(null)}
                onConfirm={confirmCancel}
                title="Cancelar Reserva"
                message="Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita."
                confirmText="Sim, Cancelar"
                cancelText="Não, Manter"
            />

            <AdminReservationModal
                isOpen={isAdminModalOpen}
                onClose={() => setIsAdminModalOpen(false)}
                onConfirm={handleAdminConfirm}
            />
        </div>
    );
};

export default Reservations;
