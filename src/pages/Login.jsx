// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../supabaseClient";
import Loader from "../components/Loader";
import Emoji from "../components/Emoji";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Cambiar a true si se permiten nuevos usuarios
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;
      
      setStep("otp");
      setInfo("Código enviado. Revisa tu correo electrónico.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email"
      });

      if (error) throw error;

      // Redirección post-login
      const from = location.state?.from?.pathname || "/registros";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message.includes("token") 
        ? "Código inválido o expirado" 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
          <Emoji symbol="🔑" /> Acceso al Sistema
        </h1>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="usuario@ejemplo.com"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader text="Enviando código..." />
              ) : (
                <>
                  <Emoji symbol="📨" /> Continuar con correo
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Código de verificación
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-center text-2xl font-mono rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="123456"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                Ingresa el código de 6 dígitos enviado a {email}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader text="Verificando..." />
              ) : (
                <>
                  <Emoji symbol="✅" /> Verificar código
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg border border-red-200 dark:border-red-800">
            <Emoji symbol="⚠️" /> {error}
          </div>
        )}

        {info && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-100 rounded-lg border border-green-200 dark:border-green-800">
            <Emoji symbol="ℹ️" /> {info}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => setStep("email")}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            type="button"
          >
            <Emoji symbol="↩️" /> Volver a ingresar correo
          </button>
        </div>
      </div>
    </div>
  );
}
