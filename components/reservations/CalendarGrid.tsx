import React from 'react';
import { Reservation, Role } from '../../types';
import { User } from 'firebase/auth'; // Adjust import if User type is defined elsewhere
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';

interface CalendarGridProps {
    currentDate: Date;
    selectedDate: Date | null;
    reservations: Reservation[];
    currentUser: any; // Using any for now to match Reservations.tsx usage, or import User type
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onSelectDate: (date: Date) => void;
    direction?: 'forward' | 'backward' | null;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
    currentDate,
    selectedDate,
    reservations,
    currentUser,
    onPrevMonth,
    onNextMonth,
    onSelectDate,
    direction
}) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const daysInPrevMonthToShow = firstDayOfMonth;

    // Calculate total days to show (6 rows x 7 days = 42)
    const totalDaysToShow = 42;
    const daysInNextMonthToShow = totalDaysToShow - (daysInPrevMonthToShow + daysInMonth);

    const renderCalendarDays = () => {
        const days = [];

        // Previous month days
        for (let i = daysInPrevMonthToShow - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const date = new Date(year, month - 1, day);
            days.push(
                <div
                    key={`prev-${day}`}
                    className="h-14 md:h-24 bg-gray-50/50 border-b border-r border-gray-100 p-1 opacity-40 grayscale-[0.5] cursor-default"
                >
                    <span className="text-xs md:text-sm font-medium text-gray-400 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center">
                        {day}
                    </span>
                </div>
            );
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const dayReservations = reservations.filter(r => r.date === dateString);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
            const isAdminOrSindico = currentUser?.role === Role.ADMIN || currentUser?.role === Role.SINDICO;
            const isClickable = !isPast || isAdminOrSindico;

            // Indicators
            const hasSalao = dayReservations.some(r => r.area === 'salao_festas');
            const hasChurrasco1 = dayReservations.some(r => r.area === 'churrasco1');
            const hasChurrasco2 = dayReservations.some(r => r.area === 'churrasco2');
            const isFullyBooked = hasSalao && hasChurrasco1 && hasChurrasco2;

            days.push(
                <div
                    key={`curr-${day}`}
                    onClick={() => isClickable && onSelectDate(date)}
                    className={`
                        h-14 md:h-24 border-b border-r p-1 transition-all relative flex flex-col items-center justify-start gap-0.5 group
                        ${isPast ? 'bg-gray-50/80 border-gray-100' : 'bg-white border-gray-100'}
                        ${!isClickable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-white hover:shadow-inner hover:z-10'}
                        ${isSelected ? '!bg-indigo-50/50 ring-inset ring-2 ring-indigo-500 z-10' : ''}
                        ${isFullyBooked && !isSelected ? 'bg-red-50/30' : ''}
                    `}
                >
                    <span className={`
                        text-xs md:text-sm font-semibold w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all
                        ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : (isSelected ? 'text-indigo-700 font-bold' : 'text-gray-700')}
                        ${!isClickable && !isToday ? 'text-gray-400' : ''}
                        ${isSelected ? 'bg-indigo-100' : ''}
                    `}>
                        {day}
                    </span>

                    {/* Dot Indicators */}
                    <div className="flex gap-1 mt-1 flex-wrap justify-center content-start w-full px-0.5">
                        {hasSalao && (
                            <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-purple-500 shadow-sm ring-1 ring-white" title="Salão de Festas"></div>
                        )}
                        {hasChurrasco1 && (
                            <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-orange-500 shadow-sm ring-1 ring-white" title="Churrasqueira 1"></div>
                        )}
                        {hasChurrasco2 && (
                            <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-amber-400 shadow-sm ring-1 ring-white" title="Churrasqueira 2"></div>
                        )}
                    </div>

                    {isFullyBooked && (
                        <div className="absolute bottom-1 right-1 hidden md:block">
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter opacity-70">Lotado</span>
                        </div>
                    )}
                </div>
            );
        }

        // Next month days
        for (let day = 1; day <= daysInNextMonthToShow; day++) {
            days.push(
                <div
                    key={`next-${day}`}
                    className="h-14 md:h-24 bg-gray-50/50 border-b border-r border-gray-100 p-1 opacity-40 grayscale-[0.5] cursor-default"
                >
                    <span className="text-xs md:text-sm font-medium text-gray-400 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center">
                        {day}
                    </span>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/30">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div
                key={currentDate.toString()}
                className={`grid grid-cols-7 bg-gray-200 gap-px ${direction === 'forward' ? 'animate-slide-right' : direction === 'backward' ? 'animate-slide-left' : ''}`}
            >
                {renderCalendarDays()}
            </div>

            {/* Legend Footer */}
            <div className="p-5 bg-white flex flex-wrap gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-100"></div>
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Salão</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-100"></div>
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Churrasq. 1</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100"></div>
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Churrasq. 2</span>
                </div>
            </div>
        </div>
    );
};

export default CalendarGrid;
