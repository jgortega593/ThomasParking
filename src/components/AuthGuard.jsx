import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { useUser } from '../context/UserContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { AccessDenied } from './Navbar';

// Constantes configurables
const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutos
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;     // 30 minutos
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const LOADER_TIMEOUT = 3000;                   // 3 segundos para recarga

export default function AuthGuard({ requiredRole = null, children }) {
  const location = useLocation();
  const { user, loading: userLoading, error: userError } = useUser();
  const [authState, setAuthState] = useState({
    loading: true,
    error: null,
    role: null,
    isValid: false,
  });
  const [timeoutExcedido, setTimeoutExcedido] = useState(false);
  const isOnline = useOnlineStatus();
  const inactivityTimer = useRef(null);
  const refreshInterval = useRef(null);
  const isMounted = useRef(true);
  const loaderTimeout = useRef(null);

  // Función para resetear temporizador de inactividad
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      supabase.auth.signOut();
      window.location.reload();
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Función para verificar autorización con Supabase
  const checkAuthorization = useCallback(async (user) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Sesión no válida");

      const { data, error: userError } = await supabase
        .from("usuarios_app")
        .select("rol, activo")
        .eq("id", user.id)
        .single();

      if (userError || !data) throw new Error("Usuario no registrado");
      if (!data.activo) throw new Error("Cuenta desactivada");

      return data.rol.toLowerCase();
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }, []);

  // Manejo de cambios de sesión
  const handleAuthStateChange = useCallback(
    async (session) => {
      try {
        if (!session?.user) {
          setAuthState({ loading: false, error: null, role: null, isValid: false });
          return;
        }

        const role = await checkAuthorization(session.user);
        if (isMounted.current) {
          setAuthState({ loading: false, error: null, role, isValid: true });
        }
      } catch (error) {
        if (isMounted.current) {
          setAuthState({ loading: false, error: error.message, role: null, isValid: false });
        }
      }
    },
    [checkAuthorization]
  );

  // Efecto principal: Configurar listeners y verificar sesión
  useEffect(() => {
    isMounted.current = true;

    // Configurar listeners de actividad
    ACTIVITY_EVENTS.forEach((event) => 
      window.addEventListener(event, resetInactivityTimer)
    );

    // Configurar refresh automático de token
    refreshInterval.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.auth.setSession(session);
    }, TOKEN_REFRESH_INTERVAL);

    // Suscripción a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await handleAuthStateChange(session);
      }
    );

    // Verificar sesión inicial
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthStateChange(session);
    };
    initializeAuth();

    // Cleanup
    return () => {
      isMounted.current = false;
      clearTimeout(inactivityTimer.current);
      clearInterval(refreshInterval.current);
      ACTIVITY_EVENTS.forEach((event) => 
        window.removeEventListener(event, resetInactivityTimer)
      );
      subscription?.unsubscribe();
    };
  }, [handleAuthStateChange, resetInactivityTimer]);

  // Timeout para recargar si el loader se queda pegado
  useEffect(() => {
    if (authState.loading || userLoading) {
      loaderTimeout.current = setTimeout(() => {
        if (isMounted.current) {
          setTimeoutExcedido(true);
          window.location.reload();
        }
      }, LOADER_TIMEOUT);
    }
    return () => clearTimeout(loaderTimeout.current);
  }, [authState.loading, userLoading]);

  // Manejar reintento manual
  const handleRetry = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthStateChange(session);
    } catch (error) {
      setAuthState({ loading: false, error: error.message, role: null, isValid: false });
    }
  };

  // Estados de carga
  if (userLoading || authState.loading) {
    return <Loader fullScreen text={timeoutExcedido ? "Reintentando verificación..." : "Verificando credenciales..."} />;
  }

  // Manejo de errores
  if (authState.error || userError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ErrorMessage
          title="Error de acceso"
          message={authState.error || userError}
          retryable={isOnline}
          onRetry={handleRetry}
        >
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </ErrorMessage>
      </div>
    );
  }

  // Redirección si no está autenticado
  if (!user || !authState.isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validación de roles
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole)
      ? requiredRole.map((r) => r.toLowerCase())
      : [requiredRole.toLowerCase()];

    if (!requiredRoles.includes(authState.role)) {
      return <AccessDenied requiredRole={requiredRole} userRole={authState.role} />;
    }
  }

  return children || <Outlet />;
}
