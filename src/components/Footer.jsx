// src/components/Footer.jsx
import React from 'react'
import Emoji from './Emoji'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full py-6 mt-10 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
          © {year} Conjunto Habitacional Thomas II. Todos los derechos reservados.
        </div>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a
            href="mailto:conjuntohabitacionalthomasii@gmail.com"
            className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm flex items-center gap-1"
            aria-label="Contacto por correo"
          >
            <Emoji symbol="✉️" label="Correo" />
            Contacto
          </a>
          <a
            href="https://github.com/jgortega593/ThomasParking.git"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm flex items-center gap-1"
            aria-label="Repositorio en GitHub"
          >
            <Emoji symbol="🐱" label="GitHub" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
