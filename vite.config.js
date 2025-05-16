// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    
    // Configuración del servidor de desarrollo
    server: {
      port: 5173,
      host: '0.0.0.0', // Necesario para Docker
      proxy: {
        '/api': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },

    // Configuración para vista previa de producción
    preview: {
      port: 4173,
      host: '0.0.0.0' // Necesario para Docker
    },

    // Configuración de build
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          format: 'es',
          assetFileNames: 'assets/[name]-[hash][extname]',
          entryFileNames: 'assets/[name]-[hash].js'
        }
      }
    },

    // Optimización para caché
    cache: {
      strict: true,
      path: 'node_modules/.vite'
    }
  }
})
