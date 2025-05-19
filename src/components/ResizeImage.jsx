import React, { useState, useEffect, useRef } from 'react';
import CapturaCamara from './CapturaCamara';

export default function ResizeImage({ 
  onFilesSelected, 
  maxFiles = 5, 
  disabled = false,
  maxWidth = 800,
  quality = 0.8
}) {
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const [modo, setModo] = useState('galeria');
  const fileInputRef = useRef(null);

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = height * scale;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            URL.revokeObjectURL(url);
            resolve(resizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.src = url;
    });
  };

  const handleFiles = async (newFiles) => {
    if (disabled) return;
    
    const processedFiles = await Promise.all(
      Array.from(newFiles)
        .slice(0, maxFiles - files.length)
        .map(async (file) => {
          if (file.type.startsWith('image/')) {
            return await resizeImage(file);
          }
          return file;
        })
    );

    const updatedFiles = [...files, ...processedFiles].slice(0, maxFiles);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
    e.target.value = null;
  };

  const handleCameraCapture = async (file) => {
    const resizedFile = await resizeImage(file);
    handleFiles([resizedFile]);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  useEffect(() => {
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
    }));
    
    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <button
          type="button"
          onClick={() => setModo('galeria')}
          className={`px-4 py-2 rounded-lg ${
            modo === 'galeria' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 hover:bg-gray-200'
          }`}
          disabled={disabled}
        >
          🖼️ Subir Archivos
        </button>
        
        <button
          type="button"
          onClick={() => setModo('camara')}
          className={`px-4 py-2 rounded-lg ${
            modo === 'camara' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 hover:bg-gray-200'
          }`}
          disabled={disabled || files.length >= maxFiles}
        >
          📸 Usar Cámara
        </button>
      </div>

      {modo === 'galeria' ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || files.length >= maxFiles}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            disabled={disabled || files.length >= maxFiles}
          >
            <div className="text-center text-gray-500">
              Arrastra archivos o haz clic para seleccionar
              <div className="text-sm mt-2">
                Máximo {maxFiles} imágenes ({maxWidth}px ancho máximo)
              </div>
              <div className="text-sm">
                Formatos soportados: JPEG, PNG
              </div>
            </div>
          </button>
        </>
      ) : (
        <div className="border rounded-lg p-4">
          <CapturaCamara 
            onCaptura={handleCameraCapture}
            maxWidth={maxWidth}
            disabled={disabled || files.length >= maxFiles}
          />
        </div>
      )}

      {previews.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
  type="button"
  onClick={() => removeFile(index)}
  className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
  aria-label="Eliminar imagen"
  style={{
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 1,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  }}
>
  ×
</button>

                </div>
                
                <img
  src={preview.url}
  alt={preview.name}
  style={{
    width: 38,
    height: 38,
    objectFit: 'cover',
    borderRadius: 6,
    border: '1px solid #ccc'
  }}
/>

                
                <div className="text-xs mt-1 text-gray-600 truncate">
                  {preview.name}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            {files.length}/{maxFiles} archivos seleccionados
          </div>
        </div>
      )}
    </div>
  );
}
