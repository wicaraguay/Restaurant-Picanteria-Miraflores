import React, { useState } from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  /** Si true, muestra spinner mientras procesa */
  showLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  showLoading = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 shadow-red-500/25';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25';
      default:
        return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center py-4">
        {getIcon()}
        <p className="text-gray-600 dark:text-gray-400 font-bold mb-8">
          {message}
        </p>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3.5 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-dark-700 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={async () => {
              if (showLoading) {
                setIsLoading(true);
                try {
                  await onConfirm();
                } finally {
                  setIsLoading(false);
                }
              } else {
                onConfirm();
                onClose();
              }
            }}
            disabled={isLoading}
            className={`flex-1 px-6 py-3.5 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${getButtonStyles()}`}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Procesando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
