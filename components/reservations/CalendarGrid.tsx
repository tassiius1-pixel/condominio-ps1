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
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const renderCalendarDays = () => {
        const days = [];
        const emptyDays = firstDayOfMonth;

        // Empty cells for previous month
        for (let i = 0; i < emptyDays; i++) {
            days.push(<div key={`empty-${i}`} className="h-14 md:h-24 bg-gray-50/30 border-b border-r border-gray-100"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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

            days.push(
                <div
                    key={day}
                    onClick={() => isClickable && onSelectDate(date)}
                    className={`
                        h-14 md:h-24 border-b border-r p-1 transition-all relative flex flex-col items-center justify-start gap-0.5 group
                        ${isPast ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-100'}
                        ${!isClickable ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:bg-white hover:shadow-inner'}
                        ${isSelected ? '!bg-blue-50/50 ring-inset ring-2 ring-blue-500 z-10' : ''}
                    `}
                >
                    <span className={`
                        text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors
                        ${isToday ? 'bg-blue-600 text-white shadow-md' : (isSelected ? 'text-blue-700 font-bold' : 'text-gray-700')}
                        ${!isClickable && !isToday ? 'text-gray-300' : ''}
                    `}>
                        {day}
                    </span>

                    {/* Dot Indicators for Month View */}
                    <div className="flex gap-0.5 md:gap-1 mt-0.5 flex-wrap justify-center content-start w-full px-0.5">
                        {hasSalao && (
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500 shadow-sm" title="Salão de Festas Reservado"></div>
                        )}
                        {hasChurrasco1 && (
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 shadow-sm" title="Churrasqueira 1 Reservada"></div>
                        )}
                        {hasChurrasco2 && (
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400 shadow-sm" title="Churrasqueira 2 Reservada"></div>
                        )}
                    </div>

                    {/* Text Labels (Desktop Only - if space permits, or on hover) */}
                    <div className="hidden md:flex flex-col gap-0.5 w-full mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {dayReservations.length > 0 && (
                            <span className="text-[9px] text-center text-gray-500 font-medium bg-gray-100 rounded-full py-0.5 px-1 mx-auto scale-90">
                                {dayReservations.length}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header with Navigation - Moved inside Grid component or keep external? 
                 The prompt asked to extract CalendarGrid, usually implying the grid itself.
                 But the layout in Reservations.tsx has the nav separate.
                 However, to make this component self-contained, including the header (Day names) is good.
                 The Month navigation was outside in the main controller. Let's keep Month nav outside or pass it in?
                 Actually, looking at the layout, the Month Nav is top right. The grid is below.
                 The grid includes the Weekday headers.
             */}

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div
                key={currentDate.toString()}
                className={`grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200 ${direction === 'forward' ? 'animate-slide-right' : direction === 'backward' ? 'animate-slide-left' : ''}`}
            >
                {renderCalendarDays()}
            </div>

            {/* Legend Footer */}
            <div className="p-4 bg-gray-50 flex flex-wrap gap-4 justify-center md:justify-start border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-600 font-medium">Salão de Festas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-600 font-medium">Churrasqueira 1</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <span className="text-xs text-gray-600 font-medium">Churrasqueira 2</span>
                </div>
            </div>
        </div>
    );
};

export default CalendarGrid;
