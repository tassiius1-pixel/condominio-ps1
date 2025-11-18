import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import {
  LogOutIcon,
  UsersIcon,
  BarChartIcon,
  LayoutDashboardIcon,
  BellIcon,
  UploadIcon,
  TrashIcon
} from './Icons';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';

interface HeaderProps {
  currentView: string;
  setView: (view: 'dashboard' | 'users' | 'reports') => void;
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

  // Fallback da logo
  const logoURL =
    condoLogo ||
    'https://hjrhipbzuzkxrzlffwlb.supabase.co/storage/v1/object/public/logotipos/WhatsApp%20Image%202025-11-17%20at%2011.06.58.jpeg';

  // 🔥 deletar todas
  const handleDeleteAll = async () => {
    for (const n of userNotifications) {
      await deleteNotification(n.id);
    }
  };

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
                Condomínio <br />
                Porto Seguro 1
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
            <nav className="hidden md:flex items-center space-x-2 mr-2">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    currentView === 'dashboard'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <LayoutDashboardIcon className="h-5 w-5 mr-2" /> Painel
              </button>

              {[Role.ADMIN, Role.GESTAO].includes(currentUser.role) && (
                <button
                  onClick={() => setView('reports')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      currentView === 'reports'
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <BarChartIcon className="h-5 w-5 mr-2" /> Relatórios
                </button>
              )}

              {currentUser.role === Role.ADMIN && (
                <button
                  onClick={() => setView('users')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      currentView === 'users'
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <UsersIcon className="h-5 w-5 mr-2" /> Usuários
                </button>
              )}
            </nav>

            {/* 🔔 NOTIFICAÇÕES */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative"
              >
                <BellIcon className="h-6 w-6" />

                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white 
                       rounded-full text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* DROPDOWN */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-40 animate-slideFadeIn">
                  {/* HEADER DO DROPDOWN */}
                  <div className="p-3 flex justify-between items-center border-b">
                    <h4 className="font-semibold">Notificações</h4>

                    {userNotifications.length > 0 && (
                      <button
                        onClick={handleDeleteAll}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Excluir todas
                      </button>
                    )}
                  </div>

                  {/* LISTA */}
                  <ul className="max-h-80 overflow-y-auto">
                    {userNotifications.length > 0 ? (
                      userNotifications.map((n) => (
                        <li
                          key={n.id}
                          className={`p-3 border-b flex justify-between items-start ${
                            !n.readBy.includes(currentUser.id)
                              ? 'bg-indigo-50'
                              : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(n.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          {/* EXCLUIR INDIVIDUAL */}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="ml-3 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="p-4 text-center text-sm text-gray-500">
                        Nenhuma notificação.
                      </li>
                    )}
                  </ul>

                  {/* MARCAR TODAS LIDAS */}
                  {unreadCount > 0 && (
                    <div className="p-2 text-center">
                      <button
                        onClick={() =>
                          markAllNotificationsAsRead(currentUser.id)
                        }
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Marcar todas como lidas
                      </button>
                    </div>
                  )}
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
    </header>
  );
};

export default Header;
