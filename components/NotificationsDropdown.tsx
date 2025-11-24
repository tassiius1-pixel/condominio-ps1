import React, { useEffect, useRef } from "react";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { Notification } from "../types";
import { db } from "../services/firebase";
import { doc, writeBatch } from "firebase/firestore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<Props> = ({ open, onClose }) => {
  const { notifications, deleteNotification, markAllNotificationsAsRead, addToast } =
    useData();
  const { currentUser } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  // Marcar como lidas ao abrir
  useEffect(() => {
    if (open && currentUser) {
      markAllNotificationsAsRead(currentUser.id);
    }
  }, [open]);

  if (!open) return null;

  const userId = currentUser?.id;
  const filtered = notifications.filter(
    (n) => n.userId === "all" || n.userId === userId
  );

  // 🔥 EXCLUIR TODAS – sem vários toasts!
  const handleDeleteAll = async () => {
    try {
      const batch = writeBatch(db);

      filtered.forEach((n) => {
        const ref = doc(db, "notifications", n.id);
        batch.delete(ref);
      });

      await batch.commit();

      addToast("Todas as notificações foram removidas.", "info");
    } catch (err) {
      console.error("Erro ao excluir todas:", err);
      addToast("Erro ao excluir todas notificações.", "error");
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "60px",
        right: "max(20px, 5vw)",
        width: "min(330px, 90vw)",
        background: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "12px 0",
        overflow: "hidden",
        animation: "fadeIn 0.18s ease-out",
        zIndex: 999,
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Título + botão excluir todas */}
      <div
        style={{
          padding: "0 16px",
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: "600",
            color: "#444",
          }}
        >
          Notificações
        </h4>

        {filtered.length > 0 && (
          <button
            onClick={handleDeleteAll}
            style={{
              background: "transparent",
              border: "none",
              color: "#d00",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Excluir todas
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p
          style={{
            textAlign: "center",
            padding: "18px 0",
            color: "#777",
            fontSize: "14px",
          }}
        >
          Nenhuma notificação
        </p>
      )}

      {filtered.map((notification: Notification) => {
        const isRead = notification.readBy?.includes(userId || "");

        return (
          <div
            key={notification.id}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              background: isRead ? "#fff" : "#f5faff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              transition: "background 0.2s",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: "#333" }}>
                {notification.message}
              </p>
              <small style={{ color: "#777" }}>
                {new Date(notification.createdAt).toLocaleString("pt-BR")}
              </small>
            </div>

            {/* Botão para limpar individual */}
            <button
              onClick={() => deleteNotification(notification.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "#999",
                fontSize: "16px",
                cursor: "pointer",
              }}
              title="Remover notificação"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationsDropdown;
