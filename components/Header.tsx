import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { LogOutIcon, UsersIcon, BarChartIcon, LayoutDashboardIcon, BellIcon, UploadIcon, CalendarIcon, BookIcon, CheckSquareIcon, MenuIcon, XIcon } from './Icons';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';

interface HeaderProps {
  currentView: string;
  setView: (view: 'dashboard' | 'users' | 'reports' | 'reservations' | 'occurrences' | 'voting') => void;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const userNotifications = notifications;

  const unreadCount = userNotifications.filter(
    (n) => !n.readBy.includes(currentUser.id)
  ).length;

  // --------------------------
  // 🔥 FECHAR AO CLICAR FORA
  // --------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

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
    { id: "dashboard", label: "Pendências", icon: LayoutDashboardIcon },
    { id: "reservations", label: "Reservas", icon: CalendarIcon },
    { id: "occurrences", label: "Ocorrências", icon: BookIcon },
    { id: "voting", label: "Votação", icon: CheckSquareIcon },
    { id: "users", label: "Usuários", icon: UsersIcon, adminOnly: true },
    { id: "reports", label: "Relatórios", icon: BarChartIcon, adminOnly: true },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
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
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-6">
                Condomínio<br />Porto Seguro 1
              </h1>

              {currentUser.role === Role.ADMIN && condoLogo && (
                <button
                  onClick={() => setCondoLogo(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>

          {/* MENU */}
          <div className="flex items-center space-x-2">

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>

            {/* NAV */}
            <nav className="hidden md:flex items-center space-x-1 mr-2">
              {navItems.map(item => {
                if (item.adminOnly && ![Role.ADMIN, Role.GESTAO].includes(currentUser.role)) return null;

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

            {/* NOTIFICAÇÕES */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white 
                                         rounded-full text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-40">
                  <div className="p-3 flex justify-between items-center border-b">
                    <h4 className="font-semibold">Notificações</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsAsRead(currentUser.id)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <ul className="max-h-80 overflow-y-auto">
                    {userNotifications.length > 0 ? userNotifications.map(n => {
                      const isRead = n.readBy?.includes(currentUser.id);
                      return (
                        <li key={n.id} className={`p-3 border-b ${!isRead ? 'bg-indigo-50' : ''}`}>
                          <p className="text-sm">{n.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(n.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </li>
                      );
                    }) : (
                      <li className="p-4 text-center text-sm text-gray-500">
                        Nenhuma notificação.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* USER INFO */}
            <div className="text-right ml-2 hidden sm:block">
              <p className="text-sm font-medium text-gray-800">
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-500">
                Casa: {currentUser.houseNumber} — Perfil: {currentUser.role}
              </p>
            </div>

            {/* LOGOUT */}
            <button
              onClick={logout}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
            >
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navItems.map(item => {
              if (item.adminOnly && ![Role.ADMIN, Role.GESTAO].includes(currentUser.role)) return null;
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
                  className={`w-full flex items-center px-3 py-2 text-base font-medium rounded-md transition ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
