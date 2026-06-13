import React, { useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { LogOutIcon, UsersIcon, BarChartIcon, LayoutDashboardIcon, UploadIcon, CalendarIcon, BookIcon, CheckSquareIcon, FileIcon, LightbulbIcon, BoletoIcon, BellIcon, ImageIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { Role, View } from '../types';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';
import NotificationsDropdown from './NotificationsDropdown';

interface SidebarProps {
  currentView: string;
  setView: (view: View) => void;
  condoLogo: string | null;
  setCondoLogo: (logo: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  condoLogo,
  setCondoLogo,
}) => {
  const { currentUser, logout } = useAuth();
  const { notifications } = useData();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(
    (n) => (n.userId === "all" || n.userId === currentUser.id) && !n.readBy.includes(currentUser.id)
  ).length;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setCondoLogo(base64);
    }
  };

  const logoURL = condoLogo || "/favicon.png";

  const navItems = [
    { id: "home", label: "Início", icon: LayoutDashboardIcon },
    { id: "dashboard", label: "Sugestões/Manutenções", icon: LightbulbIcon },
    { id: "reservations", label: "Reservas", icon: CalendarIcon },
    { id: "occurrences", label: "Ocorrências", icon: BookIcon },
    { id: "voting", label: "Votação", icon: CheckSquareIcon },
    { id: "documents", label: "Documentos", icon: FileIcon },
    { id: "boletos", label: "Boletos", icon: BoletoIcon },
    { id: "gallery", label: "Galeria", icon: ImageIcon },
    { id: "users", label: "Usuários", icon: UsersIcon, adminOnly: true },
    { id: "reports", label: "Relatórios", icon: BarChartIcon, adminOnly: true },
  ];

  const isManagement = [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);
  const isSuperAdmin = currentUser.role === Role.ADMIN;

  const normalMenuItems = navItems.filter(item => !item.adminOnly);
  const managementMenuItems = navItems.filter(
    item => item.adminOnly && (item.id !== 'users' || isSuperAdmin)
  );

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return { label: 'Admin', classes: 'bg-purple-50 text-purple-700 border-purple-200' };
      case Role.SINDICO:
        return { label: 'Síndico', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
      case Role.SUBSINDICO:
        return { label: 'Subsíndico', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case Role.GESTAO:
        return { label: 'Gestão', classes: 'bg-teal-50 text-teal-700 border-teal-200' };
      case Role.PROPRIETARIO:
        return { label: 'Proprietário', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case Role.INQUILINO:
        return { label: 'Inquilino', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Morador', classes: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.006)] z-40">
      {/* CABEÇALHO: LOGO */}
      <div className="px-6 py-5 border-b border-slate-200/60 flex items-center">
        <div className="flex items-center gap-3">
          <div className="relative group w-9 h-9 flex-shrink-0">
            <img
              src={logoURL}
              alt="Logo do Condomínio"
              className="w-full h-full object-contain rounded-xl bg-white shadow-sm p-1 border border-slate-100"
            />
            {currentUser.role === Role.ADMIN && (
              <div
                className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[1px]"
                onClick={() => fileInputRef.current?.click()}
                title="Alterar Logo"
              >
                <UploadIcon className="h-4 w-4 text-white" />
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
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">
              Porto Seguro 1
            </h1>
            <p className="text-[9px] uppercase font-black text-blue-600 tracking-wider mt-0.5">
              Condomínio Residencial
            </p>
          </div>
        </div>
      </div>

      {/* MENU DE NAVEGAÇÃO */}
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar flex flex-col gap-5">
        {/* GRUPO GERAL */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-3.5 block mb-2.5">
            Geral
          </span>
          <div className="space-y-1 pt-0.5">
            {normalMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group active:scale-[0.98] ${
                    isActive
                      ? 'bg-indigo-50/70 text-indigo-600 shadow-sm shadow-indigo-100/30 scale-[1.01] translate-x-0.5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 hover:translate-x-1'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* GRUPO ADMINISTRAÇÃO */}
        {isManagement && managementMenuItems.length > 0 && (
          <div className="space-y-1.5 mt-auto pt-4 border-t border-slate-200/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-3.5 block mb-2.5">
              Administração
            </span>
            <div className="space-y-1 pt-0.5">
              {managementMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as any)}
                    className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group active:scale-[0.98] ${
                      isActive
                        ? 'bg-indigo-50/70 text-indigo-600 shadow-sm shadow-indigo-100/30 scale-[1.01] translate-x-0.5'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 hover:translate-x-1'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ: PERFIL + AÇÕES */}
      <div className="border-t border-slate-200/60 flex-shrink-0">
        {/* Linha do perfil: Avatar + Nome + Sino + Logout */}
        <div className="flex items-center gap-2 px-4 py-3.5">
          {/* Avatar */}
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-[11px] shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>

          {/* Nome e badge */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-wide leading-none">
              {currentUser.name.split(' ')[0]} {currentUser.name.split(' ').length > 1 ? currentUser.name.split(' ')[currentUser.name.split(' ').length - 1] : ''}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[8px] font-bold px-1.5 py-px rounded-full border ${badge.classes}`}>
                {badge.label}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Un. {currentUser.houseNumber}
              </span>
            </div>
          </div>

          {/* Sino de Notificações */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setShowNotifications(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 transition-all active:scale-95"
              title="Notificações"
            >
              <BellIcon className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center font-black border border-white shadow-sm animate-pulse">
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

          {/* Logout */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-all active:scale-95"
            title="Sair da Conta"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

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
    </aside>
  );
};

export default Sidebar;
