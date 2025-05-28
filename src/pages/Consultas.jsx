// src/pages/Consultas.jsx
import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import ListaRegistros from '../components/ListaRegistros';
import ResumenRegistros from '../components/ResumenRegistros';
import ExportarPDF from '../components/ExportarPDF';
import Modal from '../components/Modal';
import Emoji from '../components/Emoji';
import dayjs from 'dayjs';

export default function Consultas() {
  const [registros, setRegistros] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    placa: '',
    tipoVehiculo: '',
    propiedad: '',
    unidadAsignada: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [formEdicion, setFormEdicion] = useState({});
  const [copropietarios, setCopropietarios] = useState([]);

  // Columnas para exportar a PDF
  const columnasPDF = [
    { header: 'Fecha/Hora', key: 'fecha_hora_ingreso', formatter: v => v ? new Date(v).toLocaleString() : '' },
    { header: 'Placa', key: 'placa_vehiculo' },
    { header: 'Tipo', key: 'tipo_vehiculo' },
    { header: 'Observaciones', key: 'observaciones' },
    { header: 'Gratis', key: 'gratis', formatter: v => v ? 'Sí' : 'No' },
    { header: 'Recaudado', key: 'recaudado', formatter: v => v ? 'Sí' : 'No' }
  ];

  // Cargar registros y copropietarios al montar
  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase
        .from('registros_parqueadero')
        .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada), usuarios_app(nombre)')
        .order('fecha_hora_ingreso', { ascending: false }),
      supabase
        .from('copropietarios')
        .select('id, propiedad, unidad_asignada')
    ]).then(([registrosRes, copropietariosRes]) => {
      if (registrosRes.error) setError('Error al cargar registros');
      else setRegistros(registrosRes.data || []);
      if (copropietariosRes.data) setCopropietarios(copropietariosRes.data);
      setLoading(false);
    });
  }, []);

  // Filtros controlados
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Opciones únicas para filtros
  const tiposUnicos = Array.from(new Set(registros.map(r => r.tipo_vehiculo))).filter(Boolean);
  const propiedadesUnicas = Array.from(new Set(registros.map(r => r.copropietarios?.propiedad))).filter(Boolean);
  const unidadesUnicas = Array.from(new Set(registros.map(r => r.copropietarios?.unidad_asignada))).filter(Boolean);

  // --- Eliminar registro ---
  const handleEliminar = async (registro) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el registro de la placa ${registro.placa_vehiculo}?`)) return;
    setLoading(true);
    const { error } = await supabase
      .from('registros_parqueadero')
      .delete()
      .eq('id', registro.id);
    setLoading(false);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setRegistros(prev => prev.filter(r => r.id !== registro.id));
    }
  };

  // --- Editar registro ---
  const handleEditar = (registro) => {
    setRegistroEditar(registro);
    setFormEdicion({
      placa_vehiculo: registro.placa_vehiculo || '',
      tipo_vehiculo: registro.tipo_vehiculo || 'carro',
      observaciones: registro.observaciones || '',
      dependencia_id: registro.dependencia_id || '',
      gratis: registro.gratis || false,
      recaudado: registro.recaudado || false,
    });
  };

  // --- Guardar edición ---
  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setEditando(true);
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({
          placa_vehiculo: formEdicion.placa_vehiculo.toUpperCase(),
          tipo_vehiculo: formEdicion.tipo_vehiculo,
          observaciones: formEdicion.observaciones,
          dependencia_id: formEdicion.dependencia_id || null,
          gratis: formEdicion.gratis,
          recaudado: formEdicion.recaudado,
        })
        .eq('id', registroEditar.id);
      if (error) throw error;
      setRegistros(prev =>
        prev.map(r =>
          r.id === registroEditar.id
            ? { ...r, ...formEdicion, placa_vehiculo: formEdicion.placa_vehiculo.toUpperCase() }
            : r
        )
      );
      setRegistroEditar(null);
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    } finally {
      setEditando(false);
    }
  };

  // --- Cancelar edición ---
  const handleCancelarEdicion = () => {
    setRegistroEditar(null);
    setFormEdicion({});
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Emoji symbol="📊" /> Consultas y Reportes
      </h2>

      {/* Filtros avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Fecha inicio</label>
          <input
            type="date"
            name="fechaInicio"
            value={filtros.fechaInicio}
            onChange={handleFiltroChange}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fecha fin</label>
          <input
            type="date"
            name="fechaFin"
            value={filtros.fechaFin}
            onChange={handleFiltroChange}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Placa</label>
          <input
            type="text"
            name="placa"
            value={filtros.placa}
            onChange={handleFiltroChange}
            placeholder="Buscar por placa"
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de vehículo</label>
          <select
            name="tipoVehiculo"
            value={filtros.tipoVehiculo}
            onChange={handleFiltroChange}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Todos</option>
            {tiposUnicos.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Propiedad</label>
          <select
            name="propiedad"
            value={filtros.propiedad}
            onChange={handleFiltroChange}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Todas</option>
            {propiedadesUnicas.map(prop => (
              <option key={prop} value={prop}>{prop}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidad asignada</label>
          <select
            name="unidadAsignada"
            value={filtros.unidadAsignada}
            onChange={handleFiltroChange}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Todas</option>
            {unidadesUnicas.map(unidad => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen estadístico */}
      <ResumenRegistros registros={registrosFiltrados} />

      {/* Exportar a PDF */}
      <div className="my-4 flex justify-end">
        <ExportarPDF
          datos={registrosFiltrados}
          columnas={columnasPDF}
          titulo="Reporte de Registros de Parqueadero"
        />
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-2">
        <ListaRegistros
          registros={registros}
          filtros={filtros}
          loading={loading}
          error={error}
          onRegistrosFiltradosChange={setRegistrosFiltrados}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
        />
      </div>

      {/* Modal de edición */}
      {registroEditar && (
        <Modal isOpen={true} onClose={handleCancelarEdicion}>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Emoji symbol="✏️" /> Editar Registro
            </h3>
            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Placa del vehículo
                </label>
                <input
                  type="text"
                  value={formEdicion.placa_vehiculo}
                  onChange={e => setFormEdicion(prev => ({
                    ...prev,
                    placa_vehiculo: e.target.value.toUpperCase()
                  }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="ABC123"
                  required
                  disabled={editando}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de vehículo
                </label>
                <select
                  value={formEdicion.tipo_vehiculo}
                  onChange={e => setFormEdicion(prev => ({
                    ...prev,
                    tipo_vehiculo: e.target.value
                  }))}
                  className="w-full p-2 border rounded-md"
                  disabled={editando}
                >
                  <option value="carro">🚙 Carro</option>
                  <option value="moto">🛵 Moto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Copropietario (opcional)
                </label>
                <select
                  value={formEdicion.dependencia_id}
                  onChange={e => setFormEdicion(prev => ({
                    ...prev,
                    dependencia_id: e.target.value
                  }))}
                  className="w-full p-2 border rounded-md"
                  disabled={editando}
                >
                  <option value="">Sin asignar</option>
                  {copropietarios.map(cp => (
                    <option key={cp.id} value={cp.id}>
                      {cp.propiedad} - {cp.unidad_asignada}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formEdicion.observaciones}
                  onChange={e => setFormEdicion(prev => ({
                    ...prev,
                    observaciones: e.target.value
                  }))}
                  className="w-full p-2 border rounded-md h-20"
                  placeholder="Observaciones adicionales..."
                  disabled={editando}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formEdicion.gratis}
                    onChange={e => setFormEdicion(prev => ({
                      ...prev,
                      gratis: e.target.checked
                    }))}
                    disabled={editando}
                  />
                  <span className="ml-2">🆓 Gratis</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formEdicion.recaudado}
                    onChange={e => setFormEdicion(prev => ({
                      ...prev,
                      recaudado: e.target.checked
                    }))}
                    disabled={editando || formEdicion.gratis}
                  />
                  <span className="ml-2">💰 Recaudado</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={editando}
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  {editando ? (
                    <Loader text="Guardando..." />
                  ) : (
                    <>
                      <Emoji symbol="💾" /> Guardar Cambios
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarEdicion}
                  disabled={editando}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  <Emoji symbol="❌" /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
