// src/pages/RegistroParqueo.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Emoji from '../components/Emoji';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import useOnlineStatus from '../hooks/useOnlineStatus';
import ResizeImage from '../components/ResizeImage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Utilidad para obtener la fecha/hora de Quito en formato YYYY-MM-DDTHH:mm
const getQuitoDateTimeLocal = () => {
  try {
    return dayjs().tz('America/Guayaquil').format('YYYY-MM-DDTHH:mm');
  } catch {
    return dayjs().format('YYYY-MM-DDTHH:mm');
  }
};

// Subida de fotos: guarda URLs públicas completas
const uploadPhotos = async (files, placa) => {
  const uploadedUrls = [];
  for (const file of files || []) {
    const fileName = `fotos/${placa}_${Date.now()}_${file.name}`;
    // 1. Subir archivo al bucket
    const { error } = await supabase.storage
      .from('evidencias-parqueadero')
      .upload(fileName, file);
    if (error) throw error;
    // 2. Obtener URL pública
    const { data } = supabase
      .storage
      .from('evidencias-parqueadero')
      .getPublicUrl(fileName);
    // 3. Guardar la URL pública en el array
    uploadedUrls.push(data.publicUrl);
  }
  return uploadedUrls;
};

export default function RegistroParqueo() {
  const [formData, setFormData] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    fecha_hora_ingreso: getQuitoDateTimeLocal(),
    observaciones: '',
    monto: 1.0,
    gratis: false,
    recaudado: false,
    fecha_recaudo: null,
    dependencia_id: '',
    fotos: [],
    audioObservacion: null
  });

  const [copropietarios, setCopropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const fetchCopropietarios = async () => {
      try {
        const { data, error } = await supabase
          .from('copropietarios')
          .select('id, nombre, propiedad, unidad_asignada')
          .order('nombre');
        if (error) throw error;
        setCopropietarios(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCopropietarios();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'gratis' && { monto: checked ? 0 : (prev.tipo_vehiculo === 'carro' ? 1.0 : 0.5) }),
      ...(name === 'tipo_vehiculo' && { monto: prev.gratis ? 0 : (value === 'carro' ? 1.0 : 0.5) })
    }));
  };

  // Grabación de audio
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.ondataavailable = (e) => audioChunks.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setFormData(prev => ({ ...prev, audioObservacion: audioBlob }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setGrabandoAudio(true);
    } catch (err) {
      setError('Error al acceder al micrófono');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setGrabandoAudio(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validación básica
      if (!formData.placa_vehiculo.match(/^[A-Za-z0-9]{6,8}$/)) {
        throw new Error('Formato de placa inválido (6-8 caracteres alfanuméricos)');
      }
      if (!formData.dependencia_id) {
        throw new Error('Debe seleccionar un copropietario');
      }

      // Obtener usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");

      // Convertir fecha a ISO en zona Quito o null
      const fechaHoraIngreso = formData.fecha_hora_ingreso
        ? dayjs(formData.fecha_hora_ingreso).tz('America/Guayaquil').toISOString()
        : null;

      // Subir fotos y obtener URLs públicas
      const fotosUrls = await uploadPhotos(formData.fotos || [], formData.placa_vehiculo);

      // Subir audio si existe
      let audioPath = null;
      if (formData.audioObservacion) {
        const fileName = `audios/${formData.placa_vehiculo}_${Date.now()}.webm`;
        const { error: audioError } = await supabase.storage
          .from('evidencias-parqueadero')
          .upload(fileName, formData.audioObservacion);
        if (audioError) throw audioError;
        const { data: audioUrlData } = supabase
          .storage
          .from('evidencias-parqueadero')
          .getPublicUrl(fileName);
        audioPath = audioUrlData.publicUrl;
      }

      // Construir objeto registro
      const registro = {
        placa_vehiculo: formData.placa_vehiculo.toUpperCase(),
        tipo_vehiculo: formData.tipo_vehiculo,
        dependencia_id: formData.dependencia_id,
        usuario_id: user.id,
        observaciones: formData.observaciones || null,
        fecha_hora_ingreso: fechaHoraIngreso,
        recaudado: !!formData.recaudado,
        fecha_recaudo: formData.recaudado && formData.fecha_recaudo ? formData.fecha_recaudo : null,
        monto: formData.gratis ? 0 : Number(formData.monto),
        gratis: !!formData.gratis,
        observacion_audio_url: audioPath,
        foto_url: fotosUrls
      };

      // Insertar registro
      const { error } = await supabase.from('registros_parqueadero').insert([registro]);
      if (error) throw error;
      navigate('/registros');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen text="Cargando formulario..." />;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        <Emoji symbol="📝" /> Registro de Parqueo
      </h1>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">
              <Emoji symbol="🚗" /> Placa del Vehículo
              <input
                type="text"
                name="placa_vehiculo"
                value={formData.placa_vehiculo}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                pattern="[A-Za-z0-9]{6,8}"
                title="Formato de placa inválido (6-8 caracteres alfanuméricos)"
                style={{ textTransform: 'uppercase' }}
              />
            </label>
          </div>
          <div>
            <label className="block mb-2">
              <Emoji symbol="🏍️" /> Tipo de Vehículo
              <select
                name="tipo_vehiculo"
                value={formData.tipo_vehiculo}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </label>
          </div>
        </div>
        <div>
          <label className="block mb-2">
            <Emoji symbol="🏠" /> Copropietario
            <select
              name="dependencia_id"
              value={formData.dependencia_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Seleccione un copropietario</option>
              {copropietarios.map(copropietario => (
                <option key={copropietario.id} value={copropietario.id}>
                  {copropietario.nombre} ({copropietario.propiedad} - {copropietario.unidad_asignada})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">
              <Emoji symbol="⏱️" /> Fecha y Hora de Ingreso (UIO)
              <input
                type="datetime-local"
                name="fecha_hora_ingreso"
                value={formData.fecha_hora_ingreso || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                <Emoji symbol="🌎" /> Hora mostrada corresponde a la zona horaria de <b>Quito (GMT-5)</b>
              </div>
            </label>
          </div>
          {formData.recaudado && (
            <div>
              <label className="block mb-2">
                <Emoji symbol="💰" /> Fecha de Recaudo
                <input
                  type="date"
                  name="fecha_recaudo"
                  value={formData.fecha_recaudo || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required={formData.recaudado}
                />
              </label>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="gratis"
              checked={formData.gratis}
              onChange={handleChange}
              id="gratis"
            />
            <label htmlFor="gratis" className="flex items-center">
              <Emoji symbol="🆓" /> Registro Gratuito
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="recaudado"
              checked={formData.recaudado}
              onChange={handleChange}
              id="recaudado"
            />
            <label htmlFor="recaudado" className="flex items-center">
              <Emoji symbol="✅" /> Pago Recaudado
            </label>
          </div>
        </div>
        {!formData.gratis && (
          <div>
            <label className="block mb-2">
              <Emoji symbol="💲" /> Monto (USD)
              <input
                type="number"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                step="0.01"
                min="0"
                required
                disabled={formData.gratis}
              />
            </label>
          </div>
        )}
        <div>
          <label className="block mb-2">
            <Emoji symbol="📝" /> Observaciones
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="3"
            />
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              <Emoji symbol="📷" /> Evidencia Fotográfica (Máx. 5 fotos)
              <ResizeImage 
                onFilesSelected={files => setFormData(prev => ({ ...prev, fotos: files }))}
                disabled={!isOnline}
              />
            </label>
          </div>
          <div>
            <label className="block mb-2">
              <Emoji symbol="🎤" /> Observación por Audio
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={grabandoAudio ? detenerGrabacion : iniciarGrabacion}
                  className={`px-4 py-2 rounded ${
                    grabandoAudio ? 'bg-red-500' : 'bg-blue-500'
                  } text-white`}
                  disabled={!isOnline}
                >
                  {grabandoAudio ? 'Detener' : 'Iniciar'} Grabación
                </button>
                {audioUrl && (
                  <audio controls>
                    <source src={audioUrl} type="audio/webm" />
                  </audio>
                )}
              </div>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/registros')}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            <Emoji symbol="❌" /> Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading || !isOnline}
          >
            {loading ? <><Emoji symbol="⏳" /> Registrando...</> : <><Emoji symbol="✅" /> Registrar Parqueo</>}
          </button>
        </div>
      </form>
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <Emoji symbol="⚠️" /> Modo offline: Los datos se guardarán localmente y se sincronizarán cuando se recupere la conexión.
        </div>
      )}
    </div>
  );
}
