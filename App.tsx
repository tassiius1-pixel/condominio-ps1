// FIX: Corrected React import for hooks.
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserManagement from "./components/UserManagement";
import Header from "./components/Header";
import { Role, Toast as ToastType } from "./types";
import Reports from "./components/Reports";
import { useData } from "./hooks/useData";
import {
  XIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "./components/Icons";

const Toast: React.FC<{ toast: ToastType; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
    error: <AlertTriangleIcon className="w-6 h-6 text-red-500" />,
    info: <InfoIcon className="w-6 h-6 text-blue-500" />,
  };

  return (
    <div
      className="
        pointer-events-auto 
        w-full max-w-sm 
        bg-white/95 
        backdrop-blur 
        shadow-xl 
        rounded-xl 
        ring-1 ring-black/10 
        flex items-center gap-3 
        p-4 animate-slide-in
      "
      style={{ animation: "slide-in 0.25s ease-out" }}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>

      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 leading-snug">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition"
      >
        <XIcon className="w-5 h-5" />
      </button>

      <style>
        {`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};


// mesma definição do projeto padrão
type View = "dashboard" | "users" | "reports";

const App: React.FC = () => {
  const { currentUser } = useAuth();
  const { toasts, removeToast } = useData();

  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [mainView, setMainView] = useState<View>("dashboard");

  const [condoLogo, setCondoLogo] = useState<string | null>(() => {
    return localStorage.getItem("condo-logo");
  });

  useEffect(() => {
    if (condoLogo) {
      localStorage.setItem("condo-logo", condoLogo);
    } else {
      localStorage.removeItem("condo-logo");
    }
  }, [condoLogo]);

  const handleSetLogo = (logoBase64: string | null) => {
    setCondoLogo(logoBase64);
  };

  const renderContent = () => {
    // sem usuário logado → tela de login/cadastro
    if (!currentUser) {
      if (authView === "login") {
        return (
          <Login onSwitchToRegister={() => setAuthView("register")} />
        );
      }
      return <Register onSwitchToLogin={() => setAuthView("login")} />;
    }

    // com usuário logado → dashboard / usuários / relatórios
    switch (mainView) {
      case "dashboard":
        return <Dashboard />;
      case "users":
        return currentUser.role === Role.ADMIN ? (
          <UserManagement />
        ) : (
          <Dashboard />
        );
      case "reports":
        return [Role.ADMIN, Role.GESTAO].includes(currentUser.role) ? (
          <Reports />
        ) : (
          <Dashboard />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300">
        {currentUser && (
          <Header
            currentView={mainView}
            setView={setMainView}
            condoLogo={condoLogo}
            setCondoLogo={handleSetLogo}
          />
        )}

        <main
          className={`max-w-7xl mx-auto ${
            currentUser ? "p-4 sm:p-6 lg:p-8" : ""
          }`}
        >
          {renderContent()}
        </main>
      </div>

      {/* Container de toasts (notificações) */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={removeToast}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default App;
