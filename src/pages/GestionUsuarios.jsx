import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, usuario: null });
  const [form, setForm] = useState({ 
    nombre: '', 
    email: '',
    rol: 'registrador', 
    activo: true 
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Leer usuarios con validación
  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('id, nombre, email, rol, activo')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsuarios();
  }, []);

  // Validar formulario
  const validateForm = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Email inválido');
      return false;
    }
    if (form.nombre.trim().length < 3) {
      setError('Nombre debe tener al menos 3 caracteres');
      return false;
    }
    return true;
  };

  // Abrir modal para editar/crear
  const handleEdit = (usuario) => {
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo
    });
    setModal({ open: true, usuario });
  };

  const handleNew = () => {
    setForm({ nombre: '', email: '', rol: 'registrador', activo: true });
    setModal({ open: true, usuario: null });
  };

  // Guardar usuario
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);

    try {
      const usuarioData = {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        rol: form.rol,
        activo: form.activo
      };

      if (modal.usuario) {
        // Edición
        const { error } = await supabase
          .from('usuarios_app')
          .update(usuarioData)
          .eq('id', modal.usuario.id);
          
        if (error) throw error;
      } else {
        // Creación
        const { error } = await supabase
          .from('usuarios_app')
          .insert([usuarioData]);

        if (error) throw error;
      }

      setModal({ open: false, usuario: null });
      await fetchUsuarios();
    } catch (err) {
      setError(err.message || 'Error guardando usuario');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar usuario
  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Eliminar usuario ${usuario.email}?`)) return;
    
    setDeleting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('usuarios_app')
        .delete()
        .eq('id', usuario.id);

      if (error) throw error;
      
      await fetchUsuarios();
    } catch (err) {
      setError(err.message || 'Error eliminando usuario');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader text="Cargando usuarios..." />;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Emoji symbol="👥" /> Gestión de Usuarios
      </h2>

      <div className="mb-4">
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          onClick={handleNew}
        >
          <Emoji symbol="➕" /> Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left"><Emoji symbol="🧑" /> Nombre</th>
              <th className="p-3 text-left"><Emoji symbol="✉️" /> Email</th>
              <th className="p-3 text-left"><Emoji symbol="🎖️" /> Rol</th>
              <th className="p-3 text-left"><Emoji symbol="✔️" /> Estado</th>
              <th className="p-3 text-left"><Emoji symbol="⚙️" /> Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{u.nombre}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-1 rounded ${u.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {u.rol === 'admin' 
                      ? <><Emoji symbol="👑" /> Admin</>
                      : u.rol === 'copropietario'
                        ? <><Emoji symbol="🏠" /> Copropietario</>
                        : <><Emoji symbol="📋" /> Registrador</>}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-1 rounded ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.activo ? <Emoji symbol="✅" /> : <Emoji symbol="❌" />}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => handleEdit(u)}
                    disabled={deleting}
                  >
                    <Emoji symbol="✏️" />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(u)}
                    disabled={deleting}
                  >
                    <Emoji symbol="🗑️" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          <Emoji symbol="❌" /> {error}
        </div>
      )}

      {/* Modal de edición */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Emoji symbol={modal.usuario ? "✏️" : "➕"} />
              {modal.usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium"><Emoji symbol="🧑" /> Nombre:</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                  minLength="3"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium"><Emoji symbol="✉️" /> Email:</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                  disabled={!!modal.usuario}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium"><Emoji symbol="🎖️" /> Rol:</label>
                <select
                  value={form.rol}
                  onChange={e => setForm({...form, rol: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="admin">Administrador</option>
                  <option value="registrador">Registrador</option>
                  <option value="copropietario">Copropietario</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={e => setForm({...form, activo: e.target.checked})}
                  className="w-4 h-4"
                />
                <label className="font-medium"><Emoji symbol="✔️" /> Usuario activo</label>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={() => setModal({ open: false, usuario: null })}
                >
                  <Emoji symbol="❌" /> Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? <Loader size="small" /> : <><Emoji symbol="💾" /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
