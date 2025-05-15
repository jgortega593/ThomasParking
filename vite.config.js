import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';
import path from 'path';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    base: '/', // Configuración base para Vercel (sin subruta)
    plugins: [
      react({
        jsxRuntime: 'automatic',
        babel: {
          plugins: ['@babel/plugin-transform-react-jsx']
        }
      }),
      visualizer({
        gzipSize: true,
        brotliSize: true,
        open: mode === 'analyze'
      }),
      viteImagemin({
        gifsicle: { optimizationLevel: 3 },
        optipng: { optimizationLevel: 5 },
        mozjpeg: { quality: 75 },
        webp: { quality: 75 }
      })
    ],
    server: {
      open: false,
      port: 5173,
      host: true
    },
    define: {
      'process.env': {
        VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        BASE_URL: JSON.stringify(
          mode === 'production' 
            ? 'https://thomas-parking.vercel.app'  // Dominio de Vercel
            : 'http://localhost:5173'  // Desarrollo local
        )
      }
    },
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        react: path.resolve('./node_modules/react'),
        'react-dom': path.resolve('./node_modules/react-dom')
      }
    },
    build: {
      target: 'esnext',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          globals: {
            'react-router-dom': 'ReactRouterDOM'
          },
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          }
        }
      },
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      }
    },
    css: {
      devSourcemap: mode === 'development',
      modules: {
        localsConvention: 'camelCaseOnly'
      }
    }
  });
};
