// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Emoji from './Emoji';

function NavMenuMobile({ navItems, user, handleNavClick, handleLogout }) {
  return (
    <nav
      className="fixed inset-0 z-50 bg-gradient-to-br from-blue-700 to-purple-700 flex flex-col items-center justify-center space-y-4"
      role="navigation"
      aria-label="Menú principal móvil"
    >
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center gap-2 px-6 py-4 rounded-lg font-medium text-2xl transition-colors focus:outline-none ${
              isActive ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'
            }`
          }
          aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
        >
          <Emoji symbol={item.emoji} /> {item.label}
        </NavLink>
      ))}
      {user && (
        <div className="flex flex-col items-center mt-6">
          <span className="text-white font-semibold text-base">{user.email}</span>
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center mt-4 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-lg transition-colors"
        aria-label="Cerrar sesión"
      >
        <Emoji symbol="🚪" /> <span className="ml-2">Cerrar Sesión</span>
      </button>
    </nav>
  );
}

export default function Navbar({ user, menuOpen, setMenuOpen }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/login');
  };

  const navItems = [
    { to: '/registros', label: 'Registro Parqueo', emoji: '📝' },
    { to: '/consultas', label: 'Reportes', emoji: '📊' },
    { to: '/recaudo', label: 'Recaudación', emoji: '💰' },
    { to: '/descargos', label: 'Descargos', emoji: '📤' },
    { to: '/copropietarios', label: 'Copropietarios', emoji: '🏘️' },
    { to: '/usuarios', label: 'Usuarios', emoji: '👥' },
    { to: '/acercade', label: 'Acerca de', emoji: 'ℹ️' },
  ];

  // Cierra el menú móvil al navegar
  const handleNavClick = () => setMenuOpen(false);

  return (
    <header className="w-full bg-gradient-to-r from-blue-700 to-purple-700 shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center px-4 h-16">
        {/* IZQUIERDA: Logo y título */}
        <div className="flex-shrink-0 flex items-center">
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-white font-bold text-lg"
            onClick={handleNavClick}
            aria-label="Inicio"
          >
            <Emoji symbol="🅿️" /> <span>ParkingApp</span>
          </NavLink>
        </div>

        {/* Usuario logueado: email y rol (solo escritorio) */}
        {user && (
          <div className="hidden md:flex flex-col items-end ml-auto mr-4 text-white">
            <span className="font-semibold">{user.email}</span>
          </div>
        )}

        {/* Botón hamburguesa SIEMPRE visible */}
        <button
          className="flex items-center justify-center text-white focus:outline-none ml-2 p-1"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
          style={{ minWidth: 0, minHeight: 0, width: '32px', height: '32px', padding: '4px' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
      {/* Menú móvil overlay */}
      {menuOpen && (
        <NavMenuMobile
          navItems={navItems}
          user={user}
          handleNavClick={handleNavClick}
          handleLogout={handleLogout}
        />
      )}
    </header>
  );
}
