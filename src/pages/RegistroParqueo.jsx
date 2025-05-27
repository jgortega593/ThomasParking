// src/pages/RegistroParqueo.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Emoji from '../components/Emoji';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import useOnlineStatus from '../hooks/useOnlineStatus';
import SelectorDeFoto from '../components/SelectorDeFoto';
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
    const { error } = await supabase.storage
      .from('evidencias-parqueadero')
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase
      .storage
      .from('evidencias-parqueadero')
      .getPublicUrl(fileName);
    uploadedUrls.push(data.publicUrl);
  }
  return uploadedUrls;
};

export default function RegistroParqueo() {
  const [formDisabled, setFormDisabled] = useState(false);
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
  const [mensajeExito, setMensajeExito] = useState('');
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const onFilesSelected = (files) => {
    setFormData(prev => ({
      ...prev,
      fotos: files
    }));
  };

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
      const recorder = new window.MediaRecorder(stream);
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
    setMensajeExito('');
    try {
      if (!formData.placa_vehiculo.match(/^[A-Za-z0-9]{6,8}$/)) {
        throw new Error('Formato de placa inválido (6-8 caracteres alfanuméricos)');
      }
      if (!formData.dependencia_id) {
        throw new Error('Debe seleccionar un copropietario');
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");
      const fechaHoraIngreso = formData.fecha_hora_ingreso
        ? dayjs(formData.fecha_hora_ingreso).tz('America/Guayaquil').toISOString()
        : null;
      const fotosUrls = await uploadPhotos(formData.fotos || [], formData.placa_vehiculo);

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

      const { error } = await supabase.from('registros_parqueadero').insert([registro]);
      if (error) throw error;

      setMensajeExito('Registro guardado exitosamente.');
      setTimeout(() => setMensajeExito(''), 3500);
      setFormData({
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
      setAudioUrl(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFormDisabled(false);
    }
  };

  if (loading) return <Loader fullScreen text="Cargando formulario..." />;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        <Emoji symbol="📝" /> Registro de Parqueo
      </h1>

      {mensajeExito && (
        <div
          className="bg-green-600 text-white px-4 py-3 rounded shadow mb-4 text-center fade-in-up"
          style={{ fontWeight: 'bold', fontSize: '1.1em', letterSpacing: '0.5px' }}
          role="status"
          aria-live="polite"
        >
          <Emoji symbol="✅" label="Éxito" /> {mensajeExito}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="block font-semibold mb-1">
            Placa del vehículo:
          </label>
          <input
  name="placa_vehiculo"
  value={formData.placa_vehiculo}
  onChange={e => {
    // Solo mayúsculas y números
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      placa_vehiculo: val
    }));
  }}
  required
  className="w-full p-2 border rounded"
  placeholder="Ej: PBA1234"
  autoFocus
  maxLength={8}
  pattern="[A-Z0-9]{6,8}"
  title="Solo letras mayúsculas y números (6 a 8 caracteres)"
/>
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Tipo de vehículo:
          </label>
          <select
            name="tipo_vehiculo"
            value={formData.tipo_vehiculo}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            disabled={formDisabled}
          >
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Fecha y hora de ingreso:
          </label>
          <input
            name="fecha_hora_ingreso"
            type="datetime-local"
            value={formData.fecha_hora_ingreso}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            disabled={formDisabled}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Observaciones:
          </label>
          <input
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Observaciones (opcional)"
            disabled={formDisabled}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Copropietario:
          </label>
          <select
  name="dependencia_id"
  value={formData.dependencia_id}
  onChange={handleChange}
  className="w-full p-2 border rounded"
  required
>
  <option value="">Seleccione un copropietario</option>
  {[...copropietarios]
    .sort((a, b) => {
      // Ordena primero Casa, luego Departamento, y luego por unidad asignada
      if (a.propiedad === b.propiedad) {
        return String(a.unidad_asignada).localeCompare(String(b.unidad_asignada), 'es', { numeric: true });
      }
      if (a.propiedad === 'Casa') return -1;
      if (b.propiedad === 'Casa') return 1;
      return a.propiedad.localeCompare(b.propiedad, 'es');
    })
    .map(copropietario => (
      <option key={copropietario.id} value={copropietario.id}>
        {copropietario.propiedad === 'Casa' && '🏡'}
        {copropietario.propiedad === 'Departamento' && '🌆'}
        {' '}
         - {copropietario.unidad_asignada}
      </option>
    ))}
</select>

        </div>
        <div>
          <label className="block font-semibold mb-1">
            Monto:
          </label>
          <input
            name="monto"
            type="number"
            min="0"
            step="0.01"
            value={formData.monto}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Monto"
            disabled={formDisabled || formData.gratis}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="gratis"
            checked={formData.gratis}
            onChange={handleChange}
            id="gratis"
            disabled={formDisabled}
          />
          <label htmlFor="gratis" className="font-semibold">
            <Emoji symbol="🆓" /> Gratis
          </label>
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Foto (opcional):
          </label>
          <SelectorDeFoto onFilesSelected={onFilesSelected} maxFiles={3} disabled={formDisabled} />
        </div>
        <div>
          <label className="block font-semibold mb-1">
            Audio (opcional):
          </label>
          <div className="flex items-center gap-2">
            {!grabandoAudio && (
              <button
                type="button"
                onClick={iniciarGrabacion}
                className="bg-blue-500 text-white px-3 py-1 rounded"
                disabled={formDisabled}
              >
                <Emoji symbol="🎤" /> Grabar audio
              </button>
            )}
            {grabandoAudio && (
              <button
                type="button"
                onClick={detenerGrabacion}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                <Emoji symbol="⏹️" /> Detener
              </button>
            )}
            {audioUrl && (
              <audio src={audioUrl} controls style={{ height: 36 }} />
            )}
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors font-semibold"
            disabled={loading || formDisabled || !isOnline}
          >
            {loading ? <Loader text="Guardando..." /> : 'Guardar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}
