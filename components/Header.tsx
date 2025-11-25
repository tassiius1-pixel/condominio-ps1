import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { LogOutIcon, UsersIcon, BarChartIcon, LayoutDashboardIcon, BellIcon, UploadIcon, CalendarIcon, BookIcon, CheckSquareIcon, MenuIcon, XIcon, InfoIcon } from './Icons';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';

import NotificationsDropdown from './NotificationsDropdown';

interface HeaderProps {
  currentView: string;
  setView: (view: 'dashboard' | 'users' | 'reports' | 'reservations' | 'occurrences' | 'voting' | 'notices') => void;
  condoLogo: string | null;
  setCondoLogo: (logo: string | null) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setView,
  condoLogo,
  setCondoLogo
}) => {
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    markAllNotificationsAsRead,
    deleteNotification
  } = useData();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const userNotifications = notifications;

  const unreadCount = userNotifications.filter(
    (n) => !n.readBy.includes(currentUser.id)
  ).length;

  // Upload da logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setCondoLogo(base64);
    }
  };

  // LOGO Fallback para usar a URL fixa do Supabase
  const logoURL = condoLogo ||
    "https://hjrhipbzuzkxrzlffwlb.supabase.co/storage/v1/object/public/logotipos/WhatsApp%20Image%202025-11-17%20at%2011.06.58.jpeg";

  const navItems = [
    { id: "notices", label: "Início", icon: InfoIcon },
    { id: "dashboard", label: "Pendências", icon: LayoutDashboardIcon },
    { id: "reservations", label: "Reservas", icon: CalendarIcon },
    { id: "occurrences", label: "Ocorrências", icon: BookIcon },
    { id: "voting", label: "Votação", icon: CheckSquareIcon },
    { id: "users", label: "Usuários", icon: UsersIcon, adminOnly: true },
    { id: "reports", label: "Relatórios", icon: BarChartIcon, adminOnly: true },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* LOGO */}
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0 w-16 h-16">
              <img
                src={logoURL}
                alt="Logo do Condomínio"
                className="w-full h-full object-contain rounded-md bg-white shadow-sm"
              />

              {currentUser.role === Role.ADMIN && (
                <div
                  className="absolute inset-0 bg-black bg-opacity-40 rounded-md
                                 flex items-center justify-center opacity-0 
                                 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* TÍTULO */}
            <div className="flex flex-col justify-center">
              <h1 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">
                Porto Seguro 1
              </h1>

              {currentUser.role === Role.ADMIN && condoLogo && (
                <button
                  onClick={() => setCondoLogo(null)}
                  className="text-xs text-red-500 hover:underline text-left mt-1"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>

          {/* MENU */}
          <div className="flex items-center space-x-4">

            {/* NAV */}
            <nav className="hidden md:flex items-center space-x-1 mr-2">
              {navItems.map(item => {
                if (item.adminOnly && ![Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role)) return null;

                // Specific check for Users tab (Admin only)
                if (item.id === 'users' && currentUser.role !== Role.ADMIN) return null;

                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as any)}
                    className={`
                                flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
                                ${isActive ? "bg-gray-100 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                            `}
                  >
                    <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* USER INFO */}
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                Casa: {currentUser.houseNumber} — {currentUser.role}
              </p>
            </div>

            {/* NOTIFICAÇÕES (movido para direita) */}
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowNotifications(prev => !prev)}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white 
                                         rounded-full text-xs flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown
                open={showNotifications}
                onClose={() => setShowNotifications(false)}
                triggerRef={bellRef}
              />
            </div>

            {/* Mobile Hamburger (movido para depois das notificações) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>

            {/* LOGOUT */}
            <button
              onClick={logout}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white shadow-2xl z-50 md:hidden
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Menu Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map(item => {
              if (item.adminOnly && ![Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role)) return null;
              if (item.id === 'users' && currentUser.role !== Role.ADMIN) return null;

              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-6 py-4 text-base font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`h-6 w-6 mr-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Menu Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {currentUser.role === Role.ADMIN && 'Administrador'}
              {currentUser.role === Role.GESTAO && 'Gestão'}
              {currentUser.role === Role.SINDICO && 'Síndico'}
              {currentUser.role === Role.SUBSINDICO && 'Subsíndico'}
              {currentUser.role === Role.MORADOR && 'Morador'}
              {' • Casa '}{currentUser.houseNumber}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
