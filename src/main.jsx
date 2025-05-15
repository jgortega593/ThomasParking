// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Si tienes ThemeProvider propio, descomenta e importa aquí:
import { ThemeProvider } from './context/ThemeContext'

// Registro de Service Worker para PWA (opcional, elimina si no se usa)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registrado con éxito:', registration.scope)
      })
      .catch(error => {
        console.error('Error al registrar ServiceWorker:', error)
      })
  })
}

// Renderizado principal de la app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Si usas ThemeProvider global, envuelve <App /> así:
    <ThemeProvider>
      <App />
    </ThemeProvider>
    */}
    <App />
  </React.StrictMode>
)
