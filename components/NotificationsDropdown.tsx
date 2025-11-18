import React, { useEffect, useRef } from "react";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { Notification } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<Props> = ({ open, onClose }) => {
  const { notifications, deleteNotification, markAllNotificationsAsRead } =
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

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "60px",
        right: "20px",
        width: "330px",
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

      <h4
        style={{
          margin: "0 0 8px 0",
          padding: "0 16px",
          fontSize: "15px",
          fontWeight: "600",
          color: "#444",
        }}
      >
        Notificações
      </h4>

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
