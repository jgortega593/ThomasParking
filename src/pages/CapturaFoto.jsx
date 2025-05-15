import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CapturaCamara from '../components/CapturaCamara';

export default function CapturaFoto() {
  const [foto, setFoto] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Recibe la función para manejar el archivo desde la página anterior, si se usa navigate con state
  const onEnviar = () => {
    if (location.state && location.state.onFileSelected && foto) {
      location.state.onFileSelected(foto);
    }
    navigate(-1); // Regresa a la página anterior
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <CapturaCamara onCaptura={setFoto} />
      </div>
      {foto && (
        <button
          style={{
            marginTop: 20,
            padding: '12px 28px',
            fontSize: '1.1rem',
            background: '#38bdf8',
            color: '#fff',
            border: 'none',
            borderRadius: 8
          }}
          onClick={onEnviar}
        >
          Enviar foto
        </button>
      )}
      <button
        style={{
          marginTop: 16,
          background: 'transparent',
          color: '#fff',
          border: 'none',
          fontSize: 18
        }}
        onClick={() => navigate(-1)}
      >
        Cancelar
      </button>
    </div>
  );
}
