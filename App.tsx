// FIX: Corrected React import for hooks.
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserManagement from "./components/UserManagement";
import Header from "./components/Header";
import { Role, Toast as ToastType, View } from "./types";
import { useData } from "./hooks/useData";



// 🔥 IMPORTAÇÃO DO FCM
import { requestPushPermission, setupForegroundNotifications } from "./services/pushNotifications";
import BottomNavigation from "./components/BottomNavigation";

// Lazy Loading Components
const Reports = React.lazy(() => import("./components/Reports"));
const Reservations = React.lazy(() => import("./components/Reservations"));
const Occurrences = React.lazy(() => import("./components/Occurrences"));
const VotingModule = React.lazy(() => import("./components/VotingModule"));
const Documents = React.lazy(() => import("./components/Documents"));
const Home = React.lazy(() => import("./components/Home"));

import Toast from "./components/Toast";

const App: React.FC = () => {
  const { currentUser } = useAuth();
  const { toasts, removeToast, addToast } = useData();

  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [mainView, setMainView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("view") as View) || "home";
  });

  const [condoLogo, setCondoLogo] = useState<string | null>(() => {
    return localStorage.getItem("condo-logo");
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setMainView(event.state.view);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleViewChange = (view: View) => {
    setMainView(view);
    window.history.pushState({ view }, "", `?view=${view}`);
  };

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

  // 🔥 ATIVA O FCM AUTOMATICAMENTE APÓS LOGIN (SOMENTE SE NÃO ESTIVER NEGADO)
  useEffect(() => {
    if (currentUser) {
      const hasNotificationSupport = 'Notification' in window;
      if (hasNotificationSupport && (Notification.permission === 'granted' || Notification.permission === 'default')) {
        requestPushPermission(currentUser.id);
      }

      let unsubscribe: (() => void) | undefined;

      const initFCM = async () => {
        const unsub = await setupForegroundNotifications((payload) => {
          const title = payload.notification?.title || "Nova Notificação";
          const body = payload.notification?.body || "";
          addToast(`${title}: ${body}`, "info");
        });
        if (unsub) unsubscribe = unsub;
      };

      initFCM();

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentUser, addToast]);

  const renderContent = () => {
    if (!currentUser) {
      if (authView === "login") {
        return <Login onSwitchToRegister={() => setAuthView("register")} />;
      }
      return <Register onSwitchToLogin={() => setAuthView("login")} />;
    }

    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        {(() => {
          switch (mainView) {
            case "home":
              return <Home setView={handleViewChange} />;
            case "dashboard":
              return <Dashboard setView={handleViewChange} />;
            case "reservations":
              return <Reservations setView={handleViewChange} />;
            case "occurrences":
              return <Occurrences setView={handleViewChange} />;
            case "voting":
              return <VotingModule setView={handleViewChange} />;
            case "users":
              return currentUser.role === Role.ADMIN ? (
                <UserManagement />
              ) : (
                <Dashboard setView={handleViewChange} />
              );
            case "reports":
              return [Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(
                currentUser.role
              ) ? (
                <Reports />
              ) : (
                <Dashboard setView={handleViewChange} />
              );
            case "documents":
              return <Documents setView={handleViewChange} />;
            default:
              return <Dashboard setView={handleViewChange} />;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300">
        {currentUser && (
          <Header
            currentView={mainView}
            setView={handleViewChange}
            condoLogo={condoLogo}
            setCondoLogo={handleSetLogo}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}

        <main
          className={`max-w-7xl mx-auto ${currentUser ? "px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8" : ""}`}
          style={currentUser ? { paddingTop: '120px' } : {}}
        >
          {renderContent()}
        </main>
      </div>

      {currentUser && (
        <BottomNavigation
          currentView={mainView}
          setView={handleViewChange}
          onToggleMenu={() => setMobileMenuOpen(prev => !prev)}
          hasUnreadNotifications={toasts.length > 0} // Using toasts as proxy or pass notifications logic later
        />
      )}

      {/* Container de toasts */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </div>
      </div>
    </>
  );
};

export default App;
