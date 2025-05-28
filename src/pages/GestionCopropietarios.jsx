import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { useUser } from '../context/UserContext';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Emoji from '../components/Emoji';

const PROPIEDADES = [
  { value: 'Casa', label: '🏡 Casa' },
  { value: 'Departamento', label: '🌆 Departamento' }
];

export default function GestionCopropietarios() {
  const { user, loading: userLoading } = useUser();
  const [copropietarios, setCopropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);

  // Estado auxiliar para texto de los inputs de códigos
  const [codigosText, setCodigosText] = useState({
    accesovmachala: '',
    accesovlegarda: '',
    accesopmachala: ''
  });

  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    propiedad: '',
    unidad_asignada: '',
    accesovmachala: [],
    accesovlegarda: [],
    accesopmachala: []
  });

  useEffect(() => {
    const fetchCopropietarios = async () => {
      try {
        const { data, error } = await supabase
          .from('copropietarios')
          .select(`
            id,
            nombre,
            contacto,
            propiedad,
            unidad_asignada,
            accesovmachala,
            accesovlegarda,
            accesopmachala
          `)
          .order('propiedad', { ascending: true });
        if (error) throw error;
        const normalizados = (data || []).map(item => ({
          ...item,
          accesovmachala: Array.isArray(item.accesovmachala) ? item.accesovmachala : [],
          accesovlegarda: Array.isArray(item.accesovlegarda) ? item.accesovlegarda : [],
          accesopmachala: Array.isArray(item.accesopmachala) ? item.accesopmachala : []
        }));
        setCopropietarios(normalizados);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (user && !userLoading) fetchCopropietarios();
  }, [user, userLoading]);

  // Maneja cambios en los inputs de códigos (texto)
  const handleCodigoInputChange = (field, value) => {
    setCodigosText(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sincroniza el array en formData al salir del input o al enviar
  const syncCodigoArray = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: codigosText[field]
        .split('/')
        .map(item => item.trim())
        .filter(Boolean)
    }));
  };

  // Maneja cambios en campos normales
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Sincroniza arrays antes de enviar a Supabase
  const syncAllArrays = () => {
    return {
      ...formData,
      accesovmachala: codigosText.accesovmachala.split('/').map(x => x.trim()).filter(Boolean),
      accesovlegarda: codigosText.accesovlegarda.split('/').map(x => x.trim()).filter(Boolean),
      accesopmachala: codigosText.accesopmachala.split('/').map(x => x.trim()).filter(Boolean)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const dataToSave = syncAllArrays();
    try {
      if (editId) {
        const { error } = await supabase
          .from('copropietarios')
          .update(dataToSave)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('copropietarios')
          .insert([dataToSave]);
        if (error) throw error;
      }
      resetForm();
      window.location.reload();
    } catch (error) {
      setError(error.message);
    }
  };

  // Al editar, sincroniza los textos de los inputs de códigos
  const handleEdit = (copropietario) => {
    setFormData({
      nombre: copropietario.nombre || '',
      contacto: copropietario.contacto || '',
      propiedad: copropietario.propiedad,
      unidad_asignada: copropietario.unidad_asignada,
      accesovmachala: Array.isArray(copropietario.accesovmachala) ? copropietario.accesovmachala : [],
      accesovlegarda: Array.isArray(copropietario.accesovlegarda) ? copropietario.accesovlegarda : [],
      accesopmachala: Array.isArray(copropietario.accesopmachala) ? copropietario.accesopmachala : []
    });
    setCodigosText({
      accesovmachala: (copropietario.accesovmachala || []).join(' / '),
      accesovlegarda: (copropietario.accesovlegarda || []).join(' / '),
      accesopmachala: (copropietario.accesopmachala || []).join(' / ')
    });
    setEditId(copropietario.id);
    setError(null);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('copropietarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      contacto: '',
      propiedad: '',
      unidad_asignada: '',
      accesovmachala: [],
      accesovlegarda: [],
      accesopmachala: []
    });
    setCodigosText({
      accesovmachala: '',
      accesovlegarda: '',
      accesopmachala: ''
    });
    setEditId(null);
    setError(null);
  };

  if (userLoading || loading) return <Loader fullScreen text="Cargando copropietarios..." />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Emoji symbol="🏘️" label="Copropietarios" /> Gestión de Copropietarios / Accesos
      </h1>

      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">
              <Emoji symbol="🧑‍💼" /> Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="📱" /> Contacto
            </label>
            <input
              type="text"
              name="contacto"
              value={formData.contacto}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="🏡" /> Propiedad <span className="text-red-500">*</span>
            </label>
            <select
              name="propiedad"
              value={formData.propiedad}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              required
            >
              <option value="">Seleccionar propiedad</option>
              {PROPIEDADES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="🔢" /> Unidad Asignada <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="unidad_asignada"
              value={formData.unidad_asignada}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="🚗" /> Acceso vehicular Machala
            </label>
            <input
              type="text"
              value={codigosText.accesovmachala}
              onChange={e => handleCodigoInputChange('accesovmachala', e.target.value)}
              onBlur={() => syncCodigoArray('accesovmachala')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Código1 / Código2 / Código3"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="🚙" /> Acceso vehicular Legarda
            </label>
            <input
              type="text"
              value={codigosText.accesovlegarda}
              onChange={e => handleCodigoInputChange('accesovlegarda', e.target.value)}
              onBlur={() => syncCodigoArray('accesovlegarda')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Código1 / Código2 / Código3"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block font-medium">
              <Emoji symbol="🚶‍♂️" /> Acceso peatonal Machala
            </label>
            <input
              type="text"
              value={codigosText.accesopmachala}
              onChange={e => handleCodigoInputChange('accesopmachala', e.target.value)}
              onBlur={() => syncCodigoArray('accesopmachala')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Código1 / Código2 / Código3"
              autoComplete="off"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-6 w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          {editId ? <><Emoji symbol="💾" /> Actualizar</> : <><Emoji symbol="➕" /> Registrar</>}
        </button>
        {error && <ErrorMessage message={error} />}
      </form>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left"><Emoji symbol="🧑‍💼" /> Nombre</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="📱" /> Contacto</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🏡" /> Propiedad</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🔢" /> Unidad</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🚗" /> Machala</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🚙" /> Legarda</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="🚶‍♂️" /> Peatonal</th>
              <th className="px-4 py-3 text-left"><Emoji symbol="⚙️" /> Acciones</th>
            </tr>
          </thead>
          <tbody>
            {copropietarios.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{item.nombre}</td>
                <td className="px-4 py-3">{item.contacto || '-'}</td>
                <td className="px-4 py-3">
                  {item.propiedad === 'Casa' && <Emoji symbol="🏡" />}
                  {item.propiedad === 'Departamento' && <Emoji symbol="🌆" />}
                  {' '}{item.propiedad}
                </td>
                <td className="px-4 py-3">{item.unidad_asignada}</td>
                <td className="px-4 py-3">{Array.isArray(item.accesovmachala) ? item.accesovmachala.join(' / ') : '-'}</td>
                <td className="px-4 py-3">{Array.isArray(item.accesovlegarda) ? item.accesovlegarda.join(' / ') : '-'}</td>
                <td className="px-4 py-3">{Array.isArray(item.accesopmachala) ? item.accesopmachala.join(' / ') : '-'}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Emoji symbol="✏️" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    <Emoji symbol="🗑️" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {copropietarios.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400">
                  <Emoji symbol="📭" /> No hay copropietarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
