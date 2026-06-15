import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from './ConfirmModal';
import { LogOutIcon, UsersIcon, BarChartIcon, LayoutDashboardIcon, BellIcon, UploadIcon, CalendarIcon, BookIcon, CheckSquareIcon, MenuIcon, XIcon, InfoIcon, FileIcon, LightbulbIcon, SearchIcon, BoletoIcon, ImageIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { Role, View } from '../types';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';

import NotificationsDropdown from './NotificationsDropdown';

interface HeaderProps {
  currentView: string;
  setView: (view: View) => void;
  condoLogo: string | null;
  setCondoLogo: (logo: string | null) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setView,
  condoLogo,
  setCondoLogo,
  mobileMenuOpen,
  setMobileMenuOpen
}) => {
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    markAllNotificationsAsRead,
    deleteNotification
  } = useData();

  const [showNotifications, setShowNotifications] = useState(false);
  // local mobileMenuOpen removed, using props
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const lastScrollY = useRef(0);
  const bellRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swipe to close menu logic
  const touchStartMenu = useRef<number>(0);
  const [menuTranslateX, setMenuTranslateX] = useState(0);

  const handleMenuTouchStart = (e: React.TouchEvent) => {
    touchStartMenu.current = e.touches[0].clientX;
  };

  const handleMenuTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartMenu.current;
    if (diff < 0) {
      setMenuTranslateX(diff);
    }
  };

  const handleMenuTouchEnd = () => {
    if (menuTranslateX < -100) {
      setMobileMenuOpen(false);
    }
    setMenuTranslateX(0);
  };

  // Bloqueia scroll do body quando menu mobile está aberto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Scrolled state for styling
      setScrolled(currentScrollY > 20);

      // Smart Show/Hide Logic
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling Down & past threshold
        setVisible(false);
      } else {
        // Scrolling Up
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(
    (n) => (n.userId === "all" || n.userId === currentUser.id) && !n.readBy.includes(currentUser.id)
  ).length;

  const getDisplayDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    };
    const formatted = date.toLocaleDateString('pt-BR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: "Admin",
      PROPRIETARIO: "Proprietário",
      INQUILINO: "Inquilino",
      SINDICO: "Síndico",
      SUBSINDICO: "Subsíndico",
      GESTAO: "Gestão",
      MORADOR: "Morador"
    };
    const key = role.toUpperCase();
    if (roles[key]) return roles[key];
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  // Upload da logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setCondoLogo(base64);
    }
  };

  // LOGO Fallback para usar a URL fixa do Supabase
  const logoURL = condoLogo ||
    "/favicon.png";

  const navItems = [
    { id: "home", label: "Início", icon: LayoutDashboardIcon },
    { id: "dashboard", label: "Sugestões/Manutenções", icon: LightbulbIcon },
    { id: "reservations", label: "Reservas", icon: CalendarIcon },
    { id: "occurrences", label: "Livro de Ocorrências", icon: BookIcon },
    { id: "voting", label: "Votação", icon: CheckSquareIcon },
    { id: "documents", label: "Documentos", icon: FileIcon },
    { id: "boletos", label: "Boletos", icon: BoletoIcon },
    { id: "gallery", label: "Galeria", icon: ImageIcon },
    { id: "users", label: "Usuários", icon: UsersIcon, adminOnly: true },
    { id: "reports", label: "Relatórios", icon: BarChartIcon, adminOnly: true },
  ];

  const isManagement = [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

  const topLevelItems = isManagement
    ? navItems.filter(i => ['home', 'dashboard'].includes(i.id))
    : navItems.filter(i => !i.adminOnly);

  const secondaryItems = isManagement
    ? navItems.filter(i => ['reservations', 'occurrences', 'voting', 'documents', 'boletos', 'gallery'].includes(i.id))
    : [];

  const managementItems = navItems.filter(i => i.adminOnly);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-4 py-4 lg:hidden ${visible || mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <header className={`bg-white max-w-7xl mx-auto rounded-[2.5rem] transition-all duration-300 shadow-xl shadow-gray-200/50 border border-gray-100 ${scrolled ? 'shadow-2xl shadow-indigo-200/50 border-b border-gray-100 py-1' : ''}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* LOGO */}
            <div className="flex items-center gap-4">
              <div className="relative group flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-white shadow-md">
                <img
                  src={logoURL}
                  alt="Logo do Condomínio"
                  className="w-full h-full object-contain hover-lift"
                  style={{ transform: 'scale(1.2) translateX(2px)' }}
                />

                {currentUser.role === Role.ADMIN && (
                  <div
                    className="absolute inset-0 bg-black/40
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
              <div className="hidden xl:flex flex-col justify-center">
                <h1 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">
                  Porto Seguro 1
                </h1>
                <p className="text-[10px] uppercase font-extrabold text-blue-600 tracking-widest">Condomínio Residencial</p>
              </div>
            </div>

            {/* DATE DISPLAY IN THE MIDDLE */}
            <div className="flex flex-col items-center justify-center text-center min-w-0 px-2 select-none shrink-0">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Hoje é</span>
              <span className="text-[11px] sm:text-xs font-black text-slate-800 mt-1 leading-none">{getDisplayDate()}</span>
            </div>

            {/* NAVIGATION & PROFILE */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Desktop Nav Group */}
              <nav className="hidden lg:flex items-center space-x-1">
                {topLevelItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setView(item.id as any)}
                      className={`
                        flex items-center px-2 xl:px-3 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-all
                        ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                      `}
                    >
                      <Icon className={`h-4.5 w-4.5 mr-1 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="hidden 2xl:inline whitespace-nowrap">{item.label}</span>
                      <span className="inline 2xl:hidden whitespace-nowrap">{item.id === 'dashboard' ? 'Sugestões/Mant.' : item.label}</span>
                    </button>
                  );
                })}

                {/* MODULOS DROPDOWN (Management Only Grouping) */}
                {isManagement && (
                  <div className="relative group">
                    <button
                      className={`
                        flex items-center px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-all
                        ${secondaryItems.some(i => i.id === currentView) ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                      `}
                    >
                      <MenuIcon className="h-4.5 w-4.5 mr-2 text-gray-400" />
                      Módulos
                      <svg className="w-4 h-4 ml-1 opacity-50 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] translate-y-2 group-hover:translate-y-0">
                      {secondaryItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`
                              w-full flex items-center px-4 py-3 text-sm font-semibold transition-all
                              ${isActive ? "text-indigo-600 bg-indigo-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                            `}
                          >
                            <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* GESTÃO DROPDOWN */}
                {[Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role) && (
                  <div className="relative group">
                    <button
                      className={`
                        flex items-center px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-all
                        ${managementItems.some(i => i.id === currentView) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                      `}
                    >
                      <LayoutDashboardIcon className="h-4.5 w-4.5 mr-2 text-gray-400" />
                      Gestão
                      <svg className="w-4 h-4 ml-1 opacity-50 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] translate-y-2 group-hover:translate-y-0">
                      {managementItems.map(item => {
                        if (item.id === 'users' && currentUser.role !== Role.ADMIN) return null;
                        const Icon = item.icon;
                        const isActive = currentView === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`
                              w-full flex items-center px-4 py-3 text-sm font-semibold transition-all
                              ${isActive ? "text-indigo-600 bg-indigo-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                            `}
                          >
                            <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </nav>

              {/* Profile & Secondary Actions Group */}
              <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-gray-100">
                {/* USER INFO COMPACT */}
                <div className="hidden sm:flex items-center gap-2 bg-gray-50/50 px-2 py-1.5 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col justify-center leading-none min-w-0">
                    <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">
                      {currentUser.name.split(' ')[0]}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      Unidade {currentUser.houseNumber}
                    </p>
                  </div>
                </div>

                {/* NOTIFICATIONS */}
                <div className="relative">
                  <button
                    ref={bellRef}
                    onClick={() => setShowNotifications(prev => !prev)}
                    className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-all active:scale-95"
                  >
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-black border-2 border-white shadow-lg animate-pulse">
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



                {/* LOGOUT */}
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                  title="Sair do App"
                >
                  <LogOutIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile Menu Backdrop - Renderizado via Portal diretamente no body */}
      {mobileMenuOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />,
        document.body
      )}

      {/* Mobile Menu Drawer - Renderizado via Portal diretamente no body */}
      {createPortal(
        <div
          className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-2xl z-[70] lg:hidden transform transition-all duration-500 flex flex-col ${
            mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
          }`}
          style={{
            transform: mobileMenuOpen ? `translateX(${menuTranslateX}px)` : 'translateX(-100%)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onTouchStart={handleMenuTouchStart}
          onTouchMove={handleMenuTouchMove}
          onTouchEnd={handleMenuTouchEnd}
        >
          <div className="flex flex-col h-full p-4 overflow-hidden">
            {/* Menu Header */}
            <div className="flex items-center justify-between mb-6 px-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <img src={logoURL} alt="Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg shadow-sm bg-white p-1" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">Menu</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Porto Seguro 1</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 flex flex-col justify-evenly py-4 overflow-y-auto px-1 min-h-0">
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
                    className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all animate-slideFadeIn touch-active flex-shrink-0 ${isActive
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-950/20 translate-x-1'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <Icon className={`h-5 w-5 mr-4 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Menu Footer */}
            <div className="mt-auto px-5 py-6 pb-[calc(env(safe-area-inset-bottom,0rem)+1.5rem)] border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 flex-shrink-0 bg-white dark:bg-gray-900 shadow-sm">
              <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black shadow-inner flex-shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                  {formatName(currentUser.name)}
                </p>
                <p className="text-[9.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1 leading-none">
                  {getRoleLabel(currentUser.role)} • Unidade {currentUser.houseNumber}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Sair do App"
        message="Tem certeza que deseja sair? Você precisará fazer login novamente."
        confirmText="Sim, Sair"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Header;
