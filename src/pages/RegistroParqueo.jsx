// src/pages/RegistroParqueo.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import SelectorDeFoto from '../components/SelectorDeFoto';
import useOnlineStatus from '../hooks/useOnlineStatus';
import dayjs from 'dayjs';

export default function RegistroParqueo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copropietarios, setCopropietarios] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const isOnline = useOnlineStatus();

  // Estado para múltiples archivos
  const [archivos, setArchivos] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    fecha_hora_ingreso: dayjs().format('YYYY-MM-DD'),
    dependencia_id: '',
    observaciones: '',
    gratis: false,
    audio: null
  });

  // Generar miniaturas
  useEffect(() => {
    if (!archivos || archivos.length === 0) {
      setPreviews([]);
      return;
    }
    const urls = archivos.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [archivos]);

  // Cargar copropietarios al montar
  useEffect(() => {
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada')
        .order('propiedad', { ascending: true });

      if (error) setError('Error cargando copropietarios: ' + error.message);
      else setCopropietarios(data || []);
      
      setLoading(false);
    };

    fetchCopropietarios();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejar selección de múltiples archivos
  const handleFileSelected = (file) => {
    setArchivos(prev => [...prev, file]);
  };

  // Eliminar imagen antes de enviar
  const handleRemove = (idx) => {
    setArchivos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Obtener usuario_app_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuarioApp } = await supabase
        .from('usuarios_app')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!usuarioApp) throw new Error('Usuario no encontrado');

      // 2. Subir archivos
      const fotosUrls = [];
      for (const file of archivos) {
        const nombre = `foto_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias-parqueadero')
          .upload(nombre, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('evidencias-parqueadero')
          .getPublicUrl(nombre);
        fotosUrls.push(urlData.publicUrl);
      }

      // 3. Subir audio si existe
      let audioUrl = '';
      if (formData.audio) {
        const audioName = `audio_${Date.now()}_${formData.placa_vehiculo}.webm`;
        const { error: audioError } = await supabase.storage
          .from('evidencias-parqueadero')
          .upload(audioName, formData.audio);
        
        if (audioError) throw audioError;
        
        const { data: audioUrlData } = supabase.storage
          .from('evidencias-parqueadero')
          .getPublicUrl(audioName);
        audioUrl = audioUrlData.publicUrl;
      }

      // 4. Insertar registro
      const { error: insertError } = await supabase
        .from('registros_parqueadero')
        .insert([{
          placa_vehiculo: formData.placa_vehiculo,
          tipo_vehiculo: formData.tipo_vehiculo,
          fecha_hora_ingreso: formData.fecha_hora_ingreso,
          dependencia_id: formData.dependencia_id,
          usuario_id: usuarioApp.id,
          observaciones: formData.observaciones,
          foto_url: fotosUrls,  // Array de URLs
          observacion_audio_url: audioUrl,
          monto: formData.gratis ? 0 : (formData.tipo_vehiculo === 'carro' ? 1.00 : 0.50),
          gratis: formData.gratis
        }]);

      if (insertError) throw insertError;

      navigate('/consultas', { state: { success: true } });
    } catch (err) {
      setError(`Error registrando parqueo: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Cargando formulario..." />;

  return (
    <div className="registro-container">
      <h2><Emoji symbol="📝" /> Registro de Parqueo</h2>

      <form onSubmit={handleSubmit} className="form-registro">
        {/* Campo de fecha */}
        <label>
          <Emoji symbol="📅" /> Fecha de Ingreso:
          <input
            type="date"
            name="fecha_hora_ingreso"
            value={formData.fecha_hora_ingreso}
            onChange={handleChange}
            required
          />
        </label>

        {/* Placa del vehículo */}
        <label>
          <Emoji symbol="🚗" /> Placa del Vehículo:
          <input
            type="text"
            name="placa_vehiculo"
            value={formData.placa_vehiculo}
            onChange={handleChange}
            pattern="[A-Za-z0-9]{6,8}"
            title="Formato de placa válido (6-8 caracteres alfanuméricos)"
            required
          />
        </label>

        {/* Tipo de vehículo */}
        <label>
          <Emoji symbol="🚦" /> Tipo de Vehículo:
          <select
            name="tipo_vehiculo"
            value={formData.tipo_vehiculo}
            onChange={handleChange}
            required
          >
            <option value="carro">Carro 🚗</option>
            <option value="moto">Moto 🏍️</option>
          </select>
        </label>

        {/* Selección de copropietario */}
        <label>
          <Emoji symbol="🏠" /> Copropietario:
          <select
            name="dependencia_id"
            value={formData.dependencia_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione un copropietario...</option>
            {copropietarios.map(cop => (
              <option key={cop.id} value={cop.id}>
                {cop.nombre} ({cop.propiedad} - {cop.unidad_asignada})
              </option>
            ))}
          </select>
        </label>

        {/* Selector de fotos múltiples */}
        <label>
          <Emoji symbol="📷" /> Evidencia Fotográfica:
          <SelectorDeFoto 
            onFileSelected={handleFileSelected}
            multiple  // Nueva prop para permitir múltiples selecciones
          />
        </label>

        {/* Previsualización de imágenes */}
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {previews.map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: 70, height: 70 }}>
                <img
                  src={url}
                  alt={`preview-${idx}`}
                  style={{
                    width: 70,
                    height: 70,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1.5px solid #eee'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                  title="Eliminar imagen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Grabación de audio */}
        <label>
          <Emoji symbol="🎙️" /> Observación de Audio:
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFormData(prev => ({
              ...prev,
              audio: e.target.files?.[0] || null
            }))}
          />
        </label>

        {/* Campo de observaciones */}
        <label>
          <Emoji symbol="📝" /> Observaciones:
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows="3"
            maxLength="500"
          />
        </label>

        {/* Checkbox de gratis */}
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="gratis"
            checked={formData.gratis}
            onChange={handleChange}
          />
          <Emoji symbol="🆓" /> Parqueo Gratuito
        </label>

        {/* Mensajes de estado */}
        {error && <div className="error-message">{error}</div>}
        {!isOnline && (
          <div className="offline-warning">
            <Emoji symbol="⚠️" /> Modo offline - Los datos se sincronizarán cuando se recupere la conexión
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={submitting || !isOnline}
          className="btn-submit"
        >
          {submitting ? <Loader text="Registrando..." /> : <><Emoji symbol="✅" /> Registrar Parqueo</>}
        </button>
      </form>
    </div>
  );
}
