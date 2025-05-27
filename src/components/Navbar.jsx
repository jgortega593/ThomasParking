// src/components/Navbar.jsx
import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Emoji from './Emoji';
import ThemeToggle from './ThemeToggle';
import { useUser } from '../context/UserContext';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Ítems de navegación
function getAllNavItems() {
  return [
    { to: '/registros', label: 'Registro Parqueo', emoji: '📝', requiredRole: null },
    { to: '/consultas', label: 'Reportes', emoji: '📊', requiredRole: null },
    { to: '/recaudo', label: 'Recaudación', emoji: '💰', requiredRole: 'admin' },
    { to: '/compensacion', label: 'Compensación', emoji: '🎁', requiredRole: 'admin' },
    { to: '/copropietarios', label: 'Copropietarios', emoji: '🏘️', requiredRole: 'admin' },
    { to: '/usuarios', label: 'Usuarios', emoji: '👥', requiredRole: 'admin' },
    { to: '/descargos', label: 'Descargos', emoji: '📤', requiredRole: 'admin' },
    { to: '/auditoria', label: 'Auditoría', emoji: '🕵️', requiredRole: 'admin' },
    { to: '/acercade', label: 'Acerca de', emoji: 'ℹ️', requiredRole: null },
    { to: '/reset-password', label: 'Restablecer Contraseña', emoji: '🔒', requiredRole: null },
  ];
}

