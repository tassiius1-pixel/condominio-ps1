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
    { id: "dashboard", label: "Sugestões", icon: LayoutDashboardIcon },
    { id: "reservations", label: "Reservas", icon: CalendarIcon },
    { id: "occurrences", label: "Ocorrências", icon: BookIcon },
    { id: "voting", label: "Votação", icon: CheckSquareIcon },
    { id: "users", label: "Usuários", icon: UsersIcon, adminOnly: true },
    { id: "reports", label: "Relatórios", icon: BarChartIcon, adminOnly: true },
  ];

  return (
    <header className="glass sticky top-0 z-40 border-b border-white/20 shadow-sm px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-20">
          {/* LOGO */}
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0 w-14 h-14">
              <img
                src={logoURL}
                alt="Logo do Condomínio"
                className="w-full h-full object-contain rounded-xl bg-white shadow-md p-1 hover-lift"
              />

              {currentUser.role === Role.ADMIN && (
                <div
                  className="absolute inset-0 bg-black/40 rounded-xl
                                 flex items-center justify-center opacity-0 
                                 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="h-5 w-5 text-white" />
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
            <div className="hidden sm:flex flex-col justify-center">
              <h1 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">
                Porto Seguro 1
              </h1>
              <p className="text-[10px] uppercase font-extrabold text-blue-600 tracking-widest">Condomínio Residencial</p>
            </div>
          </div>

          {/* MENU */}
          <div className="flex items-center space-x-2 md:space-x-4">

            {/* NAV */}
            <nav className="hidden lg:flex items-center space-x-1 mr-2">
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
                                 flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-all
                                 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-600 hover:bg-white/50 hover:text-gray-900"}
                             `}
                  >
                    <Icon className={`h-4.5 w-4.5 mr-2 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* USER INFO */}
            <div className="hidden md:flex items-center gap-3 bg-white/40 px-3 py-1.5 rounded-2xl border border-white/50">
              <div className="text-right leading-tight">
                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  {currentUser.name}
                </p>
                <p className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
                  Unidade {currentUser.houseNumber}
                </p>
              </div>
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm border-2 border-white shadow-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* NOTIFICAÇÕES */}
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowNotifications(prev => !prev)}
                className="relative p-2.5 rounded-xl text-gray-500 hover:bg-white/60 hover:text-indigo-600 transition-all active:scale-95"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white 
                                         rounded-full text-[10px] flex items-center justify-center font-black border-2 border-white shadow-sm animate-pulse">
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
              className="lg:hidden p-2.5 rounded-xl text-gray-500 hover:bg-white/60 hover:text-indigo-600 transition-all active:scale-95"
            >
              {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>

            {/* LOGOUT */}
            <button
              onClick={logout}
              className="p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 ml-1"
              title="Sair do App"
            >
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`
        fixed top-4 left-4 bottom-4 w-72 bg-white/95 backdrop-blur-md shadow-2xl z-50 lg:hidden rounded-3xl
        transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'}
      `}>
        <div className="h-full flex flex-col p-4">
          {/* Menu Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <img src={logoURL} alt="Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm bg-white p-1" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Menu</h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Porto Seguro 1</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-1">
            {navItems.map((item, idx) => {
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
                  className={`w-full flex items-center px-4 py-4 text-sm font-bold rounded-2xl transition-all animate-slideFadeIn ${isActive
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-1'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <Icon className={`h-6 w-6 mr-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Menu Footer */}
          <div className="mt-auto px-4 pt-6 border-t border-gray-100 flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black mb-3 shadow-inner">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-gray-900 mb-1 uppercase tracking-tight">{currentUser.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {currentUser.role} • Unidade {currentUser.houseNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
