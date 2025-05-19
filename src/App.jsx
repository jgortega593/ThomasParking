// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import supabase from './supabaseClient';
import { ThemeProvider } from './context/ThemeContext';

// Componentes principales
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import Loader from './components/Loader';
import useOnlineStatus from './hooks/useOnlineStatus';

// Páginas
import RegistroParqueo from './pages/RegistroParqueo';
import Consultas from './pages/Consultas';
import Recaudo from './pages/ResumenRecaudo';
import Descargos from './pages/DescargoGestion';
import GestionUsuarios from './pages/GestionUsuarios';
import GestionCopropietarios from './pages/GestionCopropietarios';
import AcercaDe from './pages/AcercaDe';
import Login from './pages/Login';
import SignUp from './components/SignUp';

function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_metadata?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes({ user, menuOpen, setMenuOpen, isOnline }) {
  const location = useLocation();
  const hideNavbarRoutes = ['/login', '/', '/registro'];

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && (
        <Navbar 
          user={user} 
          menuOpen={menuOpen} 
          setMenuOpen={setMenuOpen} 
        />
      )}

      {!isOnline && (
        <div className="offline-banner" role="status" aria-live="polite"
          style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '10px 0',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1rem',
            borderBottom: '1.5px solid #ffe58f',
            position: 'sticky',
            top: '64px',
            zIndex: 40
          }}
        >
          <span role="img" aria-label="offline">⚡</span>
          &nbsp;Modo offline: solo lectura. Edición y borrado deshabilitados.
        </div>
      )}

      {!menuOpen && (
        <div className="pt-16 min-h-screen flex flex-col">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<SignUp />} />
            
            <Route path="/registros" element={
              <ProtectedRoute user={user} allowedRoles={['admin', 'registrador']}>
                <RegistroParqueo />
              </ProtectedRoute>
            }/>

            <Route path="/consultas" element={
              <ProtectedRoute user={user}>
                <Consultas />
              </ProtectedRoute>
            }/>

            <Route path="/recaudo" element={
              <ProtectedRoute user={user} allowedRoles={['admin', 'registrador']}>
                <Recaudo />
              </ProtectedRoute>
            }/>

            <Route path="/descargos" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Descargos />
              </ProtectedRoute>
            }/>

            <Route path="/acercade" element={
              <ProtectedRoute user={user}>
                <AcercaDe />
              </ProtectedRoute>
            }/>

            <Route path="/usuarios" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <GestionUsuarios />
              </ProtectedRoute>
            }/>

            <Route path="/copropietarios" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <GestionCopropietarios />
              </ProtectedRoute>
            }/>

            <Route path="/" element={
              user ? <Navigate to="/registros" replace /> : <Navigate to="/login" replace />
            }/>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let isMounted = true;
    
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(user || null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isMounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      }
    );

    getSession();
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <Loader fullScreen text="Inicializando aplicación..." />;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes
            user={user}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            isOnline={isOnline}
          />
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
