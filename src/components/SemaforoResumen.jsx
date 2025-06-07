import React from 'react'
import Emoji from './Emoji'

export default function SemaforoResumen({ registros = [] }) {
  const resumen = registros.reduce((acc, reg) => {
    if (reg.gratis) acc.gratis++
    else if (reg.recaudado) acc.recaudado += Number(reg.monto)
    else acc.pendiente += Number(reg.monto)
    acc.total += Number(reg.monto)
    acc.cantidad++
    if (reg.esfuerzo_no_economico) acc.esfuerzoNoEco++
    return acc
  }, { recaudado: 0, pendiente: 0, gratis: 0, total: 0, cantidad: 0, esfuerzoNoEco: 0 })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '1rem',
      padding: '1rem',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="💰" /> ${resumen.recaudado.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>Recaudado</small>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="⏳" /> ${resumen.pendiente.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>Pendiente</small>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="🆓" /> {resumen.gratis}
        </div>
        <small style={{ color: '#666' }}>Gratis</small>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="🤝" /> {resumen.esfuerzoNoEco}
        </div>
        <small style={{ color: '#666' }}>Con esfuerzo no económico</small>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="📋" /> {resumen.cantidad}
        </div>
        <small style={{ color: '#666' }}>Registros</small>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>
          <Emoji symbol="🧾" /> ${resumen.total.toFixed(2)}
        </div>
        <small style={{ color: '#666' }}>Total</small>
      </div>
    </div>
  )
}
