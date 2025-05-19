// src/components/SignUp.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from './Loader';
import Emoji from './Emoji';

export default function SignUp() {
  const [usuariosApp, setUsuariosApp] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'registrador'
  });

  // Cargar usuarios de la tabla usuarios_app
  useEffect(() => {
    const fetchUsuariosApp = async () => {
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('id, nombre, email, rol')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando usuarios:', error);
        setError('Error al cargar usuarios registrados');
        return;
      }
      setUsuariosApp(data || []);
    };
    fetchUsuariosApp();
  }, []);

  // Actualizar formulario cuando seleccionan un usuario
  const handleUserSelect = (e) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    
    const selectedUser = usuariosApp.find(u => u.id === userId);
    if (selectedUser) {
      setFormData({
        nombre: selectedUser.nombre,
        email: selectedUser.email,
        rol: selectedUser.rol || 'registrador'
      });
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones
      if (!selectedUserId) throw new Error('Debes seleccionar un usuario');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

      // Crear usuario en Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password,
        options: {
          data: {
            nombre: formData.nombre,
            rol: formData.rol
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;

      // Actualizar usuario en tabla usuarios_app
      const { error: updateError } = await supabase
        .from('usuarios_app')
        .update({ activo: true })
        .eq('id', selectedUserId);

      if (updateError) throw updateError;

      alert('Usuario activado! Credenciales enviadas por correo.');
      setTimeout(() => window.location.href = '/usuarios', 2000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">
        <Emoji symbol="👥" /> Activar Usuario Existente
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Seleccionar Usuario
          </label>
          <select
            value={selectedUserId}
            onChange={handleUserSelect}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          >
            <option value="">Seleccione un usuario...</option>
            {usuariosApp
              .filter(u => !u.activo) // Mostrar solo usuarios inactivos
              .map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.email})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={formData.email}
            readOnly
            className="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Nombre Completo
          </label>
          <input
            type="text"
            value={formData.nombre}
            readOnly
            className="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Rol del Usuario
          </label>
          <select
            value={formData.rol}
            onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value }))}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="registrador">Registrador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Contraseña Temporal
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Mínimo 6 caracteres"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          {loading ? (
            <Loader text="Activando..." small />
          ) : (
            <>
              <Emoji symbol="✅" /> Activar Usuario
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm dark:text-gray-300">
        <Link
          to="/usuarios"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Volver a gestión de usuarios
        </Link>
      </p>
    </div>
  );
}
