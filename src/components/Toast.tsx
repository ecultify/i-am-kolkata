import React from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
        <p className="text-sm">{message}</p>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-rose-400 hover:text-rose-300 text-sm font-medium whitespace-nowrap"
          >
            {actionLabel}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};