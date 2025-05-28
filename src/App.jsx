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
import ResetPassword from './pages/ResetPassword';

function AppRoutes({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  const { user, loading: userLoading } = useUser();
  const isOnline = useOnlineStatus();
  const hideNavbarRoutes = ['/login', '/', '/registro'];

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
              user ? <Navigate to="/consultas" replace /> : <Login />
            } />

            <Route path="/registros" element={
              <AuthGuard requiredRole={['admin', 'registrador']}>
                <RegistroParqueo />
              </AuthGuard>
            }/>

            <Route path="/consultas" element={<AuthGuard><Consultas /></AuthGuard>} />
            <Route path="/recaudo" element={<AuthGuard requiredRole="admin"><ResumenRecaudo /></AuthGuard>} />
            <Route path="/compensacion" element={<AuthGuard requiredRole="admin"><Compensacion /></AuthGuard>} />
            <Route path="/descargos" element={<AuthGuard requiredRole="admin"><DescargoGestion /></AuthGuard>} />
            <Route path="/acercade" element={<AuthGuard><AcercaDe /></AuthGuard>} />
            <Route path="/usuarios" element={<AuthGuard requiredRole="admin"><GestionUsuarios /></AuthGuard>} />
            <Route path="/copropietarios" element={<AuthGuard requiredRole="admin"><GestionCopropietarios /></AuthGuard>} />
            <Route path="/auditoria" element={<AuthGuard requiredRole="admin"><AuditLog /></AuthGuard>} />

            <Route path="/" element={<Navigate to="/consultas" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
          <Footer />
        </div>
      )}
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            };
          };
        })
        .catch(error => console.error('Service Worker registration failed:', error));
    }
  }, []);

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister().then(() => window.location.reload());
      });
    }
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <UserProvider>
          <ErrorBoundary>
            {updateAvailable && (
              <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-4 z-50">
                <span>¡Nueva versión disponible!</span>
                <button 
                  onClick={handleUpdateApp}
                  className="bg-white text-blue-500 px-4 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  Actualizar ahora
                </button>
              </div>
            )}
            <AppRoutes menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          </ErrorBoundary>
        </UserProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
