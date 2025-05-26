// src/components/Navbar.jsx
import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Emoji from './Emoji';
import ThemeToggle from './ThemeToggle';
import { useUser } from '../context/UserContext';

function getNavItemsByRole(rol) {
  const baseItems = [
    { to: '/registros', label: 'Registro Parqueo', emoji: '📝' },
    { to: '/consultas', label: 'Reportes', emoji: '📊' },
    { to: '/acercade', label: 'Acerca de', emoji: 'ℹ️' },
  ];
  if (rol === 'admin') {
    return [
      ...baseItems,
      { to: '/recaudo', label: 'Recaudación', emoji: '💰' },
      { to: '/compensacion', label: 'Compensación', emoji: '🎁' },
      { to: '/descargos', label: 'Descargos', emoji: '📤' },
      { to: '/copropietarios', label: 'Copropietarios', emoji: '🏘️' },
      { to: '/usuarios', label: 'Usuarios', emoji: '👥' },
      { to: '/auditoria', label: 'Auditoría', emoji: '🕵️' },
    ];
  }
  return baseItems;
}

function NavMenuMobile({ navItems, user, handleNavClick, handleLogout, setMenuOpen }) {
  const menuRef = useRef();
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMenuOpen]);

  const rol = user?.role || user?.user_metadata?.role || 'Rol no disponible';
  const esAdmin = rol.toLowerCase() === 'admin';

  return (
    <nav
      ref={menuRef}
      className="fixed inset-0 z-50 bg-gradient-to-br from-blue-700 to-purple-700 flex flex-col items-center justify-center space-y-4 p-6"
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
          <Emoji symbol={item.emoji} label={item.label} /> {item.label}
        </NavLink>
      ))}
      {user && (
        <div className="flex flex-col items-center mt-6 text-center select-text">
          <span className="text-white font-semibold text-base">
            {user.nombre}
          </span>
          <span className="text-white text-xs font-normal mt-1 flex flex-col items-center gap-1">
            <span>{user.email}</span>
            <span>
              <Emoji symbol="🔑" label="Rol" /> {rol.toUpperCase()}
              {esAdmin && <Emoji symbol="👑" label="Administrador" />}
            </span>
          </span>
        </div>
      )}
      <div className="mt-6">
        <ThemeToggle />
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center mt-4 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-lg transition-colors"
        aria-label="Cerrar sesión"
        type="button"
      >
        <Emoji symbol="🚪" label="Cerrar sesión" /> <span className="ml-2">Cerrar Sesión</span>
      </button>
    </nav>
  );
}

export default function Navbar({ menuOpen, setMenuOpen }) {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/login');
  };

  const rol = (user?.role || user?.user_metadata?.role || 'registrador').toLowerCase();
  const navItems = getNavItemsByRole(rol);
  const esAdmin = rol === 'admin';

  const handleNavClick = () => setMenuOpen(false);

  return (
    <header className="w-full bg-gradient-to-r from-blue-700 to-purple-700 shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center px-4 h-16">
        {/* Logo, título y nombre de usuario */}
        <div className="flex-shrink-0 flex items-center">
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-white font-bold text-lg"
            onClick={handleNavClick}
            aria-label="Inicio"
          >
            <Emoji symbol="🅿️" label="Parking" /> <span>ParkingApp</span>
          </NavLink>
          {/* Nombre, mail y rol (escritorio) */}
          {user && (
<div className="hidden md:flex flex-col items-start ml-6 pl-6 border-l border-white/30 select-text">
  <span className="font-semibold text-white mb-2">{user.nombre}
    <Emoji symbol="👨🏼‍🚀" label="User" />
  </span>
  <span className="text-xs text-blue-100">{user.email}</span>
  <span className="text-xs text-blue-100 flex items-center gap-1">
    <Emoji symbol="🔑" label="Rol" /> {rol.toUpperCase()}
    {esAdmin && <Emoji symbol="👑" label="Administrador" />}
  </span>
</div>

          )}
        </div>

        {/* Selector de tema (escritorio) */}
        <div className="hidden md:flex items-center ml-auto">
          <ThemeToggle />
        </div>

        {/* Botón hamburguesa */}
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
      {/* Menú móvil */}
      {menuOpen && (
        <NavMenuMobile
          navItems={navItems}
          user={user}
          handleNavClick={handleNavClick}
          handleLogout={handleLogout}
          setMenuOpen={setMenuOpen}
        />
      )}
    </header>
  );
}
