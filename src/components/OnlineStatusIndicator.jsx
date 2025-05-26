// src/components/OnlineStatusIndicator.jsx
import React from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';

export default function OnlineStatusIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center px-4 py-2 rounded-full shadow-lg font-semibold
        ${isOnline ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-yellow-100 text-yellow-900 border border-yellow-300'}
      `}
      style={{ minWidth: 120, justifyContent: 'center', pointerEvents: 'none' }}
      aria-live="polite"
      role="status"
    >
      <span
        className={`inline-block w-3 h-3 rounded-full mr-2
          ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}
        `}
        aria-hidden="true"
      />
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );
}
