// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { appearance, setAppearance } = useTheme();

  return (
    <select
      value={appearance}
      onChange={e => setAppearance(e.target.value)}
      style={{ borderRadius: 8, padding: 6, marginLeft: 10, fontWeight: 600 }}
      aria-label="Selector de tema"
    >
      <option value="light">🌞 Claro</option>
      <option value="dark">🌙 Oscuro</option>
      <option value="system">🖥️ Sistema</option>
    </select>
  );
}
