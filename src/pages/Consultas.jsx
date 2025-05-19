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
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Limpiar Filtros
          </button>
        </div>
      </form>

      {/* Tabla de resultados */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Fecha/Hora</th>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Copropietario</th>
              <th className="px-4 py-3">Propiedad</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Gratis</th>
              <th className="px-4 py-3">Recaudado</th>
              <th className="px-4 py-3">Fecha Recaudo</th>
              <th className="px-4 py-3">Registrado por</th>
              <th className="px-4 py-3">Rol usuario</th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Audio</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {resultados.map(registro => (
              <tr key={registro.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{registro.id}</td>
                <td className="px-4 py-3">{registro.fecha_hora_ingreso ? dayjs(registro.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm') : ''}</td>
                <td className="px-4 py-3">{registro.placa_vehiculo}</td>
                <td className="px-4 py-3">
                  <Emoji symbol={registro.tipo_vehiculo === 'carro' ? '🚗' : '🏍️'} />
                  {registro.tipo_vehiculo}
                </td>
                <td className="px-4 py-3">{registro.copropietarios?.nombre || '-'}</td>
                <td className="px-4 py-3">{registro.copropietarios?.propiedad || '-'}</td>
                <td className="px-4 py-3">{registro.copropietarios?.unidad_asignada || '-'}</td>
                <td className="px-4 py-3">{registro.observaciones || '-'}</td>
                <td className="px-4 py-3">${Number(registro.monto).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {registro.gratis ? <Emoji symbol="🆓" /> : <Emoji symbol="❌" />}
                </td>
                <td className="px-4 py-3">
                  {registro.recaudado ? <Emoji symbol="🔗" /> : <Emoji symbol="⏳" />}
                </td>
                <td className="px-4 py-3">{registro.fecha_recaudo || '-'}</td>
                <td className="px-4 py-3">{registro.usuarios_app?.nombre || '-'}</td>
                <td className="px-4 py-3">{registro.usuarios_app?.rol || '-'}</td>
                <td className="px-4 py-3">
                  {registro.foto_url && (
                    <a href={registro.foto_url} target="_blank" rel="noopener noreferrer">
                      <img src={registro.foto_url} alt="Evidencia" className="thumbnail" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  {registro.observacion_audio_url ? (
                    <audio controls style={{ width: 90 }}>
                      <source src={registro.observacion_audio_url} type="audio/webm" />
                      Tu navegador no soporta audio.
                    </audio>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: 14 }}>-</span>
                  )}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => abrirEdicion(registro)}
                    className="text-blue-600 hover:text-blue-800"
                    disabled={!isOnline}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarRegistro(registro.id)}
                    className="text-red-600 hover:text-red-800"
                    disabled={!isOnline}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })}>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Editar Registro</h3>
          <form onSubmit={guardarCambios} className="space-y-4">
            <div>
              <label>Placa:</label>
              <input
                value={form.placa_vehiculo}
                onChange={e => setForm({ ...form, placa_vehiculo: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label>Tipo:</label>
              <select
                value={form.tipo_vehiculo}
                onChange={e => setForm({ ...form, tipo_vehiculo: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </div>
            <div>
              <label>Fecha:</label>
              <input
                type="date"
                value={form.fecha_hora_ingreso}
                onChange={e => setForm({ ...form, fecha_hora_ingreso: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label>Copropietario:</label>
              <select
                value={form.dependencia_id}
                onChange={e => setForm({ ...form, dependencia_id: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccionar...</option>
                {copropietarios.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.propiedad} - {c.unidad_asignada})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal({ open: false })}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
