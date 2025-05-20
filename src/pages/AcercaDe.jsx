// src/pages/AcercaDe.jsx
import Emoji from '../components/Emoji'
import React from 'react'

export default function AcercaDe() {
  return (
    <section
      className="acerca-de-container"
      style={{
        background: 'var(--surface)',
        color: 'var(--text)',
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
        <Emoji symbol="🚗" label="Parqueadero" /> <b>ThomasParking</b> es una aplicación web para la <b>gestión eficiente, transparente y segura de parqueaderos de visita</b> en el <b>Conjunto Habitacional Thomas II</b>.
      </p>
      <ul style={{ marginBottom: 18, paddingLeft: 22 }}>
        <li>
          <Emoji symbol="📝" label="Registro" /> <b>Registrar ingresos y salidas:</b> Guarda cada ingreso y salida de vehículos, asociando el registro a un copropietario y usuario responsable.
        </li>
        <li>
          <Emoji symbol="🔎" label="Consulta" /> <b>Consultas y filtros avanzados:</b> Busca y filtra registros por fecha, placa, propiedad, unidad, tipo de vehículo y estado de pago.
        </li>
        <li>
          <Emoji symbol="📷" label="Foto" /> <b>Evidencia fotográfica y auditiva:</b> Adjunta fotos y audios como evidencia en cada registro.
        </li>
        <li>
          <Emoji symbol="👥" label="Usuarios" /> <b>Gestión de copropietarios y usuarios:</b> Administra residentes y personal, con control de roles y permisos.
        </li>
        <li>
          <Emoji symbol="💰" label="Recaudo" /> <b>Recaudación y reportes:</b> Visualiza resúmenes de montos recaudados, pendientes y registros gratuitos.
        </li>
        <li>
          <Emoji symbol="📱" label="Offline" /> <b>Soporte offline:</b> Consulta y registra datos aunque pierdas conexión; la app sincroniza automáticamente al volver en línea.
        </li>
        <li>
          <Emoji symbol="🔒" label="Seguridad" /> <b>Seguridad y privacidad:</b> Tus datos están protegidos, con acceso restringido según el rol y políticas de seguridad avanzadas.
        </li>
      </ul>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="🖥️" label="Tecnología" /> <b>Interfaz moderna y responsiva</b>, accesible desde cualquier dispositivo.
      </p>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="👨‍💻" label="Desarrollador" /> <b>Desarrollado por:</b> Gabriel Ortega – Presidente CEO Thomas II
      </p>
      <p style={{ fontSize: '1.08rem', marginBottom: 14 }}>
        <Emoji symbol="✉️" label="Email" /> <b>Contacto:</b> <a href="mailto:gabrielortega@outlook.com">gabrielortega@outlook.com</a><br />
        <Emoji symbol="📱" label="Celular" /> <b>Celular:</b> <a href="tel:0999268450">0999268450</a>
      </p>
      <p style={{ fontSize: '1.08rem', color: '#666', marginTop: 18 }}>
        <Emoji symbol="🤝" label="Comunidad" /> Esta aplicación es el resultado del compromiso del conjunto Thomas II con la innovación, la transparencia y la seguridad de todos sus residentes y visitantes.
      </p>
    </section>
  )
}