// AccessDenied (se mantiene igual)
function AccessDenied({ requiredRole, userRole }) {
  const politicas = {
    admin: [
      '👑 Administradores pueden acceder a todas las funcionalidades',
      '💰 Gestión de recaudación y compensaciones',
      '🏘️ Administración de copropietarios y usuarios',
      '📤 Gestión de descargos y auditoría del sistema',
      '📊 Acceso completo a reportes y consultas'
    ],
    registrador: [
      '📝 Registradores pueden crear nuevos registros de parqueo',
      '📊 Consulta de reportes y datos existentes',
      'ℹ️ Acceso a información general del sistema'
    ]
  };

  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <Emoji symbol="🚫" />
        <h2 className="text-2xl font-bold text-yellow-800 mt-2 mb-4">
          Acceso No Autorizado
        </h2>
        <p className="text-yellow-700 mb-4">
          Esta funcionalidad requiere permisos de <strong>{requiredRole}</strong>.<br />
          Tu rol actual es: <strong>{userRole}</strong>
        </p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">
          <Emoji symbol="📋" /> Políticas de Acceso del Sistema
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-left">
            <h4 className="font-semibold text-blue-700 mb-3">
              <Emoji symbol="👑" /> Administradores
            </h4>
            <ul className="space-y-2 text-sm text-blue-600">
              {politicas.admin.map((politica, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{politica}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-blue-700 mb-3">
              <Emoji symbol="📝" /> Registradores
            </h4>
            <ul className="space-y-2 text-sm text-blue-600">
              {politicas.registrador.map((politica, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{politica}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded border-l-4 border-blue-400">
          <p className="text-sm text-gray-700">
            <Emoji symbol="💡" /> <strong>¿Necesitas acceso adicional?</strong><br />
            Contacta al administrador del sistema para solicitar permisos adicionales.
          </p>
        </div>
      </div>
    </div>
  );
}

// Menú móvil centrado bajo el navbar y desplegado hacia abajo
function NavMenuMobile({ navItems, user, handleNavClick, handleLogout, setMenuOpen }) {
  const menuRef = useRef();
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
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

  const rol = user?.role || user?.user_metadata?.role || 'registrador';
  const esAdmin = rol.toLowerCase() === 'admin';

  return (
    <div
      className="fixed left-0 top-0 w-full h-full z-50 flex flex-col items-center"
      style={{
        background: 'rgba(30,41,59,0.88)',
        paddingTop: 56, // altura del navbar
      }}
      aria-modal="true"
      role="dialog"
    >
      <nav
        ref={menuRef}
        className="bg-gradient-to-br from-blue-700 to-purple-700 rounded-b-xl shadow-lg flex flex-col items-center"
        role="navigation"
        aria-label="Menú principal móvil"
        style={{
          margin: 0,
          maxHeight: 'calc(100vh - 56px - 24px)',
          overflowY: 'auto',
          width: '96vw',
          maxWidth: 360,
          minWidth: 0,
          boxSizing: 'border-box',
          padding: '12px 0 18px 0',
          position: 'relative',
          top: 0,
        }}
      >
        {navItems.map(item => {
          const tieneAcceso = !item.requiredRole || rol.toLowerCase() === item.requiredRole;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 w-11/12 mx-auto px-4 py-3 rounded-lg font-medium text-base transition-colors focus:outline-none ${
                  isActive ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'
                } ${!tieneAcceso ? 'opacity-70' : ''}`
              }
              aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              style={{ boxSizing: 'border-box', marginBottom: 4 }}
            >
              <Emoji symbol={item.emoji} label={item.label} />
              {item.label}
              {!tieneAcceso && <Emoji symbol="🔒" label="Bloqueado" />}
            </NavLink>
          );
        })}
        {user && (
          <div className="flex flex-col items-center mt-6 text-center select-text w-11/12 mx-auto">
            <span className="text-white font-bold text-base">
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
        <div className="mt-6 w-11/12 mx-auto">
          <ThemeToggle />
        </div>
         <button
                onClick={handleLogout}
                className="flex items-center mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                aria-label="Cerrar sesión"
                type="button"
              >
                <Emoji symbol="🚶‍♂️➡️🚪" label="Cerrar sesión" /> <span className="ml-2"></span>
              </button>

      </nav>
    </div>
  );
}

// Navbar principal
export default function Navbar({ menuOpen, setMenuOpen }) {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/login');
  };

  const rol = (user?.role || user?.user_metadata?.role || 'registrador').toLowerCase();
  const navItems = getAllNavItems();
  const esAdmin = rol === 'admin';
  const handleNavClick = () => setMenuOpen(false);
  const isOnline = useOnlineStatus();

  return (
    <header className="w-full bg-gradient-to-r from-blue-700 to-purple-700 shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center px-4 h-14">
        {/* Logo y nombre de la app */}
        <div className="flex-shrink-0 flex items-center">
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-white font-bold text-lg"
            onClick={handleNavClick}
            aria-label="Inicio"
          >
            <Emoji symbol="🅿️" label="Thomas II Parking" /> <span>Thomas II ParkingApp</span>
          </NavLink>
        </div>
        {/* Indicador de estado de conexión */}
        <span
          className={`ml-4 flex items-center text-xs font-semibold ${
            isOnline ? 'text-green-500' : 'text-yellow-600'
          }`}
          aria-label={isOnline ? "Conectado" : "Desconectado"}
          title={isOnline ? "Conectado" : "Desconectado"}
        >
          <Emoji
            symbol={isOnline ? '🟢' : '🟡'}
            label={isOnline ? 'Conectado' : 'Desconectado'}
          />
          <span
            className={`w-2 h-2 rounded-full mx-1 ${
              isOnline ? 'bg-green-500' : 'bg-yellow-500'
            } animate-pulse`}
          ></span>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {/* Botón hamburguesa móvil */}
        <button
          className="flex items-center justify-center text-white focus:outline-none ml-auto p-1 md:hidden"
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
        {/* Navegación desktop */}
        <div className="hidden md:flex items-center ml-auto gap-6">
          {navItems.slice(0, 4).map(item => {
            const tieneAcceso = !item.requiredRole || rol === item.requiredRole;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-base transition-colors focus:outline-none ${
                    isActive ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'
                  } ${!tieneAcceso ? 'opacity-70' : ''}`
                }
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <Emoji symbol={item.emoji} label={item.label} /> {item.label}
                {!tieneAcceso && <Emoji symbol="🔒" label="Bloqueado" />}
              </NavLink>
            );
          })}
          <ThemeToggle />
          {user && (
            <div className="flex flex-col items-end ml-4 select-text">
              <span className="font-semibold text-white mb-1">
                {user.nombre}
                {esAdmin && <Emoji symbol="👑" label="Administrador" />}
              </span>
              <span className="text-xs text-blue-100">{user.email}</span>
              <span className="text-xs text-blue-100 flex items-center gap-1">
                <Emoji symbol="🔑" label="Rol" /> {rol.toUpperCase()}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                aria-label="Cerrar sesión"
                type="button"
              >
                <Emoji symbol="🚶‍♂️➡️🚪" label="Cerrar sesión" /> <span className="ml-2"></span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Menú móvil centrado y desplegado bajo el navbar */}
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

// Exporta AccessDenied para AuthGuard
export { AccessDenied };
