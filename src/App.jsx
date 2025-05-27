// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import supabase from './supabaseClient';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider, useUser } from './context/UserContext';

// Componentes principales
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import Loader from './components/Loader';
import useOnlineStatus from './hooks/useOnlineStatus';

// Páginas y componentes
import RegistroParqueo from './pages/RegistroParqueo';
import Consultas from './pages/Consultas';
import ResumenRecaudo from './pages/ResumenRecaudo';
import Compensacion from './pages/Compensacion';
import DescargoGestion from './pages/DescargoGestion';
import GestionUsuarios from './pages/GestionUsuarios';
import GestionCopropietarios from './pages/GestionCopropietarios';
import AcercaDe from './pages/AcercaDe';
import Login from './pages/Login';
import AuditLog from './components/AuditLog';

function AppRoutes({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  const { user } = useUser();
  const isOnline = useOnlineStatus();
  const hideNavbarRoutes = ['/login', '/', '/registro'];

  // Sincronizar token con localStorage
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      } else {
        localStorage.removeItem('sb-access-token');
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && (
        <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      )}

      {!isOnline && (
        <div className="offline-banner" role="status" aria-live="polite">
          <span role="img" aria-label="offline">⚡</span>
          Modo offline: solo lectura. Edición y borrado deshabilitados.
        </div>
      )}

      {!menuOpen && (
        <div className="pt-16 min-h-screen flex flex-col">
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to="/registros" replace /> : <Login />
            } />
            
            {/* Rutas protegidas */}
            <Route path="/registros" element={
              <AuthGuard>
                <RegistroParqueo />
              </AuthGuard>
            } />

            <Route path="/consultas" element={
              <AuthGuard>
                <Consultas />
              </AuthGuard>
            } />

            <Route path="/recaudo" element={
              <AuthGuard requiredRole="admin">
                <ResumenRecaudo />
              </AuthGuard>
            } />

            <Route path="/compensacion" element={
              <AuthGuard requiredRole="admin">
                <Compensacion />
              </AuthGuard>
            } />

            <Route path="/descargos" element={
              <AuthGuard requiredRole="admin">
                <DescargoGestion />
              </AuthGuard>
            } />

            <Route path="/acercade" element={
              <AuthGuard>
                <AcercaDe />
              </AuthGuard>
            } />

            <Route path="/usuarios" element={
              <AuthGuard requiredRole="admin">
                <GestionUsuarios />
              </AuthGuard>
            } />

            <Route path="/copropietarios" element={
              <AuthGuard requiredRole="admin">
                <GestionCopropietarios />
              </AuthGuard>
            } />

            <Route path="/auditoria" element={
              <AuthGuard requiredRole="admin">
                <AuditLog />
              </AuthGuard>
            } />

            <Route path="/" element={<Navigate to="/registros" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      )}
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  if (loading) {
    return <Loader fullScreen text="Inicializando aplicación..." />;
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true
          }}
        >
          <ErrorBoundary>
            <AppRoutes 
              menuOpen={menuOpen} 
              setMenuOpen={setMenuOpen} 
            />
          </ErrorBoundary>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
