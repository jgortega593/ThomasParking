// src/components/AuthGuard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { useUser } from '../context/UserContext';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Configuración de tiempos (ajustable)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;    // 30 minutos

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'
];

export default function AuthGuard({ requiredRole = null, children }) {
  const location = useLocation();
  const { user: contextUser, setUser } = useUser();
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
    role: null
  });
  const isOnline = useOnlineStatus();

  // Referencias para timers y estado de actividad
  const inactivityTimer = useRef(null);
  const refreshInterval = useRef(null);
  const activityDetected = useRef(false);

  // --- Función para chequear autorización y rol ---
  const checkAuthorization = useCallback(async (user) => {
    try {
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('email, rol, activo, nombre')
        .eq('email', user.email)
        .single();

      if (error) throw new Error('Error de autorización: ' + error.message);
      if (!data) throw new Error('Usuario no registrado');
      if (!data.activo) throw new Error('Cuenta desactivada');

return { ...user, role: data.rol, nombre: data.nombre }; // <--- agrega nombre al usuario del contexto



    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }, []);

  // --- Manejo de cambios de sesión/auth ---
  const handleAuthStateChange = useCallback(async (session) => {
    try {
      if (!session?.user) {
        setAuthState({ user: null, loading: false, error: null, role: null });
        setUser(null);
        return;
      }
      const authorizedUser = await checkAuthorization(session.user);
      setAuthState({
        user: authorizedUser,
        loading: false,
        error: null,
        role: authorizedUser.role
      });
      setUser(authorizedUser);
      localStorage.setItem('sb-access-token', session.access_token);
    } catch (error) {
      setAuthState({ user: null, loading: false, error: error.message, role: null });
      setUser(null);
    }
  }, [checkAuthorization, setUser]);

  // --- Inicialización y listeners ---
  useEffect(() => {
    let isMounted = true;

    // Inicializa sesión al montar
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (error) throw error;
        if (!user) throw new Error('No autenticado');
        const authorizedUser = await checkAuthorization(user);
        if (isMounted) {
          setAuthState({
            user: authorizedUser,
            loading: false,
            error: null,
            role: authorizedUser.role
          });
          setUser(authorizedUser);
        }
      } catch (error) {
        if (isMounted) {
          setAuthState({ user: null, loading: false, error: error.message, role: null });
          setUser(null);
        }
      }
    };

    // --- Detección de actividad e inactividad ---
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_TIMEOUT);
      activityDetected.current = true;
    };

    // --- Refresco de token solo si hubo actividad ---
    const setupTokenRefresh = () => {
      refreshInterval.current = setInterval(async () => {
        if (activityDetected.current) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) await supabase.auth.setSession(session);
          activityDetected.current = false;
        }
      }, TOKEN_REFRESH_INTERVAL);
    };

    // --- Suscripción a cambios de autenticación ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await handleAuthStateChange(session);
      }
    );

    // --- Listeners de actividad del usuario ---
    ACTIVITY_EVENTS.forEach(event =>
      window.addEventListener(event, resetInactivityTimer)
    );
    resetInactivityTimer();
    setupTokenRefresh();
    initializeAuth();

    // Cleanup
    return () => {
      isMounted = false;
      clearTimeout(inactivityTimer.current);
      clearInterval(refreshInterval.current);
      ACTIVITY_EVENTS.forEach(event =>
        window.removeEventListener(event, resetInactivityTimer)
      );
      subscription?.unsubscribe();
    };
  }, [checkAuthorization, handleAuthStateChange, setUser]);

  // --- Retry manual ---
  const handleRetry = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('No autenticado');
      const authorizedUser = await checkAuthorization(user);
      setAuthState({
        user: authorizedUser,
        loading: false,
        error: null,
        role: authorizedUser.role
      });
      setUser(authorizedUser);
    } catch (error) {
      setAuthState({ user: null, loading: false, error: error.message, role: null });
      setUser(null);
    }
  };

  // --- Renderizado según estado ---
  if (authState.loading) return <Loader fullScreen text="Verificando credenciales..." />;
  if (authState.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ErrorMessage
          title="Error de acceso"
          message={authState.error}
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
  if (!authState.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requiredRole && authState.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return children || <Outlet />;
}
