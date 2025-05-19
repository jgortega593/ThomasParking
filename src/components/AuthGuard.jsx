// src/components/AuthGuard.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import supabase from '../supabaseClient';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';

export default function AuthGuard({ requiredRole = null }) {
  const location = useLocation();
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
    role: null
  });

  const checkAuthorization = async (user) => {
    try {
      // 1. Obtener rol desde la tabla usuarios_app
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('email, rol, activo')
        .eq('email', user.email)
        .single();

      if (error) throw new Error('Error de autorización: ' + error.message);
      if (!data) throw new Error('Usuario no registrado en el sistema');
      if (!data.activo) throw new Error('Cuenta desactivada');

      // 2. Actualizar metadata del usuario en Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: data.rol }
      });

      if (updateError) throw new Error('Error actualizando perfil: ' + updateError.message);

      return { ...user, role: data.rol };
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted && authState.loading) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Timeout al verificar credenciales'
        }));
      }
    }, 15000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (!session?.user) {
            if (isMounted) {
              setAuthState({
                user: null,
                loading: false,
                error: null,
                role: null
              });
            }
            return;
          }

          const authorizedUser = await checkAuthorization(session.user);
          if (isMounted) {
            setAuthState({
              user: authorizedUser,
              loading: false,
              error: null,
              role: authorizedUser.role
            });
          }
        } catch (error) {
          if (isMounted) {
            setAuthState({
              user: null,
              loading: false,
              error: error.message,
              role: null
            });
          }
        }
      }
    );

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
        }
      } catch (error) {
        if (isMounted) {
          setAuthState({
            user: null,
            loading: false,
            error: error.message,
            role: null
          });
        }
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

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
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: error.message,
        role: null
      });
    }
  };

  if (authState.loading) {
    return <Loader fullScreen text="Verificando credenciales..." />;
  }

  if (authState.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ErrorMessage 
          title="Error de acceso"
          message={authState.error}
          retryable
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

  return <Outlet />;
}
