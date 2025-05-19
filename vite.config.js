import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {  // ← Simplificar la ruta base
        target: 'http://localhost:4000',  // ← Usar localhost
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {  // ← Depuración avanzada
          proxy.on('error', (err) => console.error('Proxy Error:', err))
          proxy.on('proxyReq', (proxyReq) => {
            console.log('Solicitando:', proxyReq.path)
          })
        }
      }
    }
  }
})
