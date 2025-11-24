import React, { useEffect, useRef } from "react";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { Notification } from "../types";
import { db } from "../services/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { TrashIcon, XIcon } from "./Icons";

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
      className="fixed inset-x-4 top-20 z-50 md:absolute md:inset-auto md:top-full md:right-0 md:mt-4 md:w-80 bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in border border-gray-100"
    >
      {/* Título + botão excluir todas */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h4 className="text-sm font-bold text-gray-700">
          Notificações
        </h4>

        {filtered.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors flex items-center gap-1"
          >
            <TrashIcon className="w-3 h-3" />
            Limpar tudo
          </button>
        )}
      </div>

      <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-gray-500 text-sm">
              Nenhuma notificação no momento.
            </p>
          </div>
        )}

        {filtered.map((notification: Notification) => {
          const isRead = notification.readBy?.includes(userId || "");

          return (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-100 flex justify-between items-start gap-3 transition-colors hover:bg-gray-50 ${isRead ? 'bg-white' : 'bg-blue-50/50'}`}
            >
              <div className="flex-1">
                <p className={`text-sm ${isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                  {notification.message}
                </p>
                <small className="text-xs text-gray-400 mt-1 block">
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </small>
              </div>

              {/* Botão para limpar individual */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                title="Remover notificação"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsDropdown;
