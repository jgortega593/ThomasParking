import React, { useState, useEffect } from 'react'
import Loader from '../components/Loader'
import Emoji from '../components/Emoji'

// Utilidad para fetch seguro de copropietarios usando el proxy
async function fetchCopropietariosSeguro() {
  try {
    const response = await fetch('/api/cors-proxy/copropietarios');
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${text}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error("Respuesta no es JSON: " + text);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error cargando copropietarios:", error.message);
    throw error;
  }
}

export default function GestionCopropietarios() {
  const [copropietarios, setCopropietarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState({ open: false, copropietario: null })
  const [form, setForm] = useState({ nombre: '', propiedad: '', unidad_asignada: '' })

  // Leer copropietarios con manejo robusto de errores
  const fetchCopropietarios = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCopropietariosSeguro()
      setCopropietarios(data)
    } catch (err) {
      setError(err.message)
    }
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
    try {
      let response;
      if (modal.copropietario) {
        // Update
        response = await fetch(`/api/cors-proxy/copropietarios?id=eq.${modal.copropietario.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } else {
        // Create
        response = await fetch('/api/cors-proxy/copropietarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([form])
        });
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error: ${text}`);
      }
      setModal({ open: false, copropietario: null })
      setForm({ nombre: '', propiedad: '', unidad_asignada: '' })
      fetchCopropietarios()
    } catch (err) {
      setError(err.message)
    }
  }

  // Eliminar copropietario
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar copropietario?')) return
    setError(null)
    try {
      const response = await fetch(`/api/cors-proxy/copropietarios?id=eq.${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error: ${text}`);
      }
      fetchCopropietarios()
    } catch (err) {
      setError(err.message)
    }
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
