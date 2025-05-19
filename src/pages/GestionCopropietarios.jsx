import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from '../components/Loader';
import Emoji from '../components/Emoji';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';

export default function GestionCopropietarios() {
  const [copropietarios, setCopropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ 
    open: false, 
    copropietario: null 
  });
  const [form, setForm] = useState({ 
    nombre: '', 
    propiedad: '', 
    unidad_asignada: '' 
  });
  const navigate = useNavigate();

  const fetchCopropietarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('copropietarios')
        .select('*')
        .order('propiedad', { ascending: true });

      if (error) throw error;
      setCopropietarios(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchCopropietarios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!form.nombre || !form.propiedad || !form.unidad_asignada) {
      setError('Todos los campos son obligatorios');
      return;
    }

    try {
      if (modal.copropietario) {
        // Actualizar
        const { error } = await supabase
          .from('copropietarios')
          .update(form)
          .eq('id', modal.copropietario.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('copropietarios')
          .insert([form])
          .select();

        if (error) throw error;
      }

      setModal({ open: false, copropietario: null });
      setForm({ nombre: '', propiedad: '', unidad_asignada: '' });
      await fetchCopropietarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar copropietario?')) return;
    setError(null);
    
    try {
      const { error } = await supabase
        .from('copropietarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCopropietarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (copropietario) => {
    setForm({
      nombre: copropietario.nombre,
      propiedad: copropietario.propiedad,
      unidad_asignada: copropietario.unidad_asignada
    });
    setModal({ open: true, copropietario });
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        <Emoji symbol="👥" /> Gestión de Copropietarios
      </h2>

      <button 
        onClick={() => setModal({ open: true, copropietario: null })}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700 transition-colors"
      >
        <Emoji symbol="➕" /> Nuevo Copropietario
      </button>

      {loading ? <Loader /> : error ? <ErrorMessage message={error} /> : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <Emoji symbol="🧑" /> Nombre
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <Emoji symbol="🏢" /> Propiedad
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <Emoji symbol="🔢" /> Unidad
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <Emoji symbol="⚙️" /> Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {copropietarios.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {c.nombre}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {c.propiedad}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {c.unidad_asignada}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Emoji symbol="✏️" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Emoji symbol="🗑️" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })}>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">
            <Emoji symbol={modal.copropietario ? "✏️" : "➕"} /> 
            {modal.copropietario ? 'Editar' : 'Nuevo'} Copropietario
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                <Emoji symbol="🧑" /> Nombre completo
              </label>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Emoji symbol="🏢" /> Propiedad
              </label>
              <input
                value={form.propiedad}
                onChange={e => setForm({ ...form, propiedad: e.target.value })}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Emoji symbol="🔢" /> Unidad asignada
              </label>
              <input
                value={form.unidad_asignada}
                onChange={e => setForm({ ...form, unidad_asignada: e.target.value })}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setModal({ open: false })}
                className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {modal.copropietario ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
