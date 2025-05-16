// src/pages/RegistroParqueo.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';

export default function RegistroParqueo() {
  const [copropietarios, setCopropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    placa_vehiculo: '',
    tipo_vehiculo: 'carro',
    fecha_hora_ingreso: '',
    observaciones: '',
    dependencia_id: '',
    gratis: false,
  });
  const [success, setSuccess] = useState(null);

  // Cargar copropietarios
  useEffect(() => {
    let isMounted = true;
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada');
      if (!error && isMounted) setCopropietarios(data);
      setLoading(false);
    };
    fetchCopropietarios();
    return () => { isMounted = false };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (!form.placa_vehiculo || !form.fecha_hora_ingreso || !form.dependencia_id) {
        setError('Todos los campos obligatorios deben estar completos.');
        setLoading(false);
        return;
      }
      const monto = form.gratis ? 0 : (form.tipo_vehiculo === 'carro' ? 1.00 : 0.50);
      const { error } = await supabase
        .from('registros_parqueadero')
        .insert([{
          ...form,
          monto,
        }]);
      if (error) throw error;
      setSuccess('Registro guardado exitosamente.');
      setForm({
        placa_vehiculo: '',
        tipo_vehiculo: 'carro',
        fecha_hora_ingreso: '',
        observaciones: '',
        dependencia_id: '',
        gratis: false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Cargando copropietarios..." />;

  return (
    <div className="registro-parqueo-container">
      <h2>
        <Emoji symbol="📝" label="Registro" /> Registro de Parqueo de Visita
      </h2>
      <form className="registro-form" onSubmit={handleSubmit}>
        <label>
          Placa del vehículo:
          <input
            name="placa_vehiculo"
            value={form.placa_vehiculo}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>
        <label>
          Tipo de vehículo:
          <select
            name="tipo_vehiculo"
            value={form.tipo_vehiculo}
            onChange={handleChange}
            required
          >
            <option value="carro">Carro 🚗</option>
            <option value="moto">Moto 🏍️</option>
          </select>
        </label>
        <label>
          Fecha y hora de ingreso:
          <input
            type="datetime-local"
            name="fecha_hora_ingreso"
            value={form.fecha_hora_ingreso}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Observaciones:
          <input
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            placeholder="Opcional"
          />
        </label>
        <label>
          Copropietario:
          <select
            name="dependencia_id"
            value={form.dependencia_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione...</option>
            {copropietarios.map(dep => (
              <option key={dep.id} value={dep.id}>
                {dep.nombre} ({dep.propiedad} - {dep.unidad_asignada})
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="gratis"
            checked={form.gratis}
            onChange={handleChange}
          />
          <Emoji symbol="🆓" label="Gratis " /> Gratis
        </label>
        <button type="submit" className="save-btn" disabled={loading}>
          Guardar
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="info-message">{success}</div>}
    </div>
  );
}
