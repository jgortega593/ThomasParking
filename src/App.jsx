// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import supabase from './supabaseClient';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider, useUser } from './context/UserContext'; // Importar el UserContext

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

function AppRoutes({ menuOpen, setMenuOpen, isOnline }) {
  const location = useLocation();
  const hideNavbarRoutes = ['/login', '/', '/registro'];
  const { user } = useUser(); // Obtener usuario del contexto

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && (
        <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
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

            <Route
              path="/registros"
              element={
                <AuthGuard>
                  <RegistroParqueo />
                </AuthGuard>
              }
            />
            <Route
              path="/consultas"
              element={
                <AuthGuard>
                  <Consultas />
                </AuthGuard>
              }
            />
            <Route
              path="/recaudo"
              element={
                <AuthGuard requiredRole="registrador">
                  <Recaudo />
                </AuthGuard>
              }
            />
            <Route
              path="/descargos"
              element={
                <AuthGuard requiredRole="admin">
                  <Descargos />
                </AuthGuard>
              }
            />
            <Route
              path="/acercade"
              element={
                <AuthGuard>
                  <AcercaDe />
                </AuthGuard>
              }
            />
            <Route
              path="/usuarios"
              element={
                <AuthGuard requiredRole="admin">
                  <GestionUsuarios />
                </AuthGuard>
              }
            />
            <Route
              path="/copropietarios"
              element={
                <AuthGuard requiredRole="admin">
                  <GestionCopropietarios />
                </AuthGuard>
              }
            />
            <Route
              path="/"
              element={<Navigate to="/registros" replace />}
            />
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
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <Loader fullScreen text="Inicializando aplicación..." />;
  }

  return (
    <ThemeProvider>
      <UserProvider> {/* Envolver con UserProvider */}
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <AppRoutes
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              isOnline={isOnline}
            />
          </ErrorBoundary>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
