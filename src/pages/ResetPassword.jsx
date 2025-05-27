// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../supabaseClient';
import Emoji from '../components/Emoji';
import ErrorMessage from '../components/ErrorMessage';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const validatePasswords = () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess('Contraseña actualizada exitosamente. Redirigiendo al login...');
      
      // Cerrar sesión y redirigir al login después de 2 segundos
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }, 2000);

    } catch (error) {
      setError(error.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <form
        onSubmit={handleResetPassword}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700"
        aria-label="Formulario para restablecer contraseña"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-300 flex items-center justify-center gap-2">
          <Emoji symbol="🔒" label="candado" /> Restablecer Contraseña
        </h1>

        <p className="text-center text-gray-300 mb-6">
          Ingresa tu nueva contraseña para completar el restablecimiento.
        </p>

        <div className="mb-4">
          <label htmlFor="password" className="block text-base font-medium mb-2 text-white">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={`w-full p-3 rounded-xl bg-gray-800 text-blue-100 border-2 transition-all outline-none text-lg
              ${error && password.length < 6 ? 'border-pink-400 focus:border-pink-500' : 'border-blue-400 focus:border-blue-500'}
            `}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-base font-medium mb-2 text-white">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`w-full p-3 rounded-xl bg-gray-800 text-blue-100 border-2 transition-all outline-none text-lg
              ${error && password !== confirmPassword ? 'border-pink-400 focus:border-pink-500' : 'border-blue-400 focus:border-blue-500'}
            `}
            placeholder="Confirma tu nueva contraseña"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-3 text-pink-400 text-sm font-semibold">
            <Emoji symbol="⚠️" /> {error}
          </div>
        )}

        {success && (
          <div className="mb-3 text-green-400 text-sm font-semibold">
            <Emoji symbol="✅" /> {success}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg shadow transition-colors flex items-center justify-center gap-2"
          disabled={loading}
        >
          <Emoji symbol="🔐" />
          {loading ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-blue-300 hover:underline text-sm"
            disabled={loading}
          >
            ← Volver al login
          </button>
        </div>

            </form>
    </div>
  );
}
