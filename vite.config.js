// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/rest/v1': {
        target: import.meta.env.VITE_SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rest\/v1/, '/rest/v1')
      },
      '/auth/v1': {
        target: import.meta.env.VITE_SUPABASE_URL,
        changeOrigin: true
      }
    }
  }
})
