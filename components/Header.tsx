import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { LogOutIcon, UsersIcon, BarChartIcon, LayoutDashboardIcon, BellIcon, UploadIcon } from './Icons';
import { useData } from '../hooks/useData';
import { fileToBase64 } from '../utils/fileUtils';

interface HeaderProps {
    currentView: string;
    setView: (view: 'dashboard' | 'users' | 'reports') => void;
    condoLogo: string | null;
    setCondoLogo: (logo: string | null) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView, condoLogo, setCondoLogo }) => {
  const { currentUser, logout } = useAuth();
  const { notifications, markAllNotificationsAsRead } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  // ⚠️ AGORA NOTIFICAÇÕES SÃO GERAIS, NÃO POR userId
  const userNotifications = notifications;

  // ⚠️ Lógica nova: readBy
  const unreadCount = userNotifications.filter(
    n => !n.readBy.includes(currentUser.id)
  ).length;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setCondoLogo(base64);
    }
  };

  // LOGO fallback
  const logoURL = condoLogo || 
    "https://hjrhipbzuzkxrzlffwlb.supabase.co/storage/v1/object/public/logotipos/WhatsApp%20Image%202025-11-17%20at%2011.06.58.jpeg";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* LOGO + NOME */}
          <div className="flex items-center gap-4">

            {/* LOGO */}
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

          {/* MENU À DIREITA */}
          <div className="flex items-center space-x-2">

            {/* NAV */}
            <nav className="hidden md:flex items-center space-x-2 mr-2">
                <button 
                  onClick={() => setView('dashboard')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
                    ${currentView === 'dashboard' ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"}`}
                >
                    <LayoutDashboardIcon className="h-5 w-5 mr-2" /> Painel
                </button>

                {[Role.ADMIN, Role.GESTAO].includes(currentUser.role) && (
                    <button 
                      onClick={() => setView('reports')}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
                        ${currentView === 'reports' ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        <BarChartIcon className="h-5 w-5 mr-2" /> Relatórios
                    </button>
                )}

                {currentUser.role === Role.ADMIN && (
                    <button 
                      onClick={() => setView('users')}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
                        ${currentView === 'users' ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        <UsersIcon className="h-5 w-5 mr-2" /> Usuários
                    </button>
                )}
            </nav>

            {/* 🔔 NOTIFICAÇÕES */}
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
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-40 animate-slideFadeIn">
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
                            {userNotifications.length > 0 ? userNotifications.map(n => (
                                <li 
                                  key={n.id} 
                                  className={`p-3 border-b ${!n.readBy.includes(currentUser.id) ? 'bg-indigo-50' : ''}`}
                                >
                                    <p className="text-sm">{n.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                                    </p>
                                </li>
                            )) : (
                                <li className="p-4 text-center text-sm text-gray-500">
                                    Nenhuma notificação.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {/* USUÁRIO */}
            <div className="text-right ml-2 hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
              <p className="text-xs text-gray-500">
                Casa: {currentUser.houseNumber} | Perfil: {currentUser.role}
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
