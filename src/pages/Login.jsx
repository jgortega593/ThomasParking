import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../supabaseClient";
import Loader from "../components/Loader";
import Emoji from "../components/Emoji";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email"); // "email" | "otp" | "password"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Lógica para login con OTP (correo)
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin,
        },
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

  // Lógica para verificar OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      const from = location.state?.from?.pathname || "/registros";
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.message.includes("token")
          ? "Código inválido o expirado"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Lógica para login con contraseña
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const from = location.state?.from?.pathname || "/registros";
      navigate(from, { replace: true });
    } catch (err) {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-8 transition-all">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-300 flex items-center justify-center gap-2">
          <Emoji symbol="🔑" /> Acceso al Sistema
        </h1>

        {step === "email" && (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <label className="block text-base font-medium mb-2 text-white">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-blue-400 focus:border-blue-500 bg-gray-900 text-blue-100 placeholder-gray-400 text-lg outline-none"
                  placeholder="usuario@ejemplo.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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
            <form onSubmit={handlePasswordLogin} className="space-y-5 mt-6">
              <div>
                <label className="block text-base font-medium mb-2 text-white">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-blue-400 focus:border-blue-500 bg-gray-900 text-blue-100 placeholder-gray-400 text-lg outline-none"
                  placeholder="Ingresa tu contraseña"
                  required
                  disabled={loading || !email}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <Loader text="Ingresando..." />
                ) : (
                  <>
                    <Emoji symbol="🔓" /> Ingresar con contraseña
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-base font-medium mb-2 text-white">
                Código de verificación
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full px-4 py-3 text-center text-2xl font-mono rounded-lg border-2 border-blue-400 focus:border-blue-500 bg-gray-900 text-blue-100 placeholder-gray-400 outline-none"
                placeholder="123456"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-sm text-blue-200 mt-2 text-center">
                Ingresa el código de 6 dígitos enviado a {email}
              </p>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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
            <button
              type="button"
              className="w-full py-3 bg-blue-400 hover:bg-blue-500 text-white font-bold rounded-lg mt-2 transition-colors flex items-center justify-center gap-2"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
                setInfo("");
              }}
              disabled={loading}
            >
              <Emoji symbol="↩️" /> Volver a ingresar correo
            </button>
          </form>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900 text-red-100 rounded-lg border border-red-800">
            <Emoji symbol="⚠️" /> {error}
          </div>
        )}

        {info && (
          <div className="mt-6 p-4 bg-green-900 text-green-100 rounded-lg border border-green-800">
            <Emoji symbol="ℹ️" /> {info}
          </div>
        )}

        </div>
    </div>
  );
}
