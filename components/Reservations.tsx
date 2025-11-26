import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Reservation, Role } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './Icons';

import ConfirmModal from './ConfirmModal';

interface ReservationsProps {
    setView?: (view: any) => void;
}

const Reservations: React.FC<ReservationsProps> = ({ setView }) => {
    const { reservations, addReservation, cancelReservation, addToast } = useData();
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isDateDisabled = (date: Date, type: 'churrasco' | 'salao') => {
        // Admin bypasses all date restrictions
        if (currentUser?.role === Role.ADMIN) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < today) return true;

        const diffTime = Math.abs(checkDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (type === 'churrasco') {
            // Permitido apenas nos próximos 15 dias (incluindo hoje)
            return diffDays > 14;
        } else {
            // Salão de Festas: 6 meses (aprox 180 dias)
            return diffDays > 180;
        }
    };

    const getReservationsForDate = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        return reservations.filter(r => r.date === dateString);
    };

    const handleReserve = async (area: 'churrasco1' | 'churrasco2' | 'salao_festas') => {
        if (!selectedDate || !currentUser) return;

        let houseNumber = currentUser.houseNumber;
        let userName = currentUser.name;

        // Admin can specify house number
        if (currentUser.role === Role.ADMIN) {
            const input = prompt("Digite o número da casa para a reserva (ex: 101):");
            if (!input) return;
            const parsed = parseInt(input);
            if (isNaN(parsed)) {
                addToast("Número da casa inválido.", 'error');
                return;
            }
            houseNumber = parsed;
            userName = `Admin (Casa ${houseNumber})`; // Or fetch user name if needed, but this is simple
        }

        const dateString = selectedDate.toISOString().split('T')[0];
        const existingReservations = getReservationsForDate(selectedDate);

        // Regra de Exclusividade (Por Casa)
        const myHouseReservations = existingReservations.filter(r => r.houseNumber === houseNumber);

        if (area === 'salao_festas') {
            if (myHouseReservations.some(r => r.area.includes('churrasco'))) {
                addToast('Você já reservou uma churrasqueira para este dia.', 'error');
                return;
            }
        } else {
            if (myHouseReservations.some(r => r.area === 'salao_festas')) {
                addToast('Você já reservou o Salão de Festas para este dia.', 'error');
                return;
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

    const renderCalendarDays = () => {
        const days = [];
        const emptyDays = firstDayOfMonth;

        // Empty cells for previous month
        for (let i = 0; i < emptyDays; i++) {
            days.push(<div key={`empty-${i}`} className="h-12 md:h-16 bg-gray-50/30 border-b border-r border-gray-100"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateString = date.toISOString().split('T')[0];
            const dayReservations = reservations.filter(r => r.date === dateString);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
            const isAdmin = currentUser?.role === Role.ADMIN;
            const isClickable = !isPast || isAdmin;

            // Indicators
            const hasSalao = dayReservations.some(r => r.area === 'salao_festas');
            const hasChurrasco1 = dayReservations.some(r => r.area === 'churrasco1');
            const hasChurrasco2 = dayReservations.some(r => r.area === 'churrasco2');

            days.push(
                <div
                    key={day}
                    onClick={() => isClickable && setSelectedDate(date)}
                    className={`
                        h-12 md:h-16 border-b border-r border-gray-100 p-1 transition-all relative flex flex-col items-center justify-start gap-0.5 group
                        ${!isClickable ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-white hover:shadow-inner'}
                        ${isSelected ? 'bg-blue-50/50 ring-inset ring-2 ring-blue-500 z-10' : 'bg-white'}
                    `}
                >
                    <span className={`
                        text-xs font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors
                        ${isToday ? 'bg-blue-600 text-white shadow-md' : (isSelected ? 'text-blue-700 font-bold' : 'text-gray-700')}
                        ${!isClickable && !isToday ? 'text-gray-300' : ''}
                    `}>
                        {day}
                    </span>

                    {/* Dot Indicators for Month View */}
                    <div className="flex gap-0.5 justify-center content-start w-full px-0.5">
                        {hasSalao && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm" title="Salão de Festas Reservado"></div>
                        )}
                        {hasChurrasco1 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm" title="Churrasqueira 1 Reservada"></div>
                        )}
                        {hasChurrasco2 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" title="Churrasqueira 2 Reservada"></div>
                        )}
                    </div>

                    {/* Text Labels (Desktop Only - if space permits, or on hover) */}
                    <div className="hidden md:flex flex-col gap-0.5 w-full mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {dayReservations.length > 0 && (
                            <span className="text-[8px] text-center text-gray-500 font-medium bg-gray-100 rounded-full px-1 mx-auto scale-90">
                                {dayReservations.length}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    const FacilityCard = ({
        area,
        label,
        icon: Icon,
        colorClass,
        btnColorClass,
        isReserved,
        isDisabled
    }: any) => (
        <div className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${isReserved ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'}`}>
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-gray-900">{label}</h4>
                        <p className="text-[10px] text-gray-500">
                            {isReserved ? 'Indisponível' : 'Disponível'}
                        </p>
                    </div>
                </div>

                {!isReserved && !isDisabled && (
                    <button
                        onClick={() => handleReserve(area)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${btnColorClass}`}
                    >
                        Reservar
                    </button>
                )}

                {isReserved && (
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] font-bold uppercase rounded">
                        Ocupado
                    </span>
                )}
            </div>
            {/* Progress Bar Style Indicator */}
            <div className={`h-1 w-full ${isReserved ? 'bg-gray-300' : (area === 'salao_festas' ? 'bg-purple-500' : 'bg-orange-500')}`}></div>
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in pb-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reservas</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Gerencie e visualize a disponibilidade.</p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-0.5 self-start">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-600 transition">
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-bold text-gray-800 min-w-[120px] text-center capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-600 transition">
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                {/* Calendar Grid */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200">
                        {renderCalendarDays()}
                    </div>

                    {/* Legend Footer */}
                    <div className="p-2 bg-gray-50 flex flex-wrap gap-3 justify-center md:justify-start border-t border-gray-200">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span className="text-[10px] text-gray-600 font-medium">Salão</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-[10px] text-gray-600 font-medium">Churrasq. 1</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            <span className="text-[10px] text-gray-600 font-medium">Churrasq. 2</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Details Panel */}
                <div className="w-full lg:w-80 space-y-4">
                    {/* Selected Date Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                            <h3 className="text-sm font-bold text-gray-900">
                                {selectedDate ? (
                                    selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                                ) : (
                                    <span className="text-gray-400">Selecione uma data</span>
                                )}
                            </h3>
                        </div>

                        <div className="p-4 space-y-3">
                            {!selectedDate ? (
                                <div className="text-center py-6">
                                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <ChevronLeftIcon className="w-4 h-4 text-blue-300 rotate-90 md:rotate-0" />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Clique em um dia para ver detalhes.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Facilities List */}
                                    <div className="space-y-2">
                                        <FacilityCard
                                            area="salao_festas"
                                            label="Salão de Festas"
                                            icon={(props: any) => <div {...props}>🎉</div>}
                                            colorClass="bg-purple-100 text-purple-600"
                                            btnColorClass="bg-purple-600 text-white hover:bg-purple-700"
                                            isReserved={getReservationsForDate(selectedDate).some(r => r.area === 'salao_festas')}
                                            isDisabled={isDateDisabled(selectedDate, 'salao') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area.includes('churrasco'))}
                                        />

                                        <FacilityCard
                                            area="churrasco1"
                                            label="Churrasqueira 1"
                                            icon={(props: any) => <div {...props}>🍖</div>}
                                            colorClass="bg-orange-100 text-orange-600"
                                            btnColorClass="bg-orange-600 text-white hover:bg-orange-700"
                                            isReserved={getReservationsForDate(selectedDate).some(r => r.area === 'churrasco1')}
                                            isDisabled={isDateDisabled(selectedDate, 'churrasco') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area === 'salao_festas')}
                                        />

                                        <FacilityCard
                                            area="churrasco2"
                                            label="Churrasqueira 2"
                                            icon={(props: any) => <div {...props}>🔥</div>}
                                            colorClass="bg-amber-100 text-amber-600"
                                            btnColorClass="bg-amber-500 text-white hover:bg-amber-600"
                                            isReserved={getReservationsForDate(selectedDate).some(r => r.area === 'churrasco2')}
                                            isDisabled={isDateDisabled(selectedDate, 'churrasco') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area === 'salao_festas')}
                                        />
                                    </div>

                                    {/* Current Reservations List */}
                                    {getReservationsForDate(selectedDate).length > 0 && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reservas Confirmadas</h4>
                                            <div className="space-y-2">
                                                {getReservationsForDate(selectedDate).map(res => (
                                                    <div key={res.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-6 rounded-full ${res.area === 'salao_festas' ? 'bg-purple-500' :
                                                                    res.area === 'churrasco1' ? 'bg-orange-500' : 'bg-amber-400'
                                                                }`}></div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-700">
                                                                    Casa {res.houseNumber}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500">
                                                                    {res.userName.split(' ')[0]} • {res.area === 'salao_festas' ? 'Salão' : res.area === 'churrasco1' ? 'C1' : 'C2'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {(currentUser?.id === res.userId || [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR)) && (
                                                            <button
                                                                onClick={() => handleCancelClick(res)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                                                title="Cancelar Reserva"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Rules Card */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                            <span className="text-sm">ℹ️</span> Regras
                        </h4>
                        <ul className="text-[10px] text-blue-800 space-y-1.5 leading-relaxed">
                            <li className="flex gap-1.5">
                                <span className="font-bold">•</span>
                                <span><strong>Churrasqueiras:</strong> Max 15 dias antes.</span>
                            </li>
                            <li className="flex gap-1.5">
                                <span className="font-bold">•</span>
                                <span><strong>Salão:</strong> Max 6 meses antes.</span>
                            </li>
                            <li className="flex gap-1.5">
                                <span className="font-bold">•</span>
                                <span><strong>Exclusividade:</strong> Salão OU Churrasqueira.</span>
                            </li>
                            {currentUser?.role === Role.ADMIN && (
                                <li className="flex gap-1.5 text-red-600 font-bold mt-1 pt-1 border-t border-blue-200">
                                    <span>•</span>
                                    <span>ADMIN: Acesso total.</span>
                                </li>
                            )}
                        </ul>
                    </div>
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
        </div>
    );
};

export default Reservations;
