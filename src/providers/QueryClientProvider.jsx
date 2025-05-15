// src/providers/QueryClientProvider.jsx
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Configura el QueryClient con opciones recomendadas para producción
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutos: los datos se consideran frescos
      cacheTime: 30 * 60 * 1000,    // 30 minutos: tiempo de vida en caché
      retry: 2,                     // Reintenta 2 veces en caso de error
      refetchOnWindowFocus: false,  // No recargar al cambiar de pestaña
      useErrorBoundary: true        // Usa ErrorBoundary para errores
    },
    mutations: {
      useErrorBoundary: true
    }
  }
})

/**
 * Envuelve tu aplicación con este provider para habilitar React Query globalmente.
 * Uso:
 * <MyQueryClientProvider>
 *   <App />
 * </MyQueryClientProvider>
 */
export default function MyQueryClientProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
