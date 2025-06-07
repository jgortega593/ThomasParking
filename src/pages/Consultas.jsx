// src/pages/Consultas.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';
import dayjs from 'dayjs';
import ExportarPDF from '../components/ExportarPDF';
import ListaRegistros from '../components/ListaRegistros';
import SemaforoResumen from '../components/SemaforoResumen';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';

export default function Consultas() {
  const { user } = useUser();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    placa: '',
    tipoVehiculo: '',
    propiedad: '',
    unidadAsignada: ''
  });
  const [copropietarios, setCopropietarios] = useState([]);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Columnas para PDF
  const columnasPDF = [
    { header: 'Fecha', key: 'fecha_hora_ingreso', formatter: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { header: 'Placa', key: 'placa_vehiculo' },
    { header: 'Tipo', key: 'tipo_vehiculo' },
    { header: 'Monto', key: 'monto', formatter: v => `$${Number(v).toFixed(2)}` },
    { header: 'Estado', key: 'recaudado', formatter: v => v ? 'Recaudado' : 'Pendiente' }
  ];

  // Cargar registros y copropietarios
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const { data: regs, error: errRegs } = await supabase
          .from('registros_parqueadero')
          .select('*, copropietarios:dependencia_id(propiedad, unidad_asignada), usuarios_app(nombre)')
          .order('fecha_hora_ingreso', { ascending: false });
        if (errRegs) throw errRegs;
        setRegistros(regs);

        const { data: copros, error: errCopros } = await supabase
          .from('copropietarios')
          .select('propiedad, unidad_asignada, id');
        if (errCopros) throw errCopros;
        setCopropietarios(copros);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // Lógica de editar registro
  const handleEditarRegistro = (registro) => setModalEditar(registro);

  const handleGuardarEdicion = async (registroEditado) => {
    setProcesando(true);
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({
          placa_vehiculo: registroEditado.placa_vehiculo,
          tipo_vehiculo: registroEditado.tipo_vehiculo,
          observaciones: registroEditado.observaciones,
          monto: parseFloat(registroEditado.monto),
          recaudado: !!registroEditado.recaudado,
          gratis: !!registroEditado.gratis,
          fecha_hora_ingreso: registroEditado.fecha_hora_ingreso,
          dependencia_id: registroEditado.dependencia_id
        })
        .eq('id', registroEditado.id);

      if (error) throw error;
      setRegistros(prev =>
        prev.map(r =>
          r.id === registroEditado.id
            ? {
                ...r,
                ...registroEditado,
                copropietarios: copropietarios.find(c => c.id === registroEditado.dependencia_id)
              }
            : r
        )
      );
      setModalEditar(null);
    } catch (error) {
      alert('Error al guardar cambios: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Lógica de eliminar registro
  const handleEliminarRegistro = (registro) => setModalEliminar(registro);

  const handleConfirmarEliminar = async () => {
    if (!modalEliminar) return;
    setProcesando(true);
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .delete()
        .eq('id', modalEliminar.id);
      if (error) throw error;
      setRegistros(registros => registros.filter(r => r.id !== modalEliminar.id));
      setModalEliminar(null);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  // Opciones únicas para selects
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidades = filtros.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtros.propiedad).map(c => c.unidad_asignada))]
    : [];

  if (loading) return <Loader text="Cargando registros..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span role="img" aria-label="lupa">🔍</span>
          Consulta de Registros
        </h1>
        <ExportarPDF
          datos={registros}
          columnas={columnasPDF}
          titulo="Reporte de Parqueo"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={e => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Fin</label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={e => setFiltros({ ...filtros, fechaFin: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placa</label>
            <input
              type="text"
              placeholder="Buscar por placa..."
              value={filtros.placa}
              onChange={e => setFiltros({ ...filtros, placa: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo Vehículo</label>
            <select
              value={filtros.tipoVehiculo}
              onChange={e => setFiltros({ ...filtros, tipoVehiculo: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todos</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Propiedad</label>
            <select
              value={filtros.propiedad}
              onChange={e => setFiltros({ ...filtros, propiedad: e.target.value, unidadAsignada: '' })}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todas</option>
              {propiedades.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidad</label>
            <select
              value={filtros.unidadAsignada}
              onChange={e => setFiltros({ ...filtros, unidadAsignada: e.target.value })}
              className="w-full p-2 border rounded-md"
              disabled={!filtros.propiedad}
            >
              <option value="">Todas</option>
              {unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Semáforo resumen */}
      <div className="mb-6">
        <SemaforoResumen registros={registros} />
      </div>

      {/* Tabla de registros */}
      <ListaRegistros
        registros={registros}
        filtros={filtros}
        onEditar={handleEditarRegistro}
        onEliminar={handleEliminarRegistro}
      />

      {/* Modal de edición */}
      {modalEditar && (
        <Modal isOpen={!!modalEditar} onClose={() => setModalEditar(null)}>
          <FormularioEdicionRegistro
            registro={modalEditar}
            copropietarios={copropietarios}
            onGuardar={handleGuardarEdicion}
            onCancelar={() => setModalEditar(null)}
            procesando={procesando}
          />
        </Modal>
      )}

      {/* Modal de confirmación de eliminación */}
      {modalEliminar && (
        <Modal isOpen={!!modalEliminar} onClose={() => setModalEliminar(null)}>
          <div>
            <h3 className="text-xl font-bold mb-4">Eliminar Registro</h3>
            <p>¿Estás seguro de que deseas eliminar el registro de <b>{modalEliminar.placa_vehiculo}</b> del <b>{dayjs(modalEliminar.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm')}</b>?</p>
            <div className="flex gap-4 justify-end mt-6">
              <button onClick={() => setModalEliminar(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded">Cancelar</button>
              <button
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 bg-red-600 text-white rounded"
                disabled={procesando}
              >
                {procesando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Formulario de edición de TODOS los campos principales
function FormularioEdicionRegistro({ registro, copropietarios, onGuardar, onCancelar, procesando }) {
  const [editado, setEditado] = useState(() => ({
    ...registro,
    fecha_hora_ingreso: registro.fecha_hora_ingreso
      ? dayjs(registro.fecha_hora_ingreso).format('YYYY-MM-DDTHH:mm')
      : '',
    dependencia_id: registro.dependencia_id || registro.copropietarios?.id || ''
  }));

  // Opciones de propiedad y unidad
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort();
  const unidades = editado.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === editado.propiedad).map(c => c.unidad_asignada))]
    : [];

  useEffect(() => {
    // Si cambia propiedad, limpiar unidad y dependencia_id
    setEditado(prev => ({
      ...prev,
      unidad_asignada: '',
      dependencia_id: ''
    }));
    // eslint-disable-next-line
  }, [editado.propiedad]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'propiedad') {
      setEditado(prev => ({
        ...prev,
        propiedad: value,
        unidad_asignada: '',
        dependencia_id: ''
      }));
    } else if (name === 'unidad_asignada') {
      const dep = copropietarios.find(
        c => c.propiedad === editado.propiedad && c.unidad_asignada === value
      );
      setEditado(prev => ({
        ...prev,
        unidad_asignada: value,
        dependencia_id: dep?.id || ''
      }));
    } else if (type === 'checkbox') {
      setEditado(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditado(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    onGuardar({
      ...editado,
      fecha_hora_ingreso: new Date(editado.fecha_hora_ingreso).toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-xl font-bold mb-4">Editar Registro</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Placa</label>
          <input
            type="text"
            name="placa_vehiculo"
            value={editado.placa_vehiculo}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo Vehículo</label>
          <select
            name="tipo_vehiculo"
            value={editado.tipo_vehiculo}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fecha/Hora Ingreso</label>
          <input
            type="datetime-local"
            name="fecha_hora_ingreso"
            value={editado.fecha_hora_ingreso}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monto</label>
          <input
            type="number"
            step="0.01"
            name="monto"
            value={editado.monto}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Propiedad</label>
          <select
            name="propiedad"
            value={editado.propiedad || registro.copropietarios?.propiedad || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Seleccionar...</option>
            {propiedades.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidad Asignada</label>
          <select
            name="unidad_asignada"
            value={editado.unidad_asignada || registro.copropietarios?.unidad_asignada || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            disabled={!editado.propiedad}
          >
            <option value="">Seleccionar...</option>
            {unidades.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="recaudado"
              checked={!!editado.recaudado}
              onChange={handleChange}
            />
            Recaudado
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="gratis"
              checked={!!editado.gratis}
              onChange={handleChange}
            />
            Gratis
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea
            name="observaciones"
            value={editado.observaciones || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            rows="2"
          />
        </div>
      </div>
      <div className="flex gap-4 justify-end mt-6">
        <button type="button" onClick={onCancelar} className="px-4 py-2 bg-gray-300 text-gray-800 rounded">Cancelar</button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={procesando}
        >
          {procesando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
