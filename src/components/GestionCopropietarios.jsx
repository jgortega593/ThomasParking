import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Loader from './Loader'
import Emoji from './Emoji'

export default function GestionCopropietarios() {
  const [copropietarios, setCopropietarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState({ open: false, copropietario: null })
  const [form, setForm] = useState({ nombre: '', propiedad: '', unidad_asignada: '' })

  // Leer copropietarios
  const fetchCopropietarios = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('copropietarios').select('*').order('propiedad')
    if (error) setError(error.message)
    else setCopropietarios(data)
    setLoading(false)
  }

  useEffect(() => { fetchCopropietarios() }, [])

  // Crear o actualizar copropietario
  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.nombre || !form.propiedad || !form.unidad_asignada) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (modal.copropietario) {
      // Update
      const { error } = await supabase
        .from('copropietarios')
        .update(form)
        .eq('id', modal.copropietario.id)
      if (error) setError(error.message)
    } else {
      // Create
      const { error } = await supabase
        .from('copropietarios')
        .insert([form])
      if (error) setError(error.message)
    }
    setModal({ open: false, copropietario: null })
    setForm({ nombre: '', propiedad: '', unidad_asignada: '' })
    fetchCopropietarios()
  }

  // Eliminar copropietario
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar copropietario?')) return
    const { error } = await supabase.from('copropietarios').delete().eq('id', id)
    if (error) setError(error.message)
    fetchCopropietarios()
  }

  // Abrir modal para editar
  const handleEdit = (copropietario) => {
    setForm({
      nombre: copropietario.nombre,
      propiedad: copropietario.propiedad,
      unidad_asignada: copropietario.unidad_asignada
    })
    setModal({ open: true, copropietario })
  }

  // Abrir modal para crear
  const handleNew = () => {
    setForm({ nombre: '', propiedad: '', unidad_asignada: '' })
    setModal({ open: true, copropietario: null })
  }

  return (
    <div className="gestion-copropietarios-container">
      <h2>
        <Emoji symbol="👥" label="Copropietarios" /> Gestión de Copropietarios
      </h2>
      <button className="edit-btn" onClick={handleNew}>
        <Emoji symbol="➕" label="Agregar" /> Nuevo copropietario
      </button>
      {loading ? <Loader /> : (
        <table className="resultados-table">
          <thead>
            <tr>
              <th><Emoji symbol="🧑" label="Nombre" /> Nombre</th>
              <th><Emoji symbol="🏢" label="Propiedad" /> Propiedad</th>
              <th><Emoji symbol="🔢" label="Unidad" /> Unidad</th>
              <th><Emoji symbol="⚙️" label="Acciones" /> Acciones</th>
            </tr>
          </thead>
          <tbody>
            {copropietarios.map(c => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.propiedad}</td>
                <td>{c.unidad_asignada}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(c)} title="Editar">
                    <Emoji symbol="✏️" label="Editar" />
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(c.id)} title="Eliminar">
                    <Emoji symbol="🗑️" label="Eliminar" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <div className="error-message">{error}</div>}

      {/* Modal para crear/editar */}
      {modal.open && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>
              <Emoji symbol={modal.copropietario ? "✏️" : "➕"} label={modal.copropietario ? "Editar" : "Nuevo"} />{' '}
              {modal.copropietario ? 'Editar' : 'Nuevo'} Copropietario
            </h3>
            <form className="modal-form" onSubmit={handleSave}>
              <label>
                <Emoji symbol="🧑" label="Nombre" /> Nombre:
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </label>
              <label>
                <Emoji symbol="🏢" label="Propiedad" /> Propiedad:
                <input
                  value={form.propiedad}
                  onChange={e => setForm({ ...form, propiedad: e.target.value })}
                  required
                />
              </label>
              <label>
                <Emoji symbol="🔢" label="Unidad" /> Unidad asignada:
                <input
                  value={form.unidad_asignada}
                  onChange={e => setForm({ ...form, unidad_asignada: e.target.value })}
                  required
                />
              </label>
              <div>
                <button type="submit" className="save-btn">
                  <Emoji symbol="💾" label="Guardar" /> Guardar
                </button>
                <button type="button" className="cancel-btn" onClick={() => setModal({ open: false, copropietario: null })}>
                  <Emoji symbol="❌" label="Cancelar" /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
