import React, { useEffect, useRef } from "react";
import { Notification } from "../types";

interface NotificationsDropdownProps {
  notifications: Notification[];
  currentUserId: string;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  currentUserId,
  onMarkAllRead,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // AUTO-FECHAMENTO → Clicar fora fecha
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="
        absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-40
        animate-slideFadeIn
      "
    >
      {/* CABEÇALHO */}
      <div className="p-3 flex justify-between items-center border-b bg-gray-50">
        <h4 className="font-semibold">Notificações</h4>

        {notifications.some((n) => !n.readBy.includes(currentUserId)) && (
          <button
            onClick={onMarkAllRead}
            className="text-sm text-indigo-600 hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* LISTA */}
      <ul className="max-h-80 overflow-y-auto animate-slideFadeIn">
        {notifications.length > 0 ? (
          notifications.map((n) => {
            const unread = !n.readBy.includes(currentUserId);

            return (
              <li
                key={n.id}
                className={`p-3 border-b transition-colors ${
                  unread ? "bg-indigo-50" : "bg-white"
                }`}
              >
                <p className="text-sm">{n.message}</p>

                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </p>
              </li>
            );
          })
        ) : (
          <li className="p-4 text-center text-sm text-gray-500">
            Nenhuma notificação.
          </li>
        )}
      </ul>
    </div>
  );
};

export default NotificationsDropdown;
