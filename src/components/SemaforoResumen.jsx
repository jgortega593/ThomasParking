import React from 'react';
import Emoji from './Emoji';

export default function SemaforoResumen({ registros = [] }) {
  const resumen = registros.reduce((acc, reg) => {
    if (reg.gratis) acc.gratis++;
    else if (reg.recaudado) acc.recaudado += Number(reg.monto || 0);
    else acc.pendiente += Number(reg.monto || 0);
    acc.total += Number(reg.monto || 0);
    acc.cantidad++;
    return acc;
  }, { recaudado: 0, pendiente: 0, gratis: 0, total: 0, cantidad: 0 });

  // Montos exactos en USD, con dos decimales
  const recaudadoUSD = resumen.recaudado.toFixed(2);
  const pendienteUSD = resumen.pendiente.toFixed(2);
  const totalUSD = resumen.total.toFixed(2);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '16px',
      padding: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      margin: '16px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Barra de progreso flotante */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
        width: `${(resumen.recaudado / (resumen.total || 1)) * 100}%`,
        transition: 'width 0.5s ease'
      }} />

      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'thin'
      }}>
        {/* Recaudado */}
        <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '12px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <Emoji symbol="💰" />
              <span style={{
                fontSize: '1.4em',
                fontWeight: '800',
                background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                ${recaudadoUSD}
              </span>
            </div>
            <div style={{
              fontSize: '0.8em',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Recaudado</span>
              <span style={{ color: '#10b981' }}>
                {resumen.total > 0 ? `${((resumen.recaudado / resumen.total) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Pendiente */}
        <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
          <div style={{
            background: 'rgba(234, 179, 8, 0.15)',
            borderRadius: '12px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Emoji symbol="⏳" />
              <span style={{
                fontSize: '1.4em',
                fontWeight: '800',
                color: '#eab308'
              }}>
                ${pendienteUSD}
              </span>
            </div>
            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>Pendiente</div>
          </div>
        </div>

        {/* Gratis */}
        <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '12px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Emoji symbol="🆓" />
              <span style={{
                fontSize: '1.4em',
                fontWeight: '800',
                color: '#3b82f6'
              }}>
                {resumen.gratis}
              </span>
            </div>
            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>Gratis</div>
          </div>
        </div>

        {/* Total */}
        <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '12px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Emoji symbol="🧾" />
              <span style={{
                fontSize: '1.4em',
                fontWeight: '800',
                color: '#8b5cf6'
              }}>
                ${totalUSD}
              </span>
            </div>
            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Indicador de scroll para mobile */}
      <div style={{
        textAlign: 'center',
        color: '#475569',
        fontSize: '0.8em',
        marginTop: '8px'
      }}>
        ← Desliza para ver más →
      </div>
    </div>
  );
}
