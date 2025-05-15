// src/components/ErrorMessage.jsx
import React from 'react'

/**
 * ErrorMessage
 * @param {string} title - Título del error (opcional)
 * @param {string|React.ReactNode} message - Mensaje de error a mostrar
 * @param {boolean} retryable - Si es true, muestra botón de reintentar
 * @param {function} onRetry - Función a ejecutar al reintentar
 * @param {React.ReactNode} [children] - Elementos adicionales opcionales
 */
export default function ErrorMessage({
  title = 'Ha ocurrido un error',
  message = 'Intenta nuevamente o contacta al administrador.',
  retryable = false,
  onRetry,
  children,
}) {
  return (
    <div
      className="max-w-lg mx-auto my-8 p-6 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800 shadow"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-center mb-2">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400 mr-2 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-100">{title}</h3>
      </div>
      <div className="text-red-700 dark:text-red-200 mb-4 break-words">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
      {children}
      {retryable && typeof onRetry === 'function' && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
