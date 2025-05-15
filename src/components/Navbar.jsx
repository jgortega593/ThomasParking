// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Emoji from './Emoji';

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
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
        {/* Logo y título */}
        <NavLink to="/" className="flex items-center space-x-2 text-white font-bold text-lg" onClick={handleNavClick}>
          <Emoji symbol="🅿️" /> <span>ParkingApp</span>
        </NavLink>

        {/* Botón hamburguesa móvil */}
        <button
          className="md:hidden flex items-center text-white focus:outline-none"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Menú horizontal (desktop) */}
        <nav className="hidden md:flex items-center space-x-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none ${
                  isActive ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'
                }`
              }
              onClick={handleNavClick}
            >
              <Emoji symbol={item.emoji} /> {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario y logout (desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <div className="flex flex-col items-end mr-2">
              <span className="text-white font-semibold text-sm leading-tight">{user.email}</span>
              <span className="text-blue-200 text-xs">{user.user_metadata?.role || 'usuario'}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Emoji symbol="🚪" /> <span className="ml-2">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Menú móvil overlay */}
      {menuOpen && (
        <nav className="md:hidden fixed inset-0 z-50 bg-gradient-to-br from-blue-700 to-purple-700 flex flex-col items-center justify-center space-y-4">
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
            >
              <Emoji symbol={item.emoji} /> {item.label}
            </NavLink>
          ))}
          {user && (
            <div className="flex flex-col items-center mt-6">
              <span className="text-white font-semibold text-base">{user.email}</span>
              <span className="text-blue-200 text-sm">{user.user_metadata?.role || 'usuario'}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center mt-4 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-lg transition-colors"
          >
            <Emoji symbol="🚪" /> <span className="ml-2">Cerrar Sesión</span>
          </button>
        </nav>
      )}
    </header>
  );
}
