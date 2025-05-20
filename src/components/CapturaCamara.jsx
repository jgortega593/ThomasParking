// src/components/CapturaCamara.jsx
import React, { useState, useEffect, useRef } from 'react'
import Emoji from './Emoji'
import Modal from './Modal'

/**
 * CapturaCamara
 * Modal para capturar una foto desde la cámara, con previsualización y opción de aceptar o volver a tomar.
 * Props:
 * - onCaptura: function(File) => void (llamada al aceptar la foto)
 * - onCancelar: function() => void (llamada al cancelar/cerrar el modal)
 * - maxWidth: número o string (ancho máximo de la previsualización, opcional)
 * - disabled: boolean (opcional)
 */
export default function CapturaCamara({ onCaptura, onCancelar, maxWidth = 220, disabled = false }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [foto, setFoto] = useState(null)
  const [modoCamara, setModoCamara] = useState('environment')
  const [stream, setStream] = useState(null)
  const [capturando, setCapturando] = useState(false)

  // Evita scroll en body mientras la cámara está activa
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Iniciar cámara
  useEffect(() => {
    let activo = true
    const iniciarCamara = async () => {
      try {
        const constraints = {
          video: {
            facingMode: modoCamara,
            width: { ideal: maxWidth },
            height: { ideal: Math.round((maxWidth / 4) * 3) }
          },
          audio: false
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        if (activo) {
          setStream(mediaStream)
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }
        }
      } catch (err) {
        setError(`Error de cámara: ${err.message}`)
      }
    }
    iniciarCamara()
    return () => {
      activo = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
    // eslint-disable-next-line
  }, [modoCamara, maxWidth])

  // Capturar foto y previsualizar
  const capturarFoto = () => {
    if (disabled) return
    setCapturando(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setFoto({ url: URL.createObjectURL(file), file })
      }
      setCapturando(false)
    }, 'image/jpeg', 0.92)
  }

  // Aceptar la foto y devolver el archivo
  const aceptarFoto = () => {
    if (foto && foto.file) {
      onCaptura(foto.file)
      if (stream) stream.getTracks().forEach(track => track.stop())
      setFoto(null)
    }
  }

  // Cambiar cámara frontal/trasera
  const cambiarCamara = () => {
    setModoCamara(prev => prev === 'user' ? 'environment' : 'user')
  }

  // Cancelar y cerrar modal
  const handleCancelar = () => {
    if (stream) stream.getTracks().forEach(track => track.stop())
    setFoto(null)
    if (onCancelar) onCancelar()
  }

  if (error) return (
    <Modal isOpen={true} onClose={handleCancelar}>
      <div className="error-camara" style={{ textAlign: 'center', padding: 24 }}>
        <Emoji symbol="📷" /> {error}
        <div style={{ fontSize: 14, marginTop: 8 }}>
          Asegúrate de permitir el acceso a la cámara
        </div>
        <button onClick={handleCancelar} style={{ marginTop: 16 }}>
          Cerrar
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal isOpen={true} onClose={handleCancelar}>
      <div className="contenedor-camara" style={{ textAlign: 'center' }}>
        {!foto ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxWidth: maxWidth,
                aspectRatio: '4/3',
                borderRadius: 12,
                background: '#222',
                transform: modoCamara === 'user' ? 'scaleX(-1)' : 'none',
                boxShadow: '0 2px 16px #0006'
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={capturarFoto}
                className="btn-capturar"
                style={{ minWidth: 90, fontSize: 18 }}
                disabled={capturando || disabled}
              >
                <Emoji symbol="📸" /> {capturando ? 'Capturando...' : 'Capturar'}
              </button>
              <button
                type="button"
                onClick={cambiarCamara}
                className="btn-cambiar-camara"
                style={{ minWidth: 90, fontSize: 18 }}
                disabled={capturando || disabled}
              >
                <Emoji symbol="🔄" /> Cambiar
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                style={{ minWidth: 90, fontSize: 18, background: '#eee', color: '#444' }}
              >
                <Emoji symbol="❌" /> Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <img
              src={foto.url}
              alt="Previsualización"
              style={{
                width: '100%',
                maxWidth: maxWidth,
                aspectRatio: '4/3',
                borderRadius: 12,
                border: '2px solid #e0e0e0',
                boxShadow: '0 2px 16px #0006'
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={aceptarFoto}
                className="btn-aceptar"
                style={{ minWidth: 120, fontSize: 18, background: '#22c55e', color: '#fff' }}
              >
                <Emoji symbol="✅" /> Aceptar
              </button>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(foto.url)
                  setFoto(null)
                }}
                className="btn-reintentar"
                style={{ minWidth: 120, fontSize: 18, background: '#fbbf24', color: '#222' }}
              >
                <Emoji symbol="🔄" /> Volver a tomar
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                style={{ minWidth: 90, fontSize: 18, background: '#eee', color: '#444' }}
              >
                <Emoji symbol="❌" /> Cancelar
              </button>
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </Modal>
  )
}
