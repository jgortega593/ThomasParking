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

  // Estado para manejar la foto y su previsualización
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);

  // Estado principal del formulario
  const [formData, setFormData] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    fecha_hora_ingreso: dayjs().format('YYYY-MM-DD'),
    dependencia_id: '',
    observaciones: '',
    gratis: false,
    audio: null
  });

  // Generar previsualización de la foto
  useEffect(() => {
    if (!foto) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(foto);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [foto]);

  // Cargar lista de copropietarios
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

  // Manejar cambios en los inputs del formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejar la selección de foto (desde cámara o archivo)
  const handleFileSelected = (file) => {
    setFoto(file);
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Subir foto si existe
      let fotoUrl = '';
      if (foto) {
        const nombreFoto = `foto_${Date.now()}_${formData.placa_vehiculo}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias-parqueadero')
          .upload(nombreFoto, foto);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('evidencias-parqueadero')
          .getPublicUrl(nombreFoto);
        fotoUrl = urlData.publicUrl;
      }

      // 2. Subir audio si existe
      let audioUrl = '';
      if (formData.audio) {
        const nombreAudio = `audio_${Date.now()}_${formData.placa_vehiculo}.webm`;
        const { error: audioError } = await supabase.storage
          .from('evidencias-parqueadero')
          .upload(nombreAudio, formData.audio);
        
        if (audioError) throw audioError;
        
        const { data: audioUrlData } = supabase.storage
          .from('evidencias-parqueadero')
          .getPublicUrl(nombreAudio);
        audioUrl = audioUrlData.publicUrl;
      }

      // 3. Obtener ID del usuario
      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuarioApp } = await supabase
        .from('usuarios_app')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!usuarioApp) throw new Error('Usuario no encontrado');

      // 4. Insertar registro en la base de datos
      const { error: insertError } = await supabase
        .from('registros_parqueadero')
        .insert([{
          ...formData,
          foto_url: fotoUrl,
          observacion_audio_url: audioUrl,
          monto: formData.gratis ? 0 : (formData.tipo_vehiculo === 'carro' ? 1.00 : 0.50),
          usuario_id: usuarioApp.id,
          fecha_hora_ingreso: formData.fecha_hora_ingreso
        }]);

      if (insertError) throw insertError;

      // 5. Redirigir y limpiar formulario
      navigate('/consultas', { state: { success: true } });
      setFormData({
        placa_vehiculo: '',
        tipo_vehiculo: 'carro',
        fecha_hora_ingreso: dayjs().format('YYYY-MM-DD'),
        dependencia_id: '',
        observaciones: '',
        gratis: false,
        audio: null
      });
      setFoto(null);
      
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
        {/* Campos del formulario */}
        <div className="grid-form">
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
        </div>

        {/* Selector de foto con previsualización */}
        <div className="seccion-foto">
          <label>
            <Emoji symbol="📷" /> Evidencia Fotográfica:
            <SelectorDeFoto onFileSelected={handleFileSelected} />
          </label>
          
          {preview && (
            <div className="preview-container">
              <img
                src={preview}
                alt="Previsualización"
                className="thumbnail"
              />
              <button
                type="button"
                onClick={() => setFoto(null)}
                className="btn-eliminar-foto"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Campo de audio */}
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

        {/* Observaciones */}
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

        {/* Checkbox de parqueo gratis */}
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
