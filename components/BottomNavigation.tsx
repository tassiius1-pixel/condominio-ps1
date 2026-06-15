import React from 'react';
import { View, Role } from '../types';
import {
    InfoIcon,
    LayoutDashboardIcon,
    CalendarIcon,
    BookIcon,
    MenuIcon,
    CheckSquareIcon,
    FileIcon,
    LightbulbIcon,
    BoletoIcon
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
        { id: 'home', label: 'Início', icon: LayoutDashboardIcon },
        { id: 'reservations', label: 'Reservas', icon: CalendarIcon },
        { id: 'dashboard', label: 'Melhorias', icon: LightbulbIcon },
        { id: 'boletos', label: 'Boletos', icon: BoletoIcon },
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
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 group touch-active ${isActive ? 'text-indigo-600' : 'text-gray-450'}`}
                        >
                            <div className={`
                                p-1 rounded-xl transition-all
                                ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}
                            `}>
                                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            </div>
                            <span className={`text-[9.5px] font-bold tracking-tight transition-opacity duration-200 mt-0.5 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* MENU BUTTON (More) */}
                <button
                    onClick={onToggleMenu}
                    className="flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 text-gray-450 relative touch-active"
                >
                    <div className="p-1 rounded-xl text-gray-400">
                        <MenuIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[9.5px] font-bold tracking-tight opacity-70 mt-0.5">
                        Menu
                    </span>
                    {hasUnreadNotifications && (
                        <span className="absolute top-2.5 right-4.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
                    )}
                </button>
            </div>
            {/* Safe Area Spacer for iOS Home Indicator */}
            <div className="h-4 w-full" />
        </div>
    );
};

export default BottomNavigation;
