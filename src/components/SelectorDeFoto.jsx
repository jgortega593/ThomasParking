// src/components/SelectorDeFoto.jsx
import React, { useState, useEffect } from 'react';
import CapturaCamara from './CapturaCamara';

/**
 * SelectorDeFoto
 * Componente para seleccionar o capturar fotos, mostrando previsualización en miniatura.
 * Props:
 * - onFilesSelected: function(files[]) => void
 * - maxFiles: número máximo de fotos permitidas (default: 5)
 * - disabled: boolean (opcional)
 */
export default function SelectorDeFoto({ onFilesSelected, maxFiles = 5, disabled }) {
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const [modo, setModo] = useState('galeria');

  // Actualiza el listado de archivos y notifica al padre
  const actualizarArchivos = (nuevosArchivos) => {
    const archivosCombinados = [...files, ...nuevosArchivos].slice(0, maxFiles);
    setFiles(archivosCombinados);
    if (onFilesSelected) onFilesSelected(archivosCombinados);
  };

  // Maneja selección desde galería
  const handleFileChange = (e) => {
    if (disabled) return;
    const selectedFiles = Array.from(e.target.files);
    actualizarArchivos(selectedFiles);
  };

  // Maneja captura desde cámara
  const handleCapturaCamara = (file) => {
    if (disabled) return;
    actualizarArchivos([file]);
  };

  // Elimina una foto seleccionada
  const eliminarFoto = (index) => {
    const nuevosArchivos = files.filter((_, i) => i !== index);
    setFiles(nuevosArchivos);
    if (onFilesSelected) onFilesSelected(nuevosArchivos);
  };

  // Genera y limpia previews de archivos
  useEffect(() => {
    const nuevasPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
    }));
    setPreviews(nuevasPreviews);
    return () => {
      nuevasPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  return (
    <div className="selector-foto">
      <div className="modos-seleccion" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setModo('galeria')}
          className={modo === 'galeria' ? 'active' : ''}
          style={{ marginRight: '1rem' }}
          disabled={disabled}
        >
          🖼️ Subir Archivos
        </button>
        <button
          type="button"
          onClick={() => setModo('camara')}
          className={modo === 'camara' ? 'active' : ''}
          disabled={disabled}
        >
          📸 Usar Cámara
        </button>
      </div>

      {modo === 'galeria' ? (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            aria-label="Seleccionar fotos"
            style={{ display: 'block', margin: '1rem 0' }}
            disabled={disabled || files.length >= maxFiles}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {previews.map((preview, idx) => (
              <div key={idx} style={{ textAlign: 'center', position: 'relative' }}>
                <button
                  onClick={() => eliminarFoto(idx)}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                  }}
                  aria-label="Eliminar foto"
                >
                  ×
                </button>
                <img
                  src={preview.url}
                  alt={preview.name}
                  style={{
                    width: 90,
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                  }}
                />
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {preview.name.length > 15 
                    ? preview.name.slice(0, 12) + '...' 
                    : preview.name}
                </div>
              </div>
            ))}
          </div>
          <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
            {files.length}/{maxFiles} fotos seleccionadas
          </small>
        </>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
          <CapturaCamara 
            onCaptura={handleCapturaCamara}
            onCancelar={() => setModo('galeria')}
            maxWidth="220px"
          />
        </div>
      )}
    </div>
  );
}
