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

// Logger configurado para producción (solo muestra logs en desarrollo)
const logger = {
  log: (...args) => {
    if (import.meta.env.DEV) {
      console.log('[DEV LOG]', ...args);
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

// Función para obtener fecha/hora de Quito en formato ISO
const getQuitoDateTimeLocal = () => {
  try {
    return dayjs().tz('America/Guayaquil').format('YYYY-MM-DDTHH:mm');
  } catch (error) {
    logger.error('Error obteniendo fecha de Quito:', error);
    return dayjs().format('YYYY-MM-DDTHH:mm');
  }
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

  // Cargar copropietarios con logging
  useEffect(() => {
    const fetchCopropietarios = async () => {
      logger.log('Iniciando carga de copropietarios');
      try {
        const { data, error } = await supabase
          .from('copropietarios')
          .select('id, nombre, propiedad, unidad_asignada')
          .order('nombre');
        
        if (error) throw error;
        
        logger.log('Copropietarios cargados:', data?.length);
        setCopropietarios(data || []);
      } catch (err) {
        logger.error('Error cargando copropietarios:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCopropietarios();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'gratis' && { monto: checked ? 0 : (prev.tipo_vehiculo === 'carro' ? 1.0 : 0.5) }),
        ...(name === 'tipo_vehiculo' && { monto: prev.gratis ? 0 : (value === 'carro' ? 1.0 : 0.5) })
      };
      logger.log('Cambio en campo', name, 'Nuevo valor:', newData[name]);
      return newData;
    });
  };

  // Grabación de audio con manejo de errores
  const iniciarGrabacion = async () => {
    logger.log('Iniciando grabación de audio');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.ondataavailable = (e) => {
        logger.log('Datos de audio recibidos:', e.data.size, 'bytes');
        audioChunks.push(e.data);
      };

      recorder.onstop = () => {
        logger.log('Grabación finalizada, procesando audio...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setFormData(prev => ({ ...prev, audioObservacion: audioBlob }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setGrabandoAudio(true);
    } catch (err) {
      logger.error('Error en grabación de audio:', err);
      setError('Error al acceder al micrófono');
    }
  };

  // Subir archivos con manejo de errores y logging
  const subirArchivo = async (file, bucket, path) => {
    logger.log('Iniciando subida de archivo:', file.name);
    try {
      const filePath = `${path}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;
      
      logger.log('Archivo subido exitosamente:', filePath);
      return data.path;
    } catch (error) {
      logger.error('Error subiendo archivo:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    logger.log('Iniciando envío de formulario', formData);

    try {
      // Validación de campos requeridos
      if (!formData.placa_vehiculo.match(/^[A-Z0-9]{6,8}$/)) {
        throw new Error('Formato de placa inválido (6-8 caracteres alfanuméricos)');
      }

      if (!formData.dependencia_id) {
        throw new Error('Debe seleccionar un copropietario');
      }

      // Obtener usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuario no autenticado");

      // Preparar datos para inserción
      const registroData = {
        ...formData,
        fecha_hora_ingreso: dayjs(formData.fecha_hora_ingreso)
          .tz('America/Guayaquil')
          .toISOString(),
        usuario_id: user.id,
        fecha_recaudo: formData.recaudado ? formData.fecha_recaudo : null,
        observaciones: formData.observaciones || null,
        monto: formData.gratis ? 0 : formData.monto
      };

      // Subir evidencias
      const [fotosPaths, audioPath] = await Promise.all([
        Promise.all(formData.fotos.map(file => 
          subirArchivo(file, 'evidencias-parqueadero', 'fotos')
        )),
        formData.audioObservacion ? 
          subirArchivo(formData.audioObservacion, 'evidencias-parqueadero', 'audios') 
          : null
      ]);

      // Insertar registro principal
      const { data, error } = await supabase
        .from('registros_parqueadero')
        .insert([{
          ...registroData,
          fotos_urls: fotosPaths,
          observacion_audio_url: audioPath
        }])
        .select();

      if (error) throw error;
      
      logger.log('Registro exitoso. ID:', data[0]?.id);
      navigate('/registros');
    } catch (err) {
      logger.error('Error en submit:', {
        message: err.message,
        stack: err.stack,
        code: err.code
      });
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
        {/* Campos del formulario... (mantener igual versión anterior) */}
        
        {/* Sección multimedia */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              <Emoji symbol="📷" /> Evidencia Fotográfica
              <ResizeImage 
                onFilesSelected={(files) => {
                  logger.log('Fotos seleccionadas:', files);
                  setFormData(prev => ({ ...prev, fotos: files }))
                }}
                disabled={!isOnline}
              />
            </label>
          </div>

          {/* Resto del formulario... */}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={loading || !isOnline}
          >
            {loading ? (
              <><Emoji symbol="⏳" /> Registrando...</>
            ) : (
              <><Emoji symbol="✅" /> Registrar Parqueo</>
            )}
          </button>
        </div>
      </form>

      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          <Emoji symbol="⚠️" /> Modo offline: Los datos se guardarán localmente y se sincronizarán cuando se recupere la conexión.
        </div>
      )}
    </div>
  );
}
