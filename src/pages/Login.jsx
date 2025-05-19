// src/pages/Login.jsx
import React, { useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email"); // "email" o "otp"
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Enviar código OTP al correo
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // o false si solo quieres permitir acceso a usuarios existentes
        // emailRedirectTo: 'https://TU_DOMINIO.com/' // opcional, si quieres redirigir tras login
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
      setInfo("Se ha enviado un código a tu correo electrónico.");
    }
  };

  // Verificar el código OTP
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setInfo("¡Autenticación exitosa! Redirigiendo...");
      // Espera un momento y redirige
      setTimeout(() => navigate("/"), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Iniciar sesión sin contraseña
        </h2>
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-700 dark:text-gray-300">
                Correo electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
                {info}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-700 dark:text-gray-300">
                Ingresa el código recibido por email
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
                disabled={loading}
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
                {info}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Verificar código"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
