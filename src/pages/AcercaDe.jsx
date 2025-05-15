// src/components/AcercaDe.jsx
import Emoji from '../components/Emoji'
import React from 'react'


export default function AcercaDe() {
  return (
    <section
      className="acerca-de-container"
      style={{
        background: '#f8fafc',
        borderRadius: 16,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        padding: '2rem',
        maxWidth: 700,
        margin: '2rem auto',
        textAlign: 'left'
      }}
    >
      <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 12 }}>
        <Emoji symbol="ℹ️" label="Acerca de" /> Acerca de la aplicación
      </h2>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="🚗" label="Parqueadero" /> <b>Aplicación para Gestión de Parqueaderos de Visita</b> diseñada para el <b>Conjunto Habitacional Thomas II</b>. Permite registrar, consultar y gestionar el uso de parqueaderos de visita de manera eficiente, transparente y segura.
      </p>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="👨‍💻" label="Desarrollador" /> <b>Desarrollado por:</b> Gabriel Ortega - Presidente CEO Thomas II
      </p>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="✉️" label="Email" /> <b>Contacto:</b> <a href="mailto:gabrielortega@outlook.com">gabrielortega@outlook.com</a>
        <br />
        <Emoji symbol="📱" label="Celular" /> <b>Celular:</b> <a href="tel:0999268450">0999268450</a>
      </p>
    </section>
  )
}
