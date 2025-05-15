// src/components/Modal.jsx
import React, { useEffect } from "react";

/**
 * Modal reutilizable para toda la app.
 * Props:
 * - isOpen: boolean, controla si el modal está abierto
 * - onClose: función, llamada al cerrar (clic fondo o botón cerrar)
 * - children: contenido del modal
 */
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  // Evita el scroll del fondo cuando el modal está abierto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(24,24,27,0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal-content"
        style={{
          background: "var(--surface, #fff)",
          borderRadius: 20,
          boxShadow: "0 8px 32px #6366f133",
          padding: "2rem",
          maxWidth: 480,
          width: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          textAlign: "left",
          position: "relative"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón de cerrar en la esquina superior derecha */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
          aria-label="Cerrar modal"
          type="button"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            fontSize: 28,
            color: "#888",
            cursor: "pointer"
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
