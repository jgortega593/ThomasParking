// src/pages/Consultas.jsx
import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import useOnlineStatus from '../hooks/useOnlineStatus';
import dayjs from 'dayjs';

export default function Consultas() {
  const [registros, setRegistros] = useState([]);
  const [copropietarios, setCopropietarios] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    placa: '',
    propiedad: '',
    unidadAsignada: '',
    tipoVehiculo: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, registro: null });
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOnline = useOnlineStatus();

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resRegistros, resCopropietarios] = await Promise.all([
          supabase
            .from('registros_parqueadero')
            .select(`
              id,
              placa_vehiculo,
              tipo_vehiculo,
              fecha_hora_ingreso,
              observaciones,
              foto_url,
              gratis,
              monto,
              recaudado,
              fecha_recaudo,
              dependencia_id,
              observacion_audio_url,
              copropietarios:dependencia_id(nombre, propiedad, unidad_asignada),
              usuarios_app:usuario_id(nombre, rol)
            `)
            .order('fecha_hora_ingreso', { ascending: false }),
          supabase
            .from('copropietarios')
            .select('id, nombre, propiedad, unidad_asignada')
        ]);
        if (resRegistros.error) throw resRegistros.error;
        if (resCopropietarios.error) throw resCopropietarios.error;
        setRegistros(resRegistros.data || []);
        setCopropietarios(resCopropietarios.data || []);
        setResultados(resRegistros.data || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Filtros dinámicos
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidadesFiltradas = filtros.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtros.propiedad).map(c => c.unidad_asignada))]
    : [];

  // Manejar cambios en filtros
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'propiedad' && { unidadAsignada: '' })
    }));
  };

  // Aplicar filtros
  const aplicarFiltros = (e) => {
    e.preventDefault();
    let filtrados = [...registros];
    if (filtros.fechaInicio) {
      filtrados = filtrados.filter(r =>
        dayjs(r.fecha_hora_ingreso).isAfter(dayjs(filtros.fechaInicio).startOf('day'))
      );
    }
    if (filtros.fechaFin) {
      filtrados = filtrados.filter(r =>
        dayjs(r.fecha_hora_ingreso).isBefore(dayjs(filtros.fechaFin).endOf('day'))
      );
    }
    if (filtros.placa) {
      filtrados = filtrados.filter(r =>
        r.placa_vehiculo.toLowerCase().includes(filtros.placa.toLowerCase())
      );
    }
    if (filtros.tipoVehiculo) {
      filtrados = filtrados.filter(r =>
        r.tipo_vehiculo === filtros.tipoVehiculo
      );
    }
    if (filtros.propiedad) {
      filtrados = filtrados.filter(r =>
        r.copropietarios?.propiedad === filtros.propiedad
      );
    }
    if (filtros.unidadAsignada) {
      filtrados = filtrados.filter(r =>
        r.copropietarios?.unidad_asignada === filtros.unidadAsignada
      );
    }
    setResultados(filtrados);
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      placa: '',
      propiedad: '',
      unidadAsignada: '',
      tipoVehiculo: ''
    });
    setResultados(registros);
  };

  // Manejar edición
  const abrirEdicion = (registro) => {
    setModal({ open: true, registro });
    setForm({
      placa_vehiculo: registro.placa_vehiculo,
      tipo_vehiculo: registro.tipo_vehiculo,
      fecha_hora_ingreso: dayjs(registro.fecha_hora_ingreso).format('YYYY-MM-DD'),
      dependencia_id: registro.dependencia_id,
      observaciones: registro.observaciones || '',
      monto: registro.monto,
      gratis: registro.gratis,
      recaudado: registro.recaudado,
      fecha_recaudo: registro.fecha_recaudo || ''
    });
  };

  // Guardar cambios
  const guardarCambios = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({
          ...form,
          monto: form.gratis ? 0 : (form.tipo_vehiculo === 'carro' ? 1.00 : 0.50),
          fecha_recaudo: form.recaudado ? form.fecha_recaudo : null
        })
        .eq('id', modal.registro.id);
      if (error) throw error;
      const actualizados = registros.map(r =>
        r.id === modal.registro.id ? { ...r, ...form } : r
      );
      setRegistros(actualizados);
      setResultados(actualizados);
      setModal({ open: false, registro: null });
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar registro
  const eliminarRegistro = async (id) => {
    if (!window.confirm('¿Eliminar registro permanentemente?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .delete()
        .eq('id', id);
      if (error) throw error;
      const actualizados = registros.filter(r => r.id !== id);
      setRegistros(actualizados);
      setResultados(actualizados);
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        <Emoji symbol="🔎" /> Consulta de Registros
      </h2>

      {/* Filtros */}
      <form onSubmit={aplicarFiltros} className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Fecha Inicio</label>
            <input
              type="date"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Fecha Fin</label>
            <input
              type="date"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Placa</label>
            <input
              type="text"
              name="placa"
              value={filtros.placa}
              onChange={handleChange}
              placeholder="Buscar por placa"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Propiedad</label>
            <select
              name="propiedad"
              value={filtros.propiedad}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Todas</option>
              {propiedades.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Unidad</label>
            <select
              name="unidadAsignada"
              value={filtros.unidadAsignada}
              onChange={handleChange}
              disabled={!filtros.propiedad}
              className="w-full p-2 border rounded"
            >
              <option value="">Todas</option>
              {unidadesFiltradas.map(unidad => (
                <option key={unidad} value={unidad}>{unidad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Tipo Vehículo</label>
            <select
              name="tipoVehiculo"
              value={filtros.tipoVehiculo}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Todos</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            <Emoji symbol="🔎" /> Buscar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </form>

      {/* Tabla de resultados */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr>
              <th className="px-2 py-2">Fecha/Hora</th>
              <th className="px-2 py-2">Placa</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Observaciones</th>
              <th className="px-2 py-2">Monto</th>
              <th className="px-2 py-2">Gratis</th>
              <th className="px-2 py-2">Recaudado</th>
              <th className="px-2 py-2">Fecha Recaudo</th>
              <th className="px-2 py-2">Copropietario</th>
              <th className="px-2 py-2">Registrado por</th>
              <th className="px-2 py-2">Foto</th>
              <th className="px-2 py-2">Audio</th>
              <th className="px-2 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resultados.length > 0 ? (
              resultados.map(reg => (
                <tr key={reg.id}>
                  <td className="px-2 py-1 text-center">
                    {reg.fecha_hora_ingreso
                      ? dayjs(reg.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm')
                      : ''}
                  </td>
                  <td className="px-2 py-1 text-center">{reg.placa_vehiculo}</td>
                  <td className="px-2 py-1 text-center">{reg.tipo_vehiculo}</td>
                  <td className="px-2 py-1">{reg.observaciones || '-'}</td>
                  <td className="px-2 py-1 text-center">${Number(reg.monto).toFixed(2)}</td>
                  <td className="px-2 py-1 text-center">
                    {reg.gratis ? <Emoji symbol="🆓" /> : <Emoji symbol="❌" />}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {reg.recaudado ? <Emoji symbol="🔗" /> : <Emoji symbol="⏳" />}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {reg.fecha_recaudo || '-'}
                  </td>
                  <td className="px-2 py-1">
                    {reg.copropietarios?.nombre || '-'}
                    <br />
                    <small>
                      {reg.copropietarios?.propiedad || ''} - {reg.copropietarios?.unidad_asignada || ''}
                    </small>
                  </td>
                  <td className="px-2 py-1 text-center">
                    {reg.usuarios_app?.nombre || '-'}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {reg.foto_url && (
                      <a href={reg.foto_url} target="_blank" rel="noopener noreferrer">
                        <img src={reg.foto_url} alt="Evidencia" className="thumbnail" />
                      </a>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {reg.observacion_audio_url ? (
                      <audio controls style={{ width: 90 }}>
                        <source src={reg.observacion_audio_url} type="audio/webm" />
                        Tu navegador no soporta audio.
                      </audio>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: 14 }}>-</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      className="edit-btn"
                      title="Editar"
                      onClick={() => abrirEdicion(reg)}
                      style={{ marginRight: 6 }}
                      disabled={!isOnline || saving}
                    >
                      <Emoji symbol="✏️" /> Editar
                    </button>
                    <button
                      className="delete-btn"
                      title="Eliminar"
                      onClick={() => eliminarRegistro(reg.id)}
                      disabled={!isOnline || deleting}
                    >
                      <Emoji symbol="🗑️" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="sin-resultados">
                  No se encontraron registros con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      {modal.open && (
        <Modal isOpen={modal.open} onClose={() => setModal({ open: false, registro: null })}>
          <h3 className="text-lg font-bold mb-4">Editar Registro</h3>
          <form onSubmit={guardarCambios} className="space-y-3">
            <label>
              Placa:
              <input
                name="placa_vehiculo"
                value={form.placa_vehiculo}
                onChange={e => setForm(f => ({ ...f, placa_vehiculo: e.target.value }))}
                required
                disabled={!isOnline}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Tipo:
              <select
                name="tipo_vehiculo"
                value={form.tipo_vehiculo}
                onChange={e => setForm(f => ({ ...f, tipo_vehiculo: e.target.value }))}
                required
                disabled={!isOnline}
                className="w-full p-2 border rounded"
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </label>
            <label>
              Fecha ingreso:
              <input
                type="date"
                name="fecha_hora_ingreso"
                value={form.fecha_hora_ingreso}
                onChange={e => setForm(f => ({ ...f, fecha_hora_ingreso: e.target.value }))}
                required
                disabled={!isOnline}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Observaciones:
              <input
                name="observaciones"
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                disabled={!isOnline}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Copropietario:
              <select
                name="dependencia_id"
                value={form.dependencia_id || ''}
                onChange={e => setForm(f => ({ ...f, dependencia_id: e.target.value }))}
                required
                disabled={!isOnline}
                className="w-full p-2 border rounded"
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
                checked={!!form.gratis}
                onChange={e => setForm(f => ({ ...f, gratis: e.target.checked }))}
                disabled={!isOnline}
              />
              <Emoji symbol="🆓" /> Gratis
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="recaudado"
                checked={!!form.recaudado}
                onChange={e => setForm(f => ({ ...f, recaudado: e.target.checked }))}
                disabled={!isOnline}
              />
              <Emoji symbol="🔗" /> Recaudado
            </label>
            {form.recaudado && (
              <label>
                Fecha Recaudo:
                <input
                  type="date"
                  name="fecha_recaudo"
                  value={form.fecha_recaudo || ''}
                  onChange={e => setForm(f => ({ ...f, fecha_recaudo: e.target.value }))}
                  required={!!form.recaudado}
                  disabled={!isOnline || !form.recaudado}
                  className="w-full p-2 border rounded"
                />
              </label>
            )}
            <div className="flex gap-4 mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                disabled={!isOnline || saving}
              >
                Guardar
              </button>
              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                onClick={() => setModal({ open: false, registro: null })}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Forced Colors Mode - Accesibilidad */}
      <style>
        {`
        @media (forced-colors: active) {
          .container, .bg-white, .rounded-lg, .shadow, table, th, td, input, select, button {
            background: Canvas !important;
            color: CanvasText !important;
            border-color: ButtonBorder !important;
            forced-color-adjust: none;
          }
          .edit-btn, .delete-btn {
            background: ButtonFace !important;
            color: ButtonText !important;
            border: 2px solid ButtonBorder !important;
            forced-color-adjust: none;
          }
          .edit-btn:focus, .delete-btn:focus {
            outline: 2px solid Highlight !important;
          }
          .thumbnail {
            border: 2px solid ButtonBorder !important;
            forced-color-adjust: none;
          }
        }
        `}
      </style>
    </div>
  );
}
