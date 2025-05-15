// src/components/LoadingScreen.jsx

import React from 'react';

export default function LoadingScreen({ message = 'Cargando...', fullScreen = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen
          ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 bg-opacity-80'
          : 'w-full h-full'
      }`}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="mb-4">
        {/* Spinner SVG accesible */}
        <svg
          className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400"
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
      <span className="text-gray-600 dark:text-gray-200 text-lg font-medium">{message}</span>
    </div>
  )
}
