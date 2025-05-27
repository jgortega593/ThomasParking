// src/components/SemaforoResumen.jsx
import React from 'react';
import Emoji from './Emoji';

/**
 * SemaforoResumen
 * Muestra un resumen estadístico tipo "semaforo" sobre los registros recibidos.
 * Props:
 * - registros: array de objetos de registros (filtrados por el padre)
 * - customLabels: objeto opcional para personalizar los textos de cada métrica
 * - colorFondo: string opcional para personalizar el fondo
 */
export default function SemaforoResumen({
  registros = [],
  customLabels = {},
  colorFondo = 'rgba(255,255,255,0.1)'
}) {
  // Lógica de negocio igual a Compensación
  const resumen = registros.reduce((acc, reg) => {
    if (reg.gratis) acc.gratis++;
    else if (reg.recaudado) acc.recaudado += Number(reg.monto || 0);
    else acc.pendiente += Number(reg.monto || 0);
    acc.total += Number(reg.monto || 0);
    acc.cantidad++;
    return acc;
  }, { recaudado: 0, pendiente: 0, gratis: 0, total: 0, cantidad: 0 });

  // Permite personalizar los textos
  const labels = {
    recaudado: customLabels.recaudado || 'Recaudado',
    pendiente: customLabels.pendiente || 'Pendiente',
    gratis: customLabels.gratis || 'Gratis',
    cantidad: customLabels.cantidad || 'Registros',
    total: customLabels.total || 'Total'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '1rem',
      padding: '1rem',
      background: colorFondo,
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#10B981' }}>
          <Emoji symbol="💰" label="Recaudado" /> ${resumen.recaudado.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>{labels.recaudado}</small>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#F59E0B' }}>
          <Emoji symbol="⏳" label="Pendiente" /> ${resumen.pendiente.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>{labels.pendiente}</small>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#3B82F6' }}>
          <Emoji symbol="🆓" label="Gratis" /> {resumen.gratis}
        </div>
        <small style={{ color: '#666' }}>{labels.gratis}</small>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#6366F1' }}>
          <Emoji symbol="📋" label="Registros" /> {resumen.cantidad}
        </div>
        <small style={{ color: '#666' }}>{labels.cantidad}</small>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#8B5CF6' }}>
          <Emoji symbol="🧾" label="Total" /> ${resumen.total.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>{labels.total}</small>
      </div>
    </div>
  );
}
