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

  // 🔥 ATIVA O FCM AUTOMATICAMENTE APÓS LOGIN (SOMENTE UMA VEZ)
  useEffect(() => {
    if (currentUser) {
      const hasNotificationSupport = 'Notification' in window;

      // Use um mecanismo para garantir que só rode uma vez por login
      const setupFCM = async () => {
        if (hasNotificationSupport && (Notification.permission === 'granted' || Notification.permission === 'default')) {
          await requestPushPermission(currentUser.id);
        }

        const unsub = await setupForegroundNotifications(async (payload) => {
          console.log("🔔 [App.tsx] Processando mensagem para interface:", payload);
          const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
          const body = payload.notification?.body || payload.data?.body || "";
          addToast(`${title}: ${body}`, "info");

          // 🔊 SOM E VIBRAÇÃO NO APP ABERTO (FOREGROUND)
          try {
            // 1. Vibração (se suportado pelo celular)
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]); // Dois toques curtos
            }

            // 2. Beep Robusto
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine'; // Som mais limpo
            osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6 (Nota aguda)

            // Aumentando volume (de 0.1 para 0.5)
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);

            console.log("🔊 Som de notificação disparado com sucesso.");
          } catch (e) {
            console.warn("Navegador impediu áudio automático. Clique no site para ativar.");
          }
        });

        return unsub;
      };

      let unsubscribePromise = setupFCM();

      return () => {
        unsubscribePromise.then(unsub => {
          if (unsub) unsub();
        });
      };
    }
  }, [currentUser?.id]); // Depender apenas do ID do usuário garante que só rode ao trocar de usuário

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
