import React, { useState } from "react";

interface Props {
  oldStatus: string;
  newStatus: string;
  onConfirm: (justification: string) => void;
  onCancel: () => void;
}

const StatusChangeModal: React.FC<Props> = ({
  oldStatus,
  newStatus,
  onConfirm,
  onCancel,
}) => {
  const [text, setText] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Justificar mudança de status
        </h2>

        <p className="text-sm text-gray-700 mb-3">
          Você está alterando o status de:
        </p>

        <p className="text-sm text-gray-800 font-semibold mb-1">
          {oldStatus} → {newStatus}
        </p>

        <textarea
          placeholder="Descreva o motivo da mudança..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full border rounded-md px-3 py-2 mt-3 bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-md bg-white"
          >
            Cancelar
          </button>

          <button
            onClick={() => text.trim() && onConfirm(text.trim())}
            disabled={!text.trim()}
            className={`px-4 py-2 rounded-md text-white ${
              text.trim()
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;
