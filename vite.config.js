// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      mode === 'analyze' && visualizer({ open: true }) // npm run build -- --mode analyze
    ],

    // Configuración base para despliegue
    base: mode === 'development' ? '/' : '/',

    server: {
      port: 5173,
      proxy: {
        // Proxy para API de Supabase en desarrollo
        '/api': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/rest/v1')
        },
        '/auth': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true
        }
      }
    },

    build: {
      outDir: 'dist',
      assetsInlineLimit: 4096, // Archivos menores a 4KB serán inlined
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Divisiones de chunks para mejor caching
            supabase: ['@supabase/supabase-js'],
            react: ['react', 'react-dom', 'react-router-dom'],
            date: ['dayjs', 'date-fns']
          }
        }
      },
      terserOptions: {
        compress: {
          drop_console: mode === 'production' // Elimina console.logs en producción
        }
      }
    },

    // Variables de entorno (prefijo VITE_)
    envPrefix: 'VITE_',

    // Optimización para PWA
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js']
    }
  };
});
