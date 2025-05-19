// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext()

const THEMES = ['light', 'dark', 'system']

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(appearance) {
  const html = document.documentElement
  let theme = appearance
  if (appearance === 'system') {
    theme = getPreferredTheme()
  }
  html.setAttribute('data-theme', theme)
  html.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }) {
  const [appearance, setAppearance] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    return localStorage.getItem('appearance') || 'system'
  })

  // Actualiza el tema cuando cambia la preferencia
  const updateAppearance = useCallback(
    (mode) => {
      if (!THEMES.includes(mode)) mode = 'system'
      setAppearance(mode)
      localStorage.setItem('appearance', mode)
      applyTheme(mode)
    },
    []
  )

  // Inicializa y escucha cambios del sistema
  useEffect(() => {
    applyTheme(appearance)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (appearance === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [appearance])

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance: updateAppearance }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return context
}
