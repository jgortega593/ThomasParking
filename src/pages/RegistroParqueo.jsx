// src/pages/RegistroParqueo.jsx
import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import SelectorDeFoto from '../components/SelectorDeFoto';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import useOnlineStatus from '../hooks/useOnlineStatus';

function getLocalDateTimeString() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function RegistroParqueo() {
  const [copropietarios, setCopropietarios] = useState([]);
  const [form, setForm] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    fecha_hora_ingreso: getLocalDateTimeString(),
    observaciones: '',
    dependencia_id: '',
    gratis: false,
    recaudado: false,
    fecha_recaudo: '',
    fotos: [],
    audio: null,
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState(null);

  // Obtener usuario autenticado
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) setUser(user);
    });
    return () => { isMounted = false; };
  }, []);

  // Cargar copropietarios
  useEffect(() => {
    let isMounted = true;
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada');
      if (!error && isMounted) setCopropietarios(data || []);
    };
    fetchCopropietarios();
    return () => { isMounted = false; };
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'recaudado' && !checked ? { fecha_recaudo: '' } : {})
    }));
  };

  const handleFotos = archivos => setForm(prev => ({ ...prev, fotos: archivos }));

  const handleAudio = archivo => setForm(prev => ({ ...prev, audio: archivo }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!form.placa_vehiculo.trim()) throw new Error('La placa es obligatoria');
      if (!form.dependencia_id) throw new Error('Seleccione un copropietario');
      if (!form.fecha_hora_ingreso) throw new Error('La fecha/hora es obligatoria');
      if (!user?.id) throw new Error('No se pudo identificar el usuario. Inicie sesión nuevamente.');

      // Subir fotos (array)
      let foto_urls = [];
      for (const file of form.fotos) {
        const fileName = `foto_${form.placa_vehiculo}_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
        const { error: uploadError } = await supabase
          .storage
          .from('evidencias-parqueadero')
          .upload(fileName, file, { contentType: 'image/jpeg' });
        if (uploadError) throw new Error('Error al subir la foto: ' + uploadError.message);
        const { data: publicUrlData } = supabase
          .storage
          .from('evidencias-parqueadero')
          .getPublicUrl(fileName);
        foto_urls.push(publicUrlData.publicUrl);
      }

      // Subir audio (opcional)
      let observacion_audio_url = null;
      if (form.audio) {
        const fileName = `audio_obs_${form.placa_vehiculo}_${Date.now()}.webm`;
        const { error: audioError } = await supabase
          .storage
          .from('evidencias-parqueadero')
          .upload(fileName, form.audio, { contentType: 'audio/webm' });
        if (audioError) throw new Error('Error al subir el audio: ' + audioError.message);
        const { data: publicUrlData } = supabase
          .storage
          .from('evidencias-parqueadero')
          .getPublicUrl(fileName);
        observacion_audio_url = publicUrlData.publicUrl;
      }

      // Monto según tipo y gratis
      const monto = form.gratis ? 0 : (form.tipo_vehiculo === 'carro' ? 1.00 : 0.50);

      // Insertar registro
      const { error: insertError } = await supabase
        .from('registros_parqueadero')
        .insert([{
          placa_vehiculo: form.placa_vehiculo.trim().toUpperCase(),
          tipo_vehiculo: form.tipo_vehiculo,
          fecha_hora_ingreso: form.fecha_hora_ingreso,
          observaciones: form.observaciones,
          dependencia_id: form.dependencia_id,
          gratis: form.gratis,
          recaudado: form.recaudado,
          fecha_recaudo: form.recaudado ? form.fecha_recaudo : null,
          monto,
          foto_url: foto_urls.length > 0 ? foto_urls : null, // array
          observacion_audio_url,
          usuario_id: user.id // Campo obligatorio
        }]);
      if (insertError) throw new Error('Error al guardar registro: ' + insertError.message);

      setMensaje('Registro guardado correctamente');
      setForm({
        placa_vehiculo: '',
        tipo_vehiculo: 'carro',
        fecha_hora_ingreso: getLocalDateTimeString(),
        observaciones: '',
        dependencia_id: '',
        gratis: false,
        recaudado: false,
        fecha_recaudo: '',
        fotos: [],
        audio: null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-center dark:text-white">
        <Emoji symbol="📝" /> Registro de Parqueo
      </h2>
      {!isOnline && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
          <Emoji symbol="⚡" /> Modo offline: el registro se guardará localmente y se sincronizará al volver la conexión.
        </div>
      )}
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">
          {mensaje}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Placa del vehículo:</label>
          <input
            name="placa_vehiculo"
            value={form.placa_vehiculo}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
            autoFocus
          />
        </div>
        <div>
          <label>Tipo de vehículo:</label>
          <select
            name="tipo_vehiculo"
            value={form.tipo_vehiculo}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
          </select>
        </div>
        <div>
          <label>Fecha y hora de ingreso:</label>
          <input
            type="datetime-local"
            name="fecha_hora_ingreso"
            value={form.fecha_hora_ingreso}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label>Copropietario:</label>
          <select
            name="dependencia_id"
            value={form.dependencia_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Seleccione...</option>
            {copropietarios.map(dep => (
              <option key={dep.id} value={dep.id}>
                {dep.nombre} ({dep.propiedad} - {dep.unidad_asignada})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Observaciones:</label>
          <input
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            maxLength={100}
          />
        </div>
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="gratis"
              checked={form.gratis}
              onChange={handleChange}
            />
            <span><Emoji symbol="🆓" /> Gratis</span>
          </label>
        </div>
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="recaudado"
              checked={form.recaudado}
              onChange={handleChange}
            />
            <span><Emoji symbol="🔗" /> Recaudado</span>
          </label>
        </div>
        {form.recaudado && (
          <div>
            <label>Fecha de recaudación:</label>
            <input
              type="date"
              name="fecha_recaudo"
              value={form.fecha_recaudo}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required={form.recaudado}
            />
          </div>
        )}
        <div>
          <label>Evidencia fotográfica:</label>
          <SelectorDeFoto
            onFilesSelected={handleFotos}
            maxFiles={1}
            disabled={loading}
          />
        </div>
        <div>
          <label>Evidencia auditiva (opcional):</label>
          <input
            type="file"
            accept="audio/*"
            onChange={e => handleAudio(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          {loading ? <Loader text="Guardando..." /> : <>Registrar</>}
        </button>
      </form>
    </div>
  );
}
