import React from 'react';

export default function SyncIndicator({ syncStatus }) {
  // syncStatus puede ser: 'idle', 'syncing', 'success', 'error'
  let message = null;
  let style = {
    padding: '6px 12px',
    borderRadius: 8,
    fontWeight: '600',
    fontSize: '0.9rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  switch (syncStatus) {
    case 'syncing':
      message = <>🔄 Sincronizando datos...</>;
      style = { ...style, backgroundColor: '#e0f2fe', color: '#0284c7' };
      break;
    case 'success':
      message = <>✅ Sincronización exitosa</>;
      style = { ...style, backgroundColor: '#dcfce7', color: '#15803d' };
      break;
    case 'error':
      message = <>❌ Error en la sincronización</>;
      style = { ...style, backgroundColor: '#fee2e2', color: '#b91c1c' };
      break;
    default:
      return null; // no mostrar nada si idle
  }

  return <div style={style} aria-live="polite">{message}</div>;
}
