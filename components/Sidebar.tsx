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
    { id: "occurrences", label: "Livro de Ocorrências", icon: BookIcon },
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
        return { label: 'Admin', classes: 'bg-purple-100 text-purple-700 border-purple-200' };
      case Role.SINDICO:
        return { label: 'Síndico', classes: 'bg-blue-100 text-blue-700 border-blue-200' };
      case Role.SUBSINDICO:
        return { label: 'Subsíndico', classes: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case Role.GESTAO:
        return { label: 'Gestão', classes: 'bg-teal-100 text-teal-700 border-teal-200' };
      case Role.PROPRIETARIO:
        return { label: 'Proprietário', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case Role.INQUILINO:
        return { label: 'Inquilino', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: 'Morador', classes: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setView(item.id as any)}
        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group active:scale-[0.97] ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/60'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
        }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
        }`} />
        <span className="truncate leading-none">{item.label}</span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
        )}
      </button>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 bg-white border-r border-slate-100 shadow-[4px_0_32px_rgba(0,0,0,0.04)] z-40">

      {/* CABEÇALHO: LOGO */}
      <div className="px-6 pt-7 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="relative group w-11 h-11 flex-shrink-0 rounded-2xl overflow-hidden bg-white shadow-md border border-slate-100">
            <img
              src={logoURL}
              alt="Logo do Condomínio"
              className="w-full h-full object-contain"
              style={{ transform: 'scale(1.2) translateX(2.2px)' }}
            />
            {currentUser.role === Role.ADMIN && (
              <div
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[1px]"
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
            <h1 className="text-base font-black text-slate-800 leading-none tracking-tight">
              Porto Seguro 1
            </h1>
            <p className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mt-1">
              Condomínio Residencial
            </p>
          </div>
        </div>
      </div>

      {/* MENU DE NAVEGAÇÃO */}
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar flex flex-col gap-6">

        {/* GRUPO GERAL */}
        <div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] px-4 block mb-3">
            Geral
          </span>
          <div className="space-y-1.5">
            {normalMenuItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* GRUPO ADMINISTRAÇÃO */}
        {isManagement && managementMenuItems.length > 0 && (
          <div className="pt-5 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] px-4 block mb-3">
              Administração
            </span>
            <div className="space-y-1.5">
              {managementMenuItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ: PERFIL + AÇÕES */}
      <div className="border-t border-slate-100 flex-shrink-0 px-4 py-4">
        <div className="flex items-center gap-2.5 bg-slate-50 rounded-2xl px-3 py-2.5">
          {/* Avatar */}
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-indigo-200/50">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>

          {/* Nome e badge */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-700 leading-none truncate">
              {currentUser.name.split(' ')[0]} {currentUser.name.split(' ').length > 1 ? currentUser.name.split(' ')[currentUser.name.split(' ').length - 1] : ''}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${badge.classes} leading-none`}>
                {badge.label}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Un. {currentUser.houseNumber}
              </span>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shrink-0"
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
