// src/components/ListaRegistros.jsx
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import supabase from '../supabaseClient'
import Loader from './Loader'
import Emoji from './Emoji'
import dayjs from 'dayjs'
import useOnlineStatus from '../hooks/useOnlineStatus'

export default function ListaRegistros({ refreshKey, onRegistrosFiltradosChange }) {
  const location = useLocation()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copropietarios, setCopropietarios] = useState([])
  const [filtros, setFiltros] = useState({ propiedad: '', unidadAsignada: '' })
  const [editModal, setEditModal] = useState({ open: false, registro: null })
  const [editData, setEditData] = useState({})
  const [eliminandoAudio, setEliminandoAudio] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isOnline = useOnlineStatus()

  // Cargar copropietarios
  useEffect(() => {
    let isMounted = true
    const fetchCopropietarios = async () => {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('id, nombre, propiedad, unidad_asignada')
      if (!error && isMounted) setCopropietarios(data)
    }
    fetchCopropietarios()
    return () => { isMounted = false }
  }, [])

  // Cargar registros (se recarga con refreshKey, estado online, y cambio de ruta)
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    const fetchRegistros = async () => {
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('registros_parqueadero')
            .select(`
              id,
              placa_vehiculo,
              tipo_vehiculo,
              fecha_hora_ingreso,
              observaciones,
              foto_url,
              monto,
              gratis,
              recaudado,
              fecha_recaudo,
              dependencia_id,
              observacion_audio_url,
              copropietarios:dependencia_id(nombre, propiedad, unidad_asignada),
              usuario:usuario_id!inner(id, nombre)
            `)
            .order('fecha_hora_ingreso', { ascending: false })
          if (error) throw error
          if (isMounted) {
            setRegistros(data)
            localStorage.setItem('registros_offline', JSON.stringify(data || []))
          }
        } else {
          const localData = JSON.parse(localStorage.getItem('registros_offline') || '[]')
          if (isMounted) setRegistros(localData)
        }
      } catch (error) {
        if (isMounted) setError(error.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchRegistros()
    return () => { isMounted = false; setLoading(true) }
  }, [refreshKey, isOnline, location.pathname])

  // Opciones para selects
  const propiedades = [...new Set(copropietarios.map(c => c.propiedad))].sort()
  const unidadesFiltradas = filtros.propiedad
    ? [...new Set(copropietarios.filter(c => c.propiedad === filtros.propiedad).map(c => c.unidad_asignada))]
    : []

  // Filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'propiedad' && { unidadAsignada: '' })
    }))
  }

  const registrosFiltrados = registros.filter(reg => {
    const coincideProp = !filtros.propiedad || (reg.copropietarios?.propiedad || '') === filtros.propiedad
    const coincideUnidad = !filtros.unidadAsignada || (reg.copropietarios?.unidad_asignada || '') === filtros.unidadAsignada
    return coincideProp && coincideUnidad
  })

  useEffect(() => {
    if (onRegistrosFiltradosChange) {
      onRegistrosFiltradosChange(registrosFiltrados)
    }
  }, [registrosFiltrados, onRegistrosFiltradosChange])

  const totalMonto = registrosFiltrados.reduce(
    (acc, reg) => acc + Number(reg.monto || 0),
    0
  )

  // Edición
  const handleEdit = (registro) => {
    setEditModal({ open: true, registro })
    setEditData({
      placa_vehiculo: registro.placa_vehiculo,
      tipo_vehiculo: registro.tipo_vehiculo,
      fecha_hora_ingreso: registro.fecha_hora_ingreso ? registro.fecha_hora_ingreso.slice(0, 10) : '',
      gratis: !!registro.gratis,
      observaciones: registro.observaciones || '',
      dependencia_id: registro.dependencia_id,
      recaudado: !!registro.recaudado,
      fecha_recaudo: registro.fecha_recaudo || '',
      observacion_audio_url: registro.observacion_audio_url || '',
      nuevoAudio: null
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
    setSavingEdit(true)
    const id = editModal.registro.id
    const monto = editData.gratis ? 0 : (editData.tipo_vehiculo === 'carro' ? 1.00 : 0.50)
    let audioUrlFinal = editData.observacion_audio_url

    // Subida de nuevo audio
    if (editData.nuevoAudio) {
      const fileName = `audio_obs_edit_${editData.placa_vehiculo}_${Date.now()}.webm`
      const { error: uploadError } = await supabase
        .storage
        .from('evidencias-parqueadero')
        .upload(fileName, editData.nuevoAudio, { contentType: 'audio/webm' })
      if (uploadError) {
        setError('Error al subir el audio: ' + uploadError.message)
        setSavingEdit(false)
        return
      }
      const { data: publicUrlData } = supabase
        .storage
        .from('evidencias-parqueadero')
        .getPublicUrl(fileName)
      audioUrlFinal = publicUrlData.publicUrl
    }

    try {
      const { error } = await supabase
        .from('registros_parqueadero')
        .update({
          ...editData,
          monto,
          fecha_recaudo: editData.recaudado ? editData.fecha_recaudo : null,
          observacion_audio_url: audioUrlFinal
        })
        .eq('id', id)

      if (error) throw error

      setRegistros(registros.map(r =>
        r.id === id ? { ...r, ...editData, monto, observacion_audio_url: audioUrlFinal } : r
      ))

      if (!isOnline) {
        const localData = JSON.parse(localStorage.getItem('registros_offline') || '[]')
        const updatedData = localData.map(item =>
          item.id === id ? { ...item, ...editData, monto, observacion_audio_url: audioUrlFinal } : item
        )
        localStorage.setItem('registros_offline', JSON.stringify(updatedData))
      }

      setEditModal({ open: false, registro: null })
      setEditData({})
    } catch (error) {
      setError(error.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Eliminar audio
  const handleEliminarAudio = async () => {
    if (!editData.observacion_audio_url) return
    if (!window.confirm('¿Eliminar esta evidencia auditiva?')) return
    setEliminandoAudio(true)
    try {
      if (editData.observacion_audio_url && editData.observacion_audio_url !== 'pendiente-sync') {
        const urlParts = editData.observacion_audio_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const { error: deleteError } = await supabase
          .storage
          .from('evidencias-parqueadero')
          .remove([fileName])
        if (deleteError) throw deleteError
      }
      setEditData(prev => ({ ...prev, observacion_audio_url: '', nuevoAudio: null }))
      const id = editModal.registro.id
      await supabase
        .from('registros_parqueadero')
        .update({ observacion_audio_url: null })
        .eq('id', id)
      setRegistros(registros.map(r =>
        r.id === id ? { ...r, observacion_audio_url: null } : r
      ))
    } catch (error) {
      setError('Error eliminando audio: ' + error.message)
    }
    setEliminandoAudio(false)
  }

  const handleDelete = async (registro) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return
    setDeleting(true)
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('registros_parqueadero')
          .delete()
          .eq('id', registro.id)
        if (error) throw error
      }

      const updatedRegistros = registros.filter(r => r.id !== registro.id)
      setRegistros(updatedRegistros)
      if (!isOnline) {
        const localData = JSON.parse(localStorage.getItem('registros_offline') || '[]')
        const filteredData = localData.filter(item => item.id !== registro.id)
        localStorage.setItem('registros_offline', JSON.stringify(filteredData))
      }
    } catch (err) {
      setError('Error eliminando registro: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Loader text="Cargando registros..." />
  if (error) return <div className="error-message">{error}</div>

  return (
    <div className="lista-registros-container">
      <div className="offline-banner" style={{
        display: !isOnline ? 'flex' : 'none',
        background: '#fff3cd',
        color: '#856404',
        padding: '8px 16px',
        borderRadius: '8px',
        marginBottom: '16px',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Emoji symbol="⚡" /> Modo offline - Mostrando datos almacenados localmente
      </div>

      <h2>
        <Emoji symbol="📝" label="Últimos Registros" /> Últimos Registros
      </h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div>
          <label>Propiedad:</label>
          <select
            name="propiedad"
            value={filtros.propiedad}
            onChange={handleFiltroChange}
          >
            <option value="">Todas</option>
            {propiedades.map(prop => (
              <option key={prop} value={prop}>{prop}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Unidad asignada:</label>
          <select
            name="unidadAsignada"
            value={filtros.unidadAsignada}
            onChange={handleFiltroChange}
            disabled={!filtros.propiedad}
          >
            <option value="">Todas</option>
            {unidadesFiltradas.map(unidad => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="registros-table-wrapper">
        <table className="registros-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}><Emoji symbol="📅" /> Fecha/Hora</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🚗" /> Placa</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🏍️" /> Tipo</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="📝" /> Observaciones</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="💵" /> Monto</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🆓" /> Gratis</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🔗" /> Recaudado</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="📅" /> Fecha Recaudo</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🏠" /> Copropietario</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="👤" /> Registrado por</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="📷" /> Foto</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="🔊" /> Audio</th>
              <th style={{ textAlign: 'center' }}><Emoji symbol="⚙️" /> Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length > 0 ? (
              <>
                {registrosFiltrados.map(reg => (
                  <tr key={reg.id}>
                    <td style={{ textAlign: 'center' }}>
                      {reg.fecha_hora_ingreso
                        ? dayjs(reg.fecha_hora_ingreso).format('DD/MM/YYYY HH:mm')
                        : ''}
                    </td>
                    <td style={{ textAlign: 'center' }}>{reg.placa_vehiculo}</td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.tipo_vehiculo?.toLowerCase() === 'carro' && (
                        <Emoji symbol="🚗" label="Carro" />
                      )}
                      {reg.tipo_vehiculo?.toLowerCase() === 'moto' && (
                        <Emoji symbol="🏍️" label="Moto" />
                      )}
                      <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>
                        {reg.tipo_vehiculo}
                      </span>
                    </td>
                    <td>{reg.observaciones || '-'}</td>
                    <td style={{ textAlign: 'center' }}>${Number(reg.monto).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.gratis
                        ? <Emoji symbol="🆓" label="Gratis" />
                        : <Emoji symbol="❌" label="No Gratis" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.recaudado
                        ? <Emoji symbol="🔗" label="Recaudado" />
                        : <Emoji symbol="⏳" label="Pendiente" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.fecha_recaudo || '-'}
                    </td>
                    <td>
                      <Emoji symbol="🏠" label="Casa" />{' '}
                      {reg.copropietarios?.nombre || '-'}
                      <br />
                      <small>
                        {reg.copropietarios?.propiedad || ''} - {reg.copropietarios?.unidad_asignada || ''}
                      </small>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.usuario?.nombre || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.foto_url && (
                        <a href={reg.foto_url} target="_blank" rel="noopener noreferrer">
                          <img src={reg.foto_url} alt="Evidencia" className="thumbnail" />
                        </a>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reg.observacion_audio_url && reg.observacion_audio_url !== 'pendiente-sync' ? (
                        <audio controls style={{ width: 90 }}>
                          <source src={reg.observacion_audio_url} type="audio/webm" />
                          Tu navegador no soporta audio.
                        </audio>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: 14 }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="edit-btn"
                        title="Editar"
                        onClick={() => handleEdit(reg)}
                        style={{ marginRight: 6 }}
                        disabled={!isOnline || savingEdit}
                      >
                        <Emoji symbol="✏️" label="Editar" />
                      </button>
                      <button
                        className="delete-btn"
                        title="Eliminar"
                        onClick={() => handleDelete(reg)}
                        disabled={!isOnline || deleting}
                      >
                        <Emoji symbol="🗑️" label="Eliminar" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#f6f8fc' }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>
                    Total
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    ${totalMonto.toFixed(2)}
                  </td>
                  <td colSpan={9}></td>
                </tr>
              </>
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
      {editModal.open && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Editar Registro</h3>
            <form className="modal-form" onSubmit={handleEditSave}>
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
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
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
              <label>
                Evidencia auditiva:
                {editData.observacion_audio_url && editData.observacion_audio_url !== 'pendiente-sync' ? (
                  <>
                    <audio controls style={{ width: '100%', margin: '8px 0' }}>
                      <source src={editData.observacion_audio_url} type="audio/webm" />
                      Tu navegador no soporta audio.
                    </audio>
                    <button
                      type="button"
                      onClick={handleEliminarAudio}
                      className="delete-btn"
                      style={{ marginTop: 8 }}
                      disabled={eliminandoAudio || !isOnline}
                    >
                      {eliminandoAudio ? 'Eliminando...' : <><Emoji symbol="🗑️" /> Eliminar audio</>}
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#aaa', fontSize: 14 }}>No hay audio guardado.</span>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setEditData(prev => ({
                    ...prev,
                    nuevoAudio: e.target.files && e.target.files[0] ? e.target.files[0] : null
                  }))}
                  disabled={!isOnline}
                  style={{ marginTop: 8 }}
                />
                <span style={{ fontSize: 12, color: '#888' }}>
                  Puedes subir un nuevo archivo de audio para reemplazar el actual.
                </span>
              </label>
              <div style={{ marginTop: 18 }}>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={!isOnline || savingEdit}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditModal({ open: false, registro: null })}
                  disabled={savingEdit}
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
