// src/components/ResumenRecaudo.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Loader from '../components/Loader'
import Emoji from '../components/Emoji'

export default function ResumenRecaudo({ refreshKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [montoRecaudar, setMontoRecaudar] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [filtroPropiedad, setFiltroPropiedad] = useState('')
  const [filtroUnidad, setFiltroUnidad] = useState('')
  const [filtroCopropietario, setFiltroCopropietario] = useState('')
  const [editModal, setEditModal] = useState({ open: false, registro: null })
  const [editData, setEditData] = useState({})
  const [propiedades, setPropiedades] = useState([])
  const [unidades, setUnidades] = useState([])

  useEffect(() => {
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('propiedad, unidad_asignada')
      if (!error) {
        const props = [...new Set(data.map(d => d.propiedad))].sort()
        setPropiedades(props)
        setUnidades(data)
      }
    }
    fetchCopropietarios()
  }, [])

  const unidadesFiltradas = filtroPropiedad
    ? [...new Set(unidades.filter(u => u.propiedad === filtroPropiedad).map(u => u.unidad_asignada))]
    : []

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('registros_parqueadero')
        .select(`
          *,
          copropietarios:dependencia_id(nombre, propiedad, unidad_asignada)
        `)
        .order('fecha_hora_ingreso', { ascending: false })

      if (error) throw error
      setRegistros(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [refreshKey])

  const handleRecaudoAutomatico = async () => {
    if (!filtroPropiedad || !filtroUnidad) {
      alert('Debe seleccionar propiedad y unidad asignada')
      return
    }

    const montoObjetivo = parseFloat(montoRecaudar)
    if (isNaN(montoObjetivo) || montoObjetivo <= 0) {
      alert('Ingrese un monto válido')
      return
    }

    setProcesando(true)
    try {
      const { data: registrosParaRecaudar, error } = await supabase
        .from('registros_parqueadero')
        .select(`
          *,
          copropietarios:dependencia_id(propiedad, unidad_asignada)
        `)
        .eq('copropietarios.propiedad', filtroPropiedad)
        .eq('copropietarios.unidad_asignada', filtroUnidad)
        .eq('recaudado', false)
        .eq('gratis', false)
        .order('fecha_hora_ingreso', { ascending: true })

      if (error) throw error
      if (!registrosParaRecaudar?.length) {
        alert('No hay registros pendientes para esta propiedad/unidad')
        return
      }

      let montoAcumulado = 0
      const registrosAMarcar = registrosParaRecaudar
        .filter(reg => {
          if (montoAcumulado >= montoObjetivo) return false
          montoAcumulado += Number(reg.monto)
          return true
        })
        .map(reg => reg.id)

      const { error: updateError } = await supabase
        .from('registros_parqueadero')
        .update({
          recaudado: true,
          fecha_recaudo: new Date().toISOString().slice(0, 10)
        })
        .in('id', registrosAMarcar)

      if (updateError) throw updateError

      alert(`Recaudado $${montoAcumulado.toFixed(2)} en ${registrosAMarcar.length} registros`)
      fetchData()
      setMontoRecaudar('')
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  const registrosFiltrados = registros.filter(reg => {
    const coincidePropiedad = !filtroPropiedad || (reg.copropietarios?.propiedad || '') === filtroPropiedad
    const coincideUnidad = !filtroUnidad || (reg.copropietarios?.unidad_asignada || '') === filtroUnidad
    const coincideCopropietario = !filtroCopropietario || (reg.copropietarios?.nombre || '').toLowerCase().includes(filtroCopropietario.toLowerCase())
    return coincidePropiedad && coincideUnidad && coincideCopropietario
  })

  const resumen = registrosFiltrados.reduce((acc, reg) => {
    if (reg.gratis) acc.gratis++
    else if (reg.recaudado) acc.recaudado += Number(reg.monto)
    else acc.pendiente += Number(reg.monto)
    return acc
  }, { recaudado: 0, pendiente: 0, gratis: 0 })

  const handleEditSave = async () => {
    const id = editModal.registro.id
    const monto = editData.gratis ? 0 : (editData.tipo_vehiculo === 'carro' ? 1.00 : 0.50)

    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({ ...editData, monto })
        .eq('id', id)

      if (error) throw error
      fetchData()
      setEditModal({ open: false, registro: null })
    } catch (error) {
      alert(error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que desea eliminar este registro?')) return
    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="resumen-container">
      <h2><Emoji symbol="📊" label="Resumen" /> Resumen de Recaudación</h2>

      <div className="resumen-visual">
        <div className="resumen-item recaudado">
          <Emoji symbol="💰" /> ${resumen.recaudado.toFixed(2)}
          <span>Recaudado</span>
        </div>
        <div className="resumen-item pendiente">
          <Emoji symbol="⏳" /> ${resumen.pendiente.toFixed(2)}
          <span>Pendiente</span>
        </div>
        <div className="resumen-item gratis">
          <Emoji symbol="🆓" /> {resumen.gratis}
          <span>Gratis</span>
        </div>
      </div>

      <section className="recaudo-automatico">
        <h3><Emoji symbol="⚡" /> Recaudo Automático</h3>
        <div className="filtros-recaudo">
          <div className="filtro-group">
            <label><Emoji symbol="🏠" /> Propiedad:</label>
            <select
              value={filtroPropiedad}
              onChange={e => {
                setFiltroPropiedad(e.target.value)
                setFiltroUnidad('')
              }}
            >
              <option value="">Seleccione propiedad</option>
              {propiedades.map(prop => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>

          <div className="filtro-group">
            <label><Emoji symbol="🔢" /> Unidad:</label>
            <select
              value={filtroUnidad}
              onChange={e => setFiltroUnidad(e.target.value)}
              disabled={!filtroPropiedad}
            >
              <option value="">Seleccione unidad</option>
              {unidadesFiltradas.map(unidad => (
                <option key={unidad} value={unidad}>{unidad}</option>
              ))}
            </select>
          </div>

          <div className="filtro-group">
            <label><Emoji symbol="💵" /> Monto objetivo:</label>
            <input
              type="number"
              step="0.01"
              value={montoRecaudar}
              onChange={e => setMontoRecaudar(e.target.value)}
              placeholder="Ej: 50.00"
            />
          </div>

          <button
            className="btn-recaudo"
            onClick={handleRecaudoAutomatico}
            disabled={procesando || !filtroPropiedad || !filtroUnidad}
          >
            {procesando ? 'Procesando...' : 'Ejecutar Recaudo'}
          </button>
        </div>
      </section>

      <div className="filtros-avanzados">
        <div className="filtro-group">
          <label><Emoji symbol="👥" /> Copropietario:</label>
          <input
            type="text"
            value={filtroCopropietario}
            onChange={e => setFiltroCopropietario(e.target.value)}
            placeholder="Filtrar por nombre"
          />
        </div>
      </div>

      <div className="detalle-recaudo">
        <h3><Emoji symbol="📋" /> Detalle de Registros</h3>
        <div className="tabla-detalle">
          <table>
            <thead>
              <tr>
                <th><Emoji symbol="🚗" /> Placa</th>
                <th><Emoji symbol="🛵" /> Tipo</th>
                <th><Emoji symbol="💵" /> Monto</th>
                <th><Emoji symbol="👥" /> Copropietario</th>
                <th><Emoji symbol="📅" /> Fecha Recaudo</th>
                <th><Emoji symbol="⚙️" /> Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map(reg => (
                <tr key={reg.id} className={reg.recaudado ? 'recaudado' : 'pendiente'}>
                  <td>{reg.placa_vehiculo}</td>
                  <td>{reg.tipo_vehiculo}</td>
                  <td>${reg.monto.toFixed(2)}</td>
                  <td>{reg.copropietarios?.nombre || '-'}</td>
                  <td>{reg.fecha_recaudo || '-'}</td>
                  <td>
                    <button onClick={() => {
                      setEditModal({ open: true, registro: reg })
                      setEditData({
                        placa_vehiculo: reg.placa_vehiculo,
                        tipo_vehiculo: reg.tipo_vehiculo,
                        fecha_hora_ingreso: reg.fecha_hora_ingreso?.slice(0, 10) || '',
                        gratis: reg.gratis
                      })
                    }}>
                      <Emoji symbol="✏️" />
                    </button>
                    <button onClick={() => handleDelete(reg.id)}>
                      <Emoji symbol="🗑️" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editModal.open && (
        <div className="modal-edicion">
          <h3>Editar Registro</h3>
          <form onSubmit={e => { e.preventDefault(); handleEditSave() }}>
            <label>
              Placa:
              <input
                value={editData.placa_vehiculo}
                onChange={e => setEditData({ ...editData, placa_vehiculo: e.target.value })}
                required
              />
            </label>

            <label>
              Tipo:
              <select
                value={editData.tipo_vehiculo}
                onChange={e => setEditData({ ...editData, tipo_vehiculo: e.target.value })}
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </label>

            <label>
              Fecha ingreso:
              <input
                type="date"
                value={editData.fecha_hora_ingreso}
                onChange={e => setEditData({ ...editData, fecha_hora_ingreso: e.target.value })}
              />
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={editData.gratis}
                onChange={e => setEditData({ ...editData, gratis: e.target.checked })}
              />
              <Emoji symbol="🆓" /> Gratis
            </label>

            <div className="acciones-modal">
              <button type="submit">Guardar</button>
              <button type="button" onClick={() => setEditModal({ open: false, registro: null })}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <Loader text="Cargando datos..." />}
      {error && <div className="error-message">{error}</div>}
    </div>
  )
}
