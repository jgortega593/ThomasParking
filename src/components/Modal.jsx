// src/components/Modal.jsx
import React from "react";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      style={{ minHeight: '100vh' }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
        style={{ minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
          aria-label="Cerrar modal"
          type="button"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
