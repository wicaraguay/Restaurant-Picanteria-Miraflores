import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b dark:border-dark-700 p-4 sticky top-0 bg-white dark:bg-dark-800">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-800 dark:text-light-background">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-800 transition-colors dark:text-gray-500 dark:hover:text-white"
            aria-label="Cerrar modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-6">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;