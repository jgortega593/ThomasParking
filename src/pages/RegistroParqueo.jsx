import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import ResizeImage from '../components/ResizeImage';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import useOnlineStatus from '../hooks/useOnlineStatus';

export default function RegistroParqueo() {
  const [formData, setFormData] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    propiedad: '',
    unidad: '',
    observaciones: '',
    gratis: false,
    fecha_hora_ingreso: new Date().toISOString().slice(0, 16)
  });

  const [fotos, setFotos] = useState([]);
  const [copropietarios, setCopropietarios] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [unidadesFiltradas, setUnidadesFiltradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  // Cargar copropietarios y propiedades
  useEffect(() => {
    const fetchCopropietarios = async () => {
      try {
        const { data, error } = await supabase
          .from('copropietarios')
          .select('id, propiedad, unidad_asignada');
        
        if (error) throw error;
        
        const uniquePropiedades = [...new Set(data.map(c => c.propiedad))].sort();
        setCopropietarios(data);
        setPropiedades(uniquePropiedades);
        
      } catch (error) {
        setError(`Error cargando propiedades: ${error.message}`);
      }
    };
    
    if (isOnline) fetchCopropietarios();
  }, [isOnline]);

  // Actualizar unidades al cambiar propiedad
  useEffect(() => {
    if (formData.propiedad) {
      const unidades = copropietarios
        .filter(c => c.propiedad === formData.propiedad)
        .map(c => c.unidad_asignada)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();
      
      setUnidadesFiltradas(unidades);
      setFormData(prev => ({ ...prev, unidad: '' }));
    }
  }, [formData.propiedad, copropietarios]);

  const handleFotos = (files) => {
    setFotos(files.slice(0, 5)); // Limitar a máximo 5 fotos
  };

  const obtenerDependenciaId = () => {
    return copropietarios.find(
      c => c.propiedad === formData.propiedad && 
           c.unidad_asignada === formData.unidad
    )?.id || null;
  };

  const submitRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones
      if (!formData.placa_vehiculo.match(/^[A-Z0-9]{3,8}$/i)) {
        throw new Error('Formato de placa inválido (3-8 caracteres alfanuméricos)');
      }
      
      const dependenciaId = obtenerDependenciaId();
      if (!dependenciaId) throw new Error('Debe seleccionar propiedad y unidad válida');

      // Subir múltiples fotos si hay conexión
      let fotoUrls = [];
      if (isOnline && fotos.length > 0) {
        fotoUrls = await Promise.all(
          fotos.map(async (foto) => {
            const fileName = `parqueo/${Date.now()}_${foto.name}`;
            const { error: uploadError } = await supabase.storage
              .from('evidencias-parqueadero')
              .upload(fileName, foto);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
              .from('evidencias-parqueadero')
              .getPublicUrl(fileName);
            return urlData.publicUrl;
          })
        );
      }

      // Insertar registro principal
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('registros_parqueadero')
        .insert([{
          placa_vehiculo: formData.placa_vehiculo.toUpperCase(),
          tipo_vehiculo: formData.tipo_vehiculo,
          dependencia_id: dependenciaId,
          usuario_id: userData.user?.id,
          observaciones: formData.observaciones,
          fecha_hora_ingreso: formData.fecha_hora_ingreso,
          monto: formData.gratis ? 0 : (formData.tipo_vehiculo === 'carro' ? 1.00 : 0.50),
          gratis: formData.gratis,
          foto_url: isOnline ? fotoUrls : [],
          pending_photos: !isOnline && fotos.length > 0
        }]);

      if (insertError) throw insertError;

      navigate('/consultas');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">
        <Emoji symbol="📝" /> Registro de Parqueo
      </h2>

      <form onSubmit={submitRegistro} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Se mantienen todos los inputs existentes */}
          <div>
            <label className="block text-sm font-medium mb-1">Placa del vehículo</label>
            <input
              type="text"
              value={formData.placa_vehiculo}
              onChange={(e) => setFormData({ ...formData, placa_vehiculo: e.target.value.toUpperCase() })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="ABC123"
              required
              pattern="[A-Z0-9]{3,8}"
              title="3-8 caracteres alfanuméricos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de vehículo</label>
            <select
              value={formData.tipo_vehiculo}
              onChange={(e) => setFormData({ ...formData, tipo_vehiculo: e.target.value })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="carro">🚗 Carro</option>
              <option value="moto">🏍️ Moto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Propiedad</label>
            <select
              value={formData.propiedad}
              onChange={(e) => setFormData({ ...formData, propiedad: e.target.value })}
              className="w-full p-2 border rounded bg-white"
              required
            >
              <option value="">Seleccionar propiedad...</option>
              {propiedades.map(propiedad => (
                <option key={propiedad} value={propiedad}>{propiedad}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unidad asignada</label>
            <select
              value={formData.unidad}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
              className="w-full p-2 border rounded bg-white"
              required
              disabled={!formData.propiedad}
            >
              <option value="">Seleccionar unidad...</option>
              {unidadesFiltradas.map(unidad => (
                <option key={unidad} value={unidad}>{unidad}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={formData.fecha_hora_ingreso}
              onChange={(e) => setFormData({ ...formData, fecha_hora_ingreso: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        {/* Sección de fotos modificada para múltiples imágenes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Evidencia fotográfica</label>
          <ResizeImage 
            onFilesSelected={handleFotos}
            maxFiles={5}
            disabled={!isOnline}
            maxWidth={800}
            quality={0.8}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {fotos.map((file, index) => (
              <img
                key={index}
                src={URL.createObjectURL(file)}
                alt={`Previsualización ${index + 1}`}
                className="w-16 h-16 object-cover rounded border"
              />
            ))}
          </div>
          <small className="text-gray-500 text-sm">
            Máximo 5 fotos (JPEG/PNG, 2MB cada una)
          </small>
        </div>

        {/* Resto del formulario se mantiene igual */}
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            className="w-full p-2 border rounded"
            rows="3"
            placeholder="Detalles adicionales..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gratis"
            checked={formData.gratis}
            onChange={(e) => setFormData({ ...formData, gratis: e.target.checked })}
            className="w-4 h-4 text-blue-600 border rounded"
          />
          <label htmlFor="gratis" className="flex items-center gap-1 text-sm">
            <Emoji symbol="🆓" /> Registro gratuito (justificar en observaciones)
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            <Emoji symbol="⚠️" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            disabled={loading || (!isOnline && fotos.length > 0)}
          >
            {loading ? <Loader text="Guardando..." /> : 'Guardar Registro'}
          </button>
        </div>

        {!isOnline && (
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
            <Emoji symbol="⚠️" /> Modo offline: Las fotos se sincronizarán automáticamente al recuperar conexión
          </div>
        )}
      </form>
    </div>
  );
}
