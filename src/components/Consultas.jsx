// src/components/Consultas.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Loader from './Loader'
import Emoji from './Emoji'
import ResumenRegistros from './ResumenRegistros'
import useOnlineStatus from '../hooks/useOnlineStatus'
import dayjs from 'dayjs'

export default function Consultas() {
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    placa: '',
    propiedad: '',
    unidadAsignada: '',
    tipoVehiculo: ''
  })
  const [todos, setTodos] = useState([])
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copropietarios, setCopropietarios] = useState([])
  const [editModal, setEditModal] = useState({ open: false, registro: null })
  const [editData, setEditData] = useState({})
  const isOnline = useOnlineStatus()

  useEffect(() => {
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada')
      if (!error) setCopropietarios(data)
    }
    fetchCopropietarios()
  }, [])

  useEffect(() => {
    const fetchTodos = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
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
            usuario:usuario_id!inner(id, nombre)
          `)
          .order('fecha_hora_ingreso', { ascending: false })
        if (error) throw error
        setTodos(data || [])
        setResultados(data || [])
      } catch (error) {
        setError(error.message)
        setTodos([])
        setResultados([])
      } finally {
        setLoading(false)
      }
    }
    fetchTodos()
  }, [])

  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort()
  const unidadesFiltradas = filtros.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtros.propiedad).map(c => c.unidad_asignada))]
    : []

  const copropietarioSeleccionado = copropietarios.find(
    c => c.propiedad === filtros.propiedad && c.unidad_asignada === filtros.unidadAsignada
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    let filtrados = [...todos]
    if (filtros.fechaInicio)
      filtrados = filtrados.filter(r => r.fecha_hora_ingreso >= `${filtros.fechaInicio}T00:00:00`)
    if (filtros.fechaFin)
      filtrados = filtrados.filter(r => r.fecha_hora_ingreso <= `${filtros.fechaFin}T23:59:59`)
    if (filtros.placa)
      filtrados = filtrados.filter(r => r.placa_vehiculo?.toLowerCase().includes(filtros.placa.toLowerCase()))
    if (filtros.tipoVehiculo)
      filtrados = filtrados.filter(r => r.tipo_vehiculo === filtros.tipoVehiculo)
    if (filtros.propiedad && !filtros.unidadAsignada) {
      filtrados = filtrados.filter(r => r.copropietarios?.propiedad === filtros.propiedad)
    }
    if (filtros.propiedad && filtros.unidadAsignada && copropietarioSeleccionado) {
      filtrados = filtrados.filter(r => r.dependencia_id === copropietarioSeleccionado.id)
    }
    setResultados(filtrados)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'propiedad' && { unidadAsignada: '' })
    }))
  }

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      placa: '',
      propiedad: '',
      unidadAsignada: '',
      tipoVehiculo: ''
    })
    setResultados(todos)
  }

  const handleEdit = (registro) => {
    setEditModal({ open: true, registro })
    setEditData({
      placa_vehiculo: registro.placa_vehiculo,
      tipo_vehiculo: registro.tipo_vehiculo,
      fecha_hora_ingreso: registro.fecha_hora_ingreso?.slice(0, 10) || '',
      gratis: !!registro.gratis,
      observaciones: registro.observaciones || '',
      dependencia_id: registro.dependencia_id,
      recaudado: !!registro.recaudado,
      fecha_recaudo: registro.fecha_recaudo || ''
    })
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'recaudado' && !checked ? { fecha_recaudo: '' } : {})
    }))
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    const id = editModal.registro.id
    const monto = editData.gratis ? 0 : (editData.tipo_vehiculo === 'carro' ? 1.00 : 0.50)
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({ ...editData, monto })
        .eq('id', id)
      if (error) throw error
      // Actualizar localmente
      const updated = todos.map(r => r.id === id ? { ...r, ...editData, monto } : r)
      setTodos(updated)
      setResultados(updated)
      setEditModal({ open: false, registro: null })
    } catch (error) {
      setError(error.message)
    }
  }

  const handleDelete = async (registro) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .delete()
        .eq('id', registro.id)
      if (error) throw error
      const updated = todos.filter(r => r.id !== registro.id)
      setTodos(updated)
      setResultados(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="consultas-container">
      <h2><Emoji symbol="🔎" label="Consultas" /> Consultas y Reportes</h2>
      <form onSubmit={handleSubmit} className="filtros-form">
        <div className="filtros-grid">
          <div className="filtro-item">
            <label>Fecha inicio:</label>
            <input
              type="date"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleChange}
            />
          </div>
          <div className="filtro-item">
            <label>Fecha fin:</label>
            <input
              type="date"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleChange}
            />
          </div>
          <div className="filtro-item">
            <label>Placa:</label>
            <input
              type="text"
              name="placa"
              placeholder="Buscar por placa"
              value={filtros.placa}
              onChange={handleChange}
            />
          </div>
          <div className="filtro-item">
            <label>Propiedad:</label>
            <select
              name="propiedad"
              value={filtros.propiedad}
              onChange={handleChange}
            >
              <option value="">Todas</option>
              {propiedades.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>
          <div className="filtro-item">
            <label>Unidad asignada:</label>
            <select
              name="unidadAsignada"
              value={filtros.unidadAsignada}
              onChange={handleChange}
              disabled={!filtros.propiedad}
            >
              <option value="">Todas</option>
              {unidadesFiltradas.map(unidad => (
                <option key={unidad} value={unidad}>{unidad}</option>
              ))}
            </select>
          </div>
          <div className="filtro-item">
            <label>Tipo vehículo:</label>
            <select
              name="tipoVehiculo"
              value={filtros.tipoVehiculo}
              onChange={handleChange}
            >
              <option value="">Todos</option>
              <option value="carro">Carro 🚗</option>
              <option value="moto">Moto 🏍️</option>
            </select>
          </div>
        </div>
        <div className="acciones-filtros">
          <button
            type="submit"
            disabled={loading}
            className="btn-buscar"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="btn-limpiar"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}
      {loading && <Loader text="Buscando registros..." />}

      {resultados.length > 0 && (
        <ResumenRegistros registros={resultados} titulo="Resumen de Consultas" />
      )}

      {resultados.length > 0 ? (
        <div
          className="resultados-table-container"
          style={{
            maxHeight: '500px',
            overflowY: 'auto',
            overflowX: 'auto',
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        >
          <table
            className="resultados-table"
            style={{ width: 'max-content', minWidth: '100%' }}
          >
            <thead>
              <tr>
                <th><Emoji symbol="📅" label="Fecha" /> Fecha</th>
                <th><Emoji symbol="🚗" label="Placa" /> Placa</th>
                <th><Emoji symbol="🏍️" label="Tipo" /> Tipo</th>
                <th><Emoji symbol="👥" label="Copropietario" /> Copropietario</th>
                <th><Emoji symbol="💵" label="Monto" /> Monto</th>
                <th><Emoji symbol="🟢" label="Estado" /> Estado</th>
                <th><Emoji symbol="📷" label="Foto" /> Foto</th>
                <th><Emoji symbol="👤" label="Registrado por" /> Registrado por</th>
                <th><Emoji symbol="⚙️" label="Acciones" /> Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map(reg => (
                <tr key={reg.id} className={reg.gratis ? 'registro-gratis' : ''}>
                  <td>
                    {reg.fecha_hora_ingreso
                      ? dayjs(reg.fecha_hora_ingreso).format('DD/MM/YYYY')
                      : ''}
                  </td>
                  <td>{reg.placa_vehiculo}</td>
                  <td>
                    {reg.tipo_vehiculo?.toLowerCase() === 'carro' && <Emoji symbol="🚗" />}
                    {reg.tipo_vehiculo?.toLowerCase() === 'moto' && <Emoji symbol="🏍️" />}
                    <span style={{ marginLeft: 6 }}>{reg.tipo_vehiculo?.toUpperCase()}</span>
                  </td>
                  <td>
                    {reg.copropietarios?.nombre || '-'}
                    <br />
                    <small>
                      {reg.copropietarios?.propiedad || 'Sin propiedad'} - {reg.copropietarios?.unidad_asignada || 'Sin unidad'}
                    </small>
                  </td>
                  <td>${Number(reg.monto).toFixed(2)}</td>
                  <td>
                    {reg.gratis ? <Emoji symbol="🆓" label="Gratis" />
                      : reg.recaudado ? <Emoji symbol="🔗" label="Recaudado" />
                      : <Emoji symbol="⏳" label="Pendiente" />}
                  </td>
                  <td>
                    {reg.foto_url && (
                      <a href={reg.foto_url} target="_blank" rel="noopener noreferrer">
                        <img src={reg.foto_url} alt="Evidencia" className="thumbnail" />
                      </a>
                    )}
                  </td>
                  <td>{reg.usuario?.nombre || '-'}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(reg)}
                      title="Editar"
                      disabled={!isOnline}
                    >
                      <Emoji symbol="✏️" label="Editar" />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(reg)}
                      title="Eliminar"
                    >
                      <Emoji symbol="🗑️" label="Eliminar" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && <div className="sin-resultados">No se encontraron resultados</div>
      )}

      {editModal.open && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3><Emoji symbol="✏️" /> Editar Registro</h3>
            <form onSubmit={handleEditSave}>
              <label>
                Placa:
                <input
                  name="placa_vehiculo"
                  value={editData.placa_vehiculo}
                  onChange={handleEditChange}
                  required
                  disabled={!isOnline}
                />
              </label>
              <label>
                Tipo:
                <select
                  name="tipo_vehiculo"
                  value={editData.tipo_vehiculo}
                  onChange={handleEditChange}
                  required
                  disabled={!isOnline}
                >
                  <option value="carro">Carro 🚗</option>
                  <option value="moto">Moto 🏍️</option>
                </select>
              </label>
              <label>
                Fecha ingreso:
                <input
                  type="date"
                  name="fecha_hora_ingreso"
                  value={editData.fecha_hora_ingreso}
                  onChange={handleEditChange}
                  required
                  disabled={!isOnline}
                />
              </label>
              <label>
                Observaciones:
                <input
                  name="observaciones"
                  value={editData.observaciones}
                  onChange={handleEditChange}
                  disabled={!isOnline}
                />
              </label>
              <label>
                Copropietario:
                <select
                  name="dependencia_id"
                  value={editData.dependencia_id || ''}
                  onChange={handleEditChange}
                  required
                  disabled={!isOnline}
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
                  checked={!!editData.gratis}
                  onChange={handleEditChange}
                  disabled={!isOnline}
                />
                <Emoji symbol="🆓" label="Gratis" /> Gratis
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="recaudado"
                  checked={!!editData.recaudado}
                  onChange={handleEditChange}
                  disabled={!isOnline}
                />
                <Emoji symbol="🔗" label="Recaudado" /> Recaudado
              </label>
              {editData.recaudado && (
                <label>
                  Fecha Recaudo:
                  <input
                    type="date"
                    name="fecha_recaudo"
                    value={editData.fecha_recaudo || ''}
                    onChange={handleEditChange}
                    required={!!editData.recaudado}
                    disabled={!isOnline || !editData.recaudado}
                  />
                </label>
              )}
              <div className="acciones-modal">
                <button type="submit" className="save-btn" disabled={!isOnline}>
                  Guardar
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditModal({ open: false, registro: null })}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
