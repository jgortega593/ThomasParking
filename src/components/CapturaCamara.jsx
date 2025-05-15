// src/components/CapturaCamara.jsx
import React, { useState, useEffect, useRef } from 'react'
import Emoji from './Emoji'

export default function CapturaCamara({ onCaptura }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [foto, setFoto] = useState(null)
  const [modoCamara, setModoCamara] = useState('environment')
  const [stream, setStream] = useState(null)

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
            width: { ideal: 220 },
            height: { ideal: 165 }
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
  }, [modoCamara])

  // Capturar foto
  const capturarFoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      const file = new File([blob], 'foto-capturada.jpg', { type: 'image/jpeg' })
      setFoto(URL.createObjectURL(file))
      onCaptura(file)
    }, 'image/jpeg', 0.9)
  }

  // Cambiar cámara frontal/trasera
  const cambiarCamara = () => {
    setModoCamara(prev => prev === 'user' ? 'environment' : 'user')
  }

  if (error) return (
    <div className="error-camara">
      <Emoji symbol="📷" /> {error}
      <div style={{ fontSize: 14, marginTop: 8 }}>
        Asegúrate de permitir el acceso a la cámara
      </div>
    </div>
  )

  return (
    <div
      className="contenedor-camara"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#18181b',
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {!foto ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxWidth: '220px',
              aspectRatio: '4/3',
              borderRadius: '12px',
              background: '#222',
              transform: modoCamara === 'user' ? 'scaleX(-1)' : 'none',
              boxShadow: '0 2px 16px #0006'
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={capturarFoto}
              className="btn-capturar"
              style={{ minWidth: 90, fontSize: 18 }}
            >
              <Emoji symbol="📸" /> Capturar
            </button>
            <button
              type="button"
              onClick={cambiarCamara}
              className="btn-cambiar-camara"
              style={{ minWidth: 90, fontSize: 18 }}
            >
              <Emoji symbol="🔄" /> Cambiar
            </button>
          </div>
        </>
      ) : (
        <>
          <img
            src={foto}
            alt="Previsualización"
            style={{
              width: '100%',
              maxWidth: '220px',
              aspectRatio: '4/3',
              borderRadius: '12px',
              border: '2px solid #e0e0e0',
              boxShadow: '0 2px 16px #0006'
            }}
          />
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setFoto(null)}
              className="btn-reintentar"
              style={{ minWidth: 120, fontSize: 18 }}
            >
              <Emoji symbol="🔄" /> Volver a tomar
            </button>
          </div>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
