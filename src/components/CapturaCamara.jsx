import React, { useRef, useState, useEffect } from 'react'

export default function CapturaCamara({ onCaptura }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [foto, setFoto] = useState(null)
  const [stream, setStream] = useState(null)

  useEffect(() => {
    (async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 360 }, height: { ideal: 480 } }
      })
      setStream(mediaStream)
      if (videoRef.current) videoRef.current.srcObject = mediaStream
    })()
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  }, [])

  const capturar = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
      setFoto(URL.createObjectURL(file))
      onCaptura(file)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {!foto && (
        <>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: 320, borderRadius: 12 }} />
          <button type="button" onClick={capturar} style={{ marginTop: 18, padding: '10px 24px' }}>📸 Capturar</button>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
