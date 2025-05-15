// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Páginas
import RegistroParqueo from './pages/RegistroParqueo';
import Consultas from './pages/Consultas';
import Recaudo from './pages/ResumenRecaudo';
import Descargos from './pages/DescargoGestion';
import GestionUsuarios from './pages/GestionUsuarios';
import GestionCopropietarios from './pages/GestionCopropietarios';
import AcercaDe from './pages/AcercaDe';
import Login from './pages/Login';

// Componentes de layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Hook para estado online/offline
import useOnlineStatus from './hooks/useOnlineStatus';

// Ruta protegida
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.user_metadata?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Mantener el usuario autenticado
  useEffect(() => {
    let mounted = true;
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setUser(user || null);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Navbar user={user} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {/* Indicador claro de estado offline */}
      {!isOnline && (
        <div className="offline-banner" role="status" aria-live="polite"
          style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '10px 0',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1rem',
            letterSpacing: '0.02em',
            borderBottom: '1.5px solid #ffe58f',
            zIndex: 100,
            width: '100vw',
            position: 'relative'
          }}
        >
          <span role="img" aria-label="offline">⚡</span>
          &nbsp;Modo offline: solo lectura. Edición y borrado están deshabilitados.
        </div>
      )}
      {/* Oculta el contenido principal cuando el menú móvil está abierto */}
      {!menuOpen && (
        <div className="pt-16 min-h-screen flex flex-col">
          <Routes>
            {/* Ruta de login pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas para cualquier usuario autenticado */}
            <Route
              path="/registros"
              element={
                <ProtectedRoute user={user}>
                  <RegistroParqueo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultas"
              element={
                <ProtectedRoute user={user}>
                  <Consultas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recaudo"
              element={
                <ProtectedRoute user={user}>
                  <Recaudo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/descargos"
              element={
                <ProtectedRoute user={user}>
                  <Descargos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/acercade"
              element={
                <ProtectedRoute user={user}>
                  <AcercaDe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute user={user}>
                  <GestionUsuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/copropietarios"
              element={
                <ProtectedRoute user={user}>
                  <GestionCopropietarios />
                </ProtectedRoute>
              }
            />
            {/* Redirección por defecto */}
            <Route
              path="/"
              element={
                user ? <Navigate to="/registros" replace /> : <Navigate to="/login" replace />
              }
            />
            {/* Ruta catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      )}
    </BrowserRouter>
  );
}
