// src/components/AuthGuard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { useUser } from '../context/UserContext';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Configuración de tiempo de espera
const AUTH_CHECK_TIMEOUT = 5000; // 5 segundos
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutos
const INACTIVITY_TIMEOUT = 1800000; // 30 minutos

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

  const checkAuthorization = useCallback(async (user) => {
    try {
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('email, rol, activo')
        .eq('email', user.email)
        .single();

      if (error) throw new Error('Error de autorización: ' + error.message);
      if (!data) throw new Error('Usuario no registrado');
      if (!data.activo) throw new Error('Cuenta desactivada');
      
      return { ...user, role: data.rol };
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    let authCheckTimeout;
    let refreshInterval;
    let inactivityTimer;

    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        if (error) throw error;
        if (!user) throw new Error('No autenticado');

        authCheckTimeout = setTimeout(() => {
          if (isMounted && authState.loading) {
            setAuthState(prev => ({ ...prev, loading: false }));
            supabase.auth.signOut();
          }
        }, AUTH_CHECK_TIMEOUT);

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
      } finally {
        clearTimeout(authCheckTimeout);
      }
    };

    const setupAuthListeners = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          clearTimeout(authCheckTimeout);
          await handleAuthStateChange(session);
        }
      );

      // Intervalo para refrescar token
      refreshInterval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) supabase.auth.setSession(session);
      }, TOKEN_REFRESH_INTERVAL);

      // Timer de inactividad
      const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          supabase.auth.signOut();
        }, INACTIVITY_TIMEOUT);
      };

      window.addEventListener('mousemove', resetInactivityTimer);
      window.addEventListener('keydown', resetInactivityTimer);
      resetInactivityTimer();

      return () => {
        subscription?.unsubscribe();
        clearInterval(refreshInterval);
        clearTimeout(inactivityTimer);
        window.removeEventListener('mousemove', resetInactivityTimer);
        window.removeEventListener('keydown', resetInactivityTimer);
      };
    };

    initializeAuth();
    const cleanupListeners = setupAuthListeners();

    return () => {
      isMounted = false;
      clearTimeout(authCheckTimeout);
      cleanupListeners();
    };
  }, [checkAuthorization, handleAuthStateChange, setUser, authState.loading]);

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
