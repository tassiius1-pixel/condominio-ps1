// FIX: Corrected React import for hooks.
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserManagement from "./components/UserManagement";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
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
const Boletos = React.lazy(() => import("./components/Boletos").then(m => ({ default: m.Boletos })));

import Toast from "./components/Toast";
import NotificationPrompt from "./components/NotificationPrompt";
import PWAInstallOverlay from "./components/PWAInstallOverlay";

const App: React.FC = () => {
  const { currentUser, loadingAuth } = useAuth();
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
      } else {
        // Se o estado do histórico for null (ex: voltou para o início), 
        // tenta pegar pela URL ou volta para home.
        const params = new URLSearchParams(window.location.search);
        const viewFromUrl = params.get("view") as View;
        setMainView(viewFromUrl || "home");
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

      // 🔊 PERSISTENT AUDIO CONTEXT (Safari Fix)
      const setupFCM = async () => {
        let audioCtx: AudioContext | null = null;
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
          }
        } catch (e) {
          console.warn("AudioContext not supported or blocked:", e);
        }

        const triggerBeep = async () => {
          if (!audioCtx) return;
          try {
            console.log("🔊 [App] Tentando disparar beep. Estado atual:", audioCtx.state);
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume().catch(e => console.warn("Falha ao resumir AudioContext:", e));
            }

            if (audioCtx.state === 'running') {
              // Somente toca no celular (pelo menos evita PC se detectado)
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime);
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
              }
            }
          } catch (err) {
            console.error("Audio beep failed:", err);
          }
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile && "vibrate" in navigator) {
            try { navigator.vibrate([200, 100, 200]); } catch (e) { }
          }
        };

        // Expor para o Header.tsx chamar diretamente (Safari/PWA bypass)
        (window as any).triggerPushBeep = triggerBeep;

        // Listen for manual test
        const handleTestAudio = () => triggerBeep();
        window.addEventListener('test-push-audio', handleTestAudio);

        // 🔥 GESTO DO USUÁRIO PARA LIBERAR ÁUDIO (Chrome/Safari requirement)
        const unlockAudio = () => {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
              console.log("🔊 [App] AudioContext desbloqueado pelo clique.");
            });
          }
          // Removemos após o primeiro sucesso para não pesar
          if (audioCtx?.state === 'running') {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
          }
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        if (hasNotificationSupport && (Notification.permission === 'granted' || Notification.permission === 'default')) {
          try {
            await requestPushPermission(currentUser.id);
          } catch (error) {
            console.error("Push permission request failed:", error);
          }
        }

        const unsub = await setupForegroundNotifications(async (payload) => {
          console.log("🔔 [App.tsx] SOS Mensagem:", payload);
          const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
          const body = payload.notification?.body || payload.data?.body || "";
          addToast(`${title}: ${body}`, "info");
          await triggerBeep();

          // 🔥 FORÇA O POPUP DO SISTEMA NO CELULAR (MESMO COM APP ABERTO)
          // Mas só se o documento estiver visível e as permissões ok
          if ("serviceWorker" in navigator && Notification.permission === 'granted') {
            try {
              const registration = await navigator.serviceWorker.ready;
              console.log("🔔 [App.tsx] ServiceWorker pronto.");

              // Evitamos duplicar se o sistema já mostrou via background (raro mas possível em transições)
              registration.showNotification(title, {
                body: body,
                icon: "/favicon.png",
                badge: "/favicon.png",
                tag: "gestao-ps1",
                renotify: true,
                vibrate: [200, 100, 200],
                data: { url: window.location.href }
              } as any).then(() => {
                console.log("✅ [App.tsx] showNotification chamado com sucesso.");
              }).catch(e => {
                console.error("Falha ao chamar showNotification:", e);
              });
            } catch (e) {
              console.error("Erro ao acessar registration.ready:", e);
            }
          }
        });

        return () => {
          if (unsub) unsub();
          window.removeEventListener('test-push-audio', handleTestAudio);
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        };
      };

      let cleanup: (() => void) | undefined;
      setupFCM().then(c => cleanup = c).catch(err => console.error("SetupFCM failed:", err));

      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [currentUser?.id]); // Depender apenas do ID do usuário garante que só rode ao trocar de usuário

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 animate-bounce duration-1000">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Nexora Flow</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

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
            case "boletos":
              return <Boletos setView={handleViewChange} />;
            default:
              return <Dashboard setView={handleViewChange} />;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <>
      <PWAInstallOverlay />
      <div className="min-h-screen bg-slate-50 text-gray-900 transition-colors duration-300">
        {currentUser && (
          <>
            <Header
              currentView={mainView}
              setView={handleViewChange}
              condoLogo={condoLogo}
              setCondoLogo={handleSetLogo}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
            <Sidebar
              currentView={mainView}
              setView={handleViewChange}
              condoLogo={condoLogo}
              setCondoLogo={handleSetLogo}
            />
          </>
        )}

        <main
          className={`${currentUser ? "px-4 sm:px-6 lg:px-10 pb-32 sm:pb-24 lg:pb-8 pt-24 sm:pt-[120px] lg:pt-6 lg:ml-64" : "max-w-7xl mx-auto"}`}
        >
          {currentUser && <NotificationPrompt />}
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
