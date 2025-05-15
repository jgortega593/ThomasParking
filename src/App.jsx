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
import CapturaFoto from './pages/CapturaFoto'; // <--- Nueva importación

// Componentes de layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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
      {/* Oculta el contenido principal cuando el menú móvil está abierto */}
      {!menuOpen && (
        <div className="pt-16 min-h-screen flex flex-col">
          <Routes>
            {/* Ruta de login pública */}
            <Route path="/login" element={<Login />} />

            {/* Nueva ruta para captura de fotos */}
            <Route path="/captura-foto" element={<CapturaFoto />} />

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
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <GestionUsuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/copropietarios"
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
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
