import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import CapturaCamara from './CapturaCamara'

export default function SelectorDeFoto({ onFileSelected }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  // Generar y limpiar miniatura
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Cuando se toma o selecciona una foto
  const handleFile = archivo => {
    setFile(archivo)
    setModalAbierto(false)
    if (archivo) onFileSelected(archivo)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                handleFile(e.target.files[0])
              }
            }}
          />
          <span style={{ cursor: 'pointer' }}>🖼️ Seleccionar archivo</span>
        </label>
        {preview && (
          <img
            src={preview}
            alt="Miniatura"
            className="thumbnail"
            style={{
              width: 70,
              height: 70,
              objectFit: 'cover',
              borderRadius: 8,
              marginLeft: 8,
              border: '1.5px solid #eee',
              boxShadow: '0 2px 6px #6366f133'
            }}
          />
        )}
      </div>

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)}>
        <CapturaCamara
          onCaptura={fotoFile => {
            if (fotoFile) {
              handleFile(fotoFile)
            }
          }}
        />
      </Modal>
    </div>
  )
}
