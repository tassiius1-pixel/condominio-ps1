import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Reservation, Role } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './Icons';

import ConfirmModal from './ConfirmModal';

const Reservations: React.FC = () => {
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
        const isAdmin = [Role.ADMIN, Role.GESTAO].includes(currentUser.role);

        if (isOwner || isAdmin) {
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
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 border border-gray-100"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateString = date.toISOString().split('T')[0];
            const dayReservations = reservations.filter(r => r.date === dateString);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
            // Admin can select past dates if needed, or at least see them. 
            // But usually reservations are for future. Let's keep past disabled for click unless Admin?
            // User request: "adicionar reservas ... a data que quiser". So Admin can click past.
            const isAdmin = currentUser?.role === Role.ADMIN;
            const isClickable = !isPast || isAdmin;

            days.push(
                <div
                    key={day}
                    onClick={() => isClickable && setSelectedDate(date)}
                    className={`
            h-24 border border-gray-100 p-1 transition-all relative overflow-hidden flex flex-col
            ${!isClickable ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'}
            ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
            ${isToday ? 'bg-blue-50/30' : ''}
          `}
                >
                    <span className={`
            text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1
            ${isToday ? 'bg-blue-600 text-white' : (!isClickable ? 'text-gray-400' : 'text-gray-700')}
          `}>
                        {day}
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                        {dayReservations.map(res => {
                            const areaLabel = res.area === 'salao_festas' ? 'Salão' : res.area === 'churrasco1' ? 'C1' : 'C2';
                            const colorClass = res.area === 'salao_festas' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-orange-100 text-orange-800 border-orange-200';
                            return (
                                <div key={res.id} className={`
                                    text-[9px] px-1 py-0.5 rounded border truncate font-semibold leading-tight
                                    ${colorClass}
                                `} title={`${res.area === 'salao_festas' ? 'Salão de Festas' : res.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2'} - Casa ${res.houseNumber}`}>
                                    {areaLabel}: {res.houseNumber}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Calendar Section */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-200 rounded-lg transition">
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-200 rounded-lg transition">
                                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 text-center py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                    </div>

                    <div className="grid grid-cols-7 bg-white">
                        {renderCalendarDays()}
                    </div>
                </div>

                {/* Sidebar / Details Section */}
                <div className="w-full md:w-80 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            {selectedDate ? selectedDate.toLocaleDateString('pt-BR', { dateStyle: 'full' }) : 'Selecione uma data'}
                        </h3>

                        {selectedDate ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disponibilidade</p>

                                    {/* Churrasqueira 1 */}
                                    <button
                                        disabled={isDateDisabled(selectedDate, 'churrasco') || getReservationsForDate(selectedDate).some(r => r.area === 'churrasco1') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area === 'salao_festas')}
                                        onClick={() => handleReserve('churrasco1')}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
                                    >
                                        <span className="text-sm font-medium text-gray-700">Churrasqueira 1</span>
                                        {getReservationsForDate(selectedDate).some(r => r.area === 'churrasco1') ? (
                                            <span className="text-xs font-bold text-red-500">Reservado</span>
                                        ) : (
                                            <span className="text-xs font-bold text-green-500">Livre</span>
                                        )}
                                    </button>

                                    {/* Churrasqueira 2 */}
                                    <button
                                        disabled={isDateDisabled(selectedDate, 'churrasco') || getReservationsForDate(selectedDate).some(r => r.area === 'churrasco2') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area === 'salao_festas')}
                                        onClick={() => handleReserve('churrasco2')}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
                                    >
                                        <span className="text-sm font-medium text-gray-700">Churrasqueira 2</span>
                                        {getReservationsForDate(selectedDate).some(r => r.area === 'churrasco2') ? (
                                            <span className="text-xs font-bold text-red-500">Reservado</span>
                                        ) : (
                                            <span className="text-xs font-bold text-green-500">Livre</span>
                                        )}
                                    </button>

                                    {/* Salão de Festas */}
                                    <button
                                        disabled={isDateDisabled(selectedDate, 'salao') || getReservationsForDate(selectedDate).some(r => r.area === 'salao_festas') || getReservationsForDate(selectedDate).some(r => r.houseNumber === currentUser?.houseNumber && r.area.includes('churrasco'))}
                                        onClick={() => handleReserve('salao_festas')}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
                                    >
                                        <span className="text-sm font-medium text-gray-700">Salão de Festas</span>
                                        {getReservationsForDate(selectedDate).some(r => r.area === 'salao_festas') ? (
                                            <span className="text-xs font-bold text-red-500">Reservado</span>
                                        ) : (
                                            <span className="text-xs font-bold text-green-500">Livre</span>
                                        )}
                                    </button>
                                </div>

                                {/* Lista de Reservas do Dia */}
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reservas do Dia</p>
                                    <div className="space-y-2">
                                        {getReservationsForDate(selectedDate).length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">Nenhuma reserva para este dia.</p>
                                        ) : (
                                            getReservationsForDate(selectedDate).map(res => (
                                                <div key={res.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700">
                                                            {res.area === 'salao_festas' ? 'Salão de Festas' : res.area === 'churrasco1' ? 'Churrasqueira 1' : 'Churrasqueira 2'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {res.userName.split(' ')[0]} (Casa {res.houseNumber})
                                                        </p>
                                                    </div>
                                                    {(currentUser?.id === res.userId || [Role.ADMIN, Role.GESTAO].includes(currentUser?.role || Role.MORADOR)) && (
                                                        <button
                                                            onClick={() => handleCancelClick(res)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                                            title="Cancelar Reserva"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p>Selecione uma data no calendário para ver disponibilidade e fazer reservas.</p>
                            </div>
                        )}
                    </div>

                    {/* Rules Info */}
                    <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-4">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Regras de Reserva</h4>
                        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                            <li>Churrasqueiras: Reservas até 15 dias de antecedência.</li>
                            <li>Salão de Festas: Reservas até 6 meses de antecedência.</li>
                            <li>Exclusividade: Reservar o Salão bloqueia as Churrasqueiras (e vice-versa).</li>
                            {currentUser?.role === Role.ADMIN && (
                                <li className="font-bold text-red-600 mt-2">ADMIN: Acesso irrestrito a datas e casas.</li>
                            )}
                        </ul>
                    </div>

                    {/* Legend */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legenda</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div>
                                <span className="text-sm text-gray-600">Churrasqueira</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
                                <span className="text-sm text-gray-600">Salão de Festas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-blue-50 border border-blue-500"></div>
                                <span className="text-sm text-gray-600">Data Selecionada</span>
                            </div>
                        </div>
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
