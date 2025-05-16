// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {

 server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SUPABASE_URL, // ✅ Usar env cargada
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      // Forzar formato ESM
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    }
  }
})
