// src/context/ViewContext.jsx
import React, { createContext, useContext, useState } from 'react'

const ViewContext = createContext()

export function ViewProvider({ children }) {
  const [currentView, setCurrentView] = useState('registro') // Estado inicial
  
  return (
    <ViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  )
}

export const useView = () => {
  const context = useContext(ViewContext)
  if (!context) {
    throw new Error('useView debe usarse dentro de un ViewProvider')
  }
  return context
}
