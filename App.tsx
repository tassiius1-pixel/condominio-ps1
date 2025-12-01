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
import { requestPushPermission } from "./services/pushNotifications";

// Lazy Loading Components
const Reports = React.lazy(() => import("./components/Reports"));
const Reservations = React.lazy(() => import("./components/Reservations"));
const Occurrences = React.lazy(() => import("./components/Occurrences"));
const VotingModule = React.lazy(() => import("./components/VotingModule"));
const Notices = React.lazy(() => import("./components/Notices"));

import Toast from "./components/Toast";

const App: React.FC = () => {
  const { currentUser } = useAuth();
  const { toasts, removeToast } = useData();

  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [mainView, setMainView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("view") as View) || "notices";
  });

  const [condoLogo, setCondoLogo] = useState<string | null>(() => {
    return localStorage.getItem("condo-logo");
  });

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

  // 🔥 ATIVA O FCM AUTOMATICAMENTE APÓS LOGIN
  useEffect(() => {
    if (currentUser) {
      requestPushPermission(currentUser.id);
    }
  }, [currentUser]);

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
            case "notices":
              return <Notices setView={handleViewChange} />;
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
          />
        )}

        <main
          className={`max-w-7xl mx-auto ${currentUser ? "p-4 sm:p-6 lg:p-8" : ""
            }`}
        >
          {renderContent()}
        </main>
      </div>

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
