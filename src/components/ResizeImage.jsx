import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import CapturaCamara from './CapturaCamara';

const ResizeImage = ({ maxWidth = 800, onImageChange }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Maneja la selección de archivos desde el dispositivo
  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      resizeImage(file);
    } else {
      setError('Por favor selecciona un archivo de imagen válido.');
    }
  };

  // Redimensiona la imagen antes de enviarla al callback
  const resizeImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let newWidth = img.width;
        let newHeight = img.height;
        if (img.width > maxWidth) {
          newWidth = maxWidth;
          newHeight = Math.round((img.height * maxWidth) / img.width);
        }
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
            const resizedUrl = URL.createObjectURL(resizedFile);
            setImageSrc(resizedUrl);
            onImageChange(resizedFile);
            setError(null);
          } else {
            setError('Error al procesar la imagen.');
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => setError('Error al cargar la imagen.');
      img.src = e.target.result;
    };
    reader.onerror = () => setError('Error al leer el archivo.');
    reader.readAsDataURL(file);
  };

  // Abre el selector de archivos del sistema
  const openFileSelector = () => {
    setError(null);
    fileInputRef.current && fileInputRef.current.click();
  };

  // Maneja la imagen capturada por la cámara
  const handleCapture = (file) => {
    resizeImage(file);
    setShowCamera(false);
  };

  // Cierra el modal de la cámara
  const handleCancelCamera = () => setShowCamera(false);

  // Permite borrar la imagen seleccionada
  const handleRemoveImage = () => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      onImageChange(null);
    }
  };

  return (
    <div style={{ textAlign: 'center', maxWidth: 400, margin: 'auto' }}>
      {error && (
        <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>
      )}

      {imageSrc ? (
        <div style={{ marginBottom: 16 }}>
          <img
            src={imageSrc}
            alt="Imagen seleccionada"
            style={{
              maxWidth: '100%',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          />
          <div>
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                fontSize: 14,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              aria-label="Eliminar imagen seleccionada"
            >
              Eliminar imagen
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: '#666', marginBottom: 16 }}>No hay imagen seleccionada.</p>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Seleccionar imagen desde dispositivo"
      />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={openFileSelector}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
          aria-label="Seleccionar imagen desde dispositivo"
        >
          Seleccionar Imagen
        </button>

        <button
          type="button"
          onClick={() => { setShowCamera(true); setError(null); }}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
          aria-label="Abrir cámara para capturar imagen"
        >
          Capturar Imagen
        </button>
      </div>

      {showCamera && (
        <CapturaCamara
          onCaptura={handleCapture}
          onCancelar={handleCancelCamera}
          maxWidth={maxWidth}
        />
      )}
    </div>
  );
};

ResizeImage.propTypes = {
  maxWidth: PropTypes.number,
  onImageChange: PropTypes.func.isRequired
};

export default ResizeImage;
