// src/components/LoadingOverlay.jsx
import React from 'react'

/**
 * LoadingOverlay
 * @param {string} message - Mensaje opcional para mostrar debajo del spinner
 * @param {boolean} fullScreen - Si es true, ocupa toda la pantalla
 */
export default function LoadingOverlay({ message = 'Cargando...', fullScreen = true }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen
          ? 'fixed inset-0 z-50 bg-white/80 dark:bg-gray-900/80'
          : 'w-full h-full'
      }`}
      style={fullScreen ? { minHeight: '100vh' } : {}}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="mb-4">
        {/* Spinner SVG accesible */}
        <svg
          className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
      <span className="text-gray-700 dark:text-gray-200 text-lg font-medium">{message}</span>
    </div>
  )
}
