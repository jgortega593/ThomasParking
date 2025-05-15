import React, { useState, useEffect } from 'react'
import CapturaCamara from './CapturaCamara'

export default function SelectorDeFoto({ onFileSelected }) {
  // El modo por defecto es 'camara'
  const [modo, setModo] = useState('camara')

  // Opcional: si usas modal, abre el modal automáticamente aquí

  const handleFile = file => {
    onFileSelected(file)
  }

  return (
    <div className="selector-foto">
      <div className="modos-seleccion" style={{ display: 'none' }}>
        {/* Si no quieres mostrar botones, ocultar con display: 'none' */}
        <button
          type="button"
          onClick={() => setModo('camara')}
          className={modo === 'camara' ? 'active' : ''}
        >
          📸 Usar Cámara
        </button>
        <button
          type="button"
          onClick={() => setModo('galeria')}
          className={modo === 'galeria' ? 'active' : ''}
        >
          🖼️ Subir Archivo
        </button>
      </div>
      {/* Renderiza la cámara automáticamente */}
      {modo === 'camara' ? (
        <CapturaCamara onCaptura={handleFile} />
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0])
            }
          }}
        />
      )}
    </div>
  )
}
