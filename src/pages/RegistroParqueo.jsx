import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import SelectorDeFoto from '../components/SelectorDeFoto';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import useOnlineStatus from '../hooks/useOnlineStatus';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroParqueo() {
  const isOnline = useOnlineStatus();
  const [formData, setFormData] = useState({
    placa: '',
    tipoVehiculo: 'carro',
    fechaHora: '',
    gratis: false,
    observaciones: '',
    propiedad: '',
    unidadAsignada: '',
    fotos: []
  });
  const [copropietarios, setCopropietarios] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Obtener fecha/hora actual en GMT-5 (Ecuador)
  const getLocalDateTime = () => {
    return dayjs().tz('America/Guayaquil').format('YYYY-MM-DDTHH:mm');
  };

  useEffect(() => {
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada')
        .order('propiedad', { ascending: true });
      if (!error) setCopropietarios(data || []);
    };
    if (isOnline) fetchCopropietarios();
  }, [isOnline]);

  // Opciones para selects
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidades = formData.propiedad
    ? copropietarios
        .filter(c => c.propiedad === formData.propiedad)
        .map(c => ({
          unidad: c.unidad_asignada,
          copropietarioId: c.id,
          nombreCopropietario: c.nombre
        }))
    : [];

  // Obtener copropietarioId basado en propiedad y unidad seleccionada
  const getCopropietarioId = () => {
    if (!formData.propiedad || !formData.unidadAsignada) return null;
    const copropietario = copropietarios.find(
      c =>
        c.propiedad === formData.propiedad &&
        c.unidad_asignada === formData.unidadAsignada
    );
    return copropietario?.id || null;
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'propiedad' && { unidadAsignada: '' })
    }));
  };

  // Subir fotos a Supabase Storage
  const uploadPhotos = async (files, placa) => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileName = `fotos/${placa}_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('evidencias-parqueadero')
        .upload(fileName, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage
        .from('evidencias-parqueadero')
        .getPublicUrl(fileName);
      uploadedUrls.push(publicUrl.publicUrl);
    }
    return uploadedUrls;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!formData.propiedad || !formData.unidadAsignada) {
        throw new Error('Debe seleccionar una propiedad y unidad');
      }
      if (!formData.placa || formData.placa.length < 6) {
        throw new Error('La placa debe tener al menos 6 caracteres');
      }

      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const copropietarioId = getCopropietarioId();
      if (!copropietarioId) throw new Error('Unidad no válida');

      // FIX: Si fechaHora es "" (string vacío), enviar null
      const fechaHoraValida = formData.fechaHora && formData.fechaHora.trim() !== ''
        ? dayjs.tz(formData.fechaHora, 'America/Guayaquil').toISOString()
        : null;

      const registro = {
        placa_vehiculo: formData.placa.toUpperCase().replace(/\s/g, ''),
        tipo_vehiculo: formData.tipoVehiculo,
        fecha_hora_ingreso: fechaHoraValida,
        observaciones: formData.observaciones,
        dependencia_id: copropietarioId,
        usuario_id: user.id,
        monto: formData.gratis ? 0 : (formData.tipoVehiculo === 'carro' ? 1.00 : 0.50),
        gratis: formData.gratis,
        foto_url: []
      };

      // Manejo de fotos
      if (formData.fotos.length > 0) {
        if (isOnline) {
          registro.foto_url = await uploadPhotos(formData.fotos, registro.placa_vehiculo);
        } else {
          registro.foto_url = formData.fotos.map(() => 'pendiente-sync');
        }
      }

      if (isOnline) {
        const { error } = await supabase
          .from('registros_parqueadero')
          .insert([registro]);
        if (error) throw error;
      } else {
        const pending = JSON.parse(localStorage.getItem('pendingRegistros') || '[]');
        localStorage.setItem('pendingRegistros', JSON.stringify([...pending, registro]));
      }

      setFormData({
        placa: '',
        tipoVehiculo: 'carro',
        fechaHora: getLocalDateTime(),
        gratis: false,
        observaciones: '',
        propiedad: '',
        unidadAsignada: '',
        fotos: []
      });

      setSuccessMsg(isOnline
        ? 'Registro exitoso!'
        : 'Registro guardado localmente. Se sincronizará cuando haya conexión');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-center dark:text-white">
        <Emoji symbol="📝" /> Registro de Parqueo
      </h2>

      {!isOnline && (
        <div className="offline-banner mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
          <Emoji symbol="⚡" /> Modo offline: Los datos se guardarán localmente
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Placa */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Placa del vehículo
          </label>
          <input
            type="text"
            name="placa"
            value={formData.placa}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                placa: e.target.value.toUpperCase()
              }))
            }
            required
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Ej: ABC1234"
            pattern="[A-Z0-9]{6,8}"
            title="6-8 caracteres alfanuméricos"
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {/* Selector Tipo de Vehículo */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Tipo de vehículo
          </label>
          <select
            name="tipoVehiculo"
            value={formData.tipoVehiculo}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          >
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
          </select>
        </div>

        {/* Selector de Fecha y Hora */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Fecha y Hora (GYE)
          </label>
          <input
            type="datetime-local"
            name="fechaHora"
            value={formData.fechaHora || getLocalDateTime()}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Selector de Propiedad */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Propiedad
          </label>
          <select
            name="propiedad"
            value={formData.propiedad}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          >
            <option value="">Seleccione una propiedad</option>
            {propiedades.map(prop => (
              <option key={prop} value={prop}>{prop}</option>
            ))}
          </select>
        </div>

        {/* Selector de Unidad */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Unidad
          </label>
          <select
            name="unidadAsignada"
            value={formData.unidadAsignada}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
            disabled={!formData.propiedad}
          >
            <option value="">Seleccione una unidad</option>
            {unidades.map(u => (
              <option key={u.copropietarioId} value={u.unidad}>
                {u.unidad} - {u.nombreCopropietario}
              </option>
            ))}
          </select>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Observaciones
          </label>
          <input
            type="text"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            maxLength={120}
            placeholder="Observaciones adicionales"
          />
        </div>

        {/* Checkbox Gratis */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="gratis"
            checked={formData.gratis}
            onChange={handleChange}
            className="mr-2"
            id="gratis"
          />
          <label htmlFor="gratis" className="text-sm dark:text-gray-200">
            Registro gratuito
          </label>
        </div>

        {/* Fotos */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Evidencia fotográfica (máx. 5)
          </label>
          <SelectorDeFoto
            archivos={formData.fotos}
            setArchivos={files => setFormData(prev => ({ ...prev, fotos: files }))}
            maxArchivos={5}
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
          disabled={submitting}
        >
          {submitting ? 'Registrando...' : 'Registrar Parqueo'}
        </button>
      </form>
    </div>
  );
}
