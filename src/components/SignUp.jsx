import React from 'react';
import { useState } from 'react';
import supabase from '../supabaseClient';
import { Link } from 'react-router-dom';
import Loader from './Loader';
import Emoji from './Emoji';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('registrador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones del cliente
      if (!nombre.trim()) throw new Error('El nombre es obligatorio');
      if (!/\S+@\S+\.\S+/.test(email)) throw new Error('Formato de correo inválido');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            rol: rol === 'copropietario' ? 'copropietario' : rol
          },
          emailRedirectTo: `${window.location.origin}/login`
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este correo ya está registrado');
        }
        throw authError;
      }

      alert('Registro exitoso! Verifica tu correo electrónico para activar la cuenta.');
      setTimeout(() => window.location.href = '/login', 2000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">
        <Emoji symbol="📝" /> Registro de Usuario
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Nombre Completo
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Ej: Juan Pérez"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Contraseña
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

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Rol del Usuario
          </label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="registrador">Registrador</option>
            <option value="admin">Administrador</option>
            <option value="copropietario">Copropietario</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          {loading ? (
            <Loader text="Registrando..." small />
          ) : (
            <>
              <Emoji symbol="📝" /> Registrarse
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm dark:text-gray-300">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/login"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}
