import React from 'react';
import { View, Role } from '../types';
import {
    InfoIcon,
    LayoutDashboardIcon,
    CalendarIcon,
    BookIcon,
    MenuIcon,
    CheckSquareIcon
} from './Icons';
import { useAuth } from '../hooks/useAuth';

interface BottomNavigationProps {
    currentView: View;
    setView: (view: View) => void;
    onToggleMenu: () => void;
    hasUnreadNotifications?: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
    currentView,
    setView,
    onToggleMenu,
    hasUnreadNotifications
}) => {
    const { currentUser } = useAuth();
    if (!currentUser) return null;

    const navItems = [
        { id: 'notices', label: 'Início', icon: InfoIcon },
        { id: 'dashboard', label: 'Sugestões', icon: LayoutDashboardIcon }, // Dashboard shows requests/suggestions
        { id: 'voting', label: 'Votação', icon: CheckSquareIcon },
        { id: 'reservations', label: 'Reservas', icon: CalendarIcon },
        { id: 'occurrences', label: 'Ocorrências', icon: BookIcon },
    ];

    // Filter items based on role if needed, though these are basic resident features
    // We display max 4 main items + Menu button

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-safe pt-2 px-2 z-50 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as View)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 group ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <div className={`
                                p-1.5 rounded-xl transition-all mb-1
                                ${isActive ? 'bg-indigo-50 translate-y-[-2px]' : ''}
                            `}>
                                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            </div>
                            <span className={`text-[10px] font-bold leading-none ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* MENU BUTTON (More) */}
                <button
                    onClick={onToggleMenu}
                    className="flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 text-gray-400 hover:text-gray-600 relative"
                >
                    <div className="p-1.5 rounded-xl mb-1">
                        <MenuIcon className="w-6 h-6" />
                    </div>
                    {hasUnreadNotifications && (
                        <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                </button>
            </div>
            {/* Safe Area Spacer for iOS Home Indicator */}
            <div className="h-4 w-full" />
        </div>
    );
};

export default BottomNavigation;
