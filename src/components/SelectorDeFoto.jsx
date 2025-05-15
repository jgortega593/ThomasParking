import React, { useState } from 'react'
import Modal from './Modal'
import CapturaCamara from './CapturaCamara'

export default function SelectorDeFoto({ onFileSelected }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [foto, setFoto] = useState(null)

  const handleFile = file => {
    setFoto(null)
    setModalAbierto(false)
    onFileSelected(file)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => setModalAbierto(true)}>
          📸 Usar cámara
        </button>
        <label>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onFileSelected(e.target.files[0])
              }
            }}
          />
          <span style={{ cursor: 'pointer' }}>🖼️ Seleccionar archivo</span>
        </label>
      </div>

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)}>
        <CapturaCamara
          onCaptura={file => {
            setFoto(file)
          }}
        />
        {foto && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                handleFile(foto)
              }}
              style={{ padding: '10px 24px', fontSize: '1.1rem' }}
            >
              📤 Enviar foto
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
