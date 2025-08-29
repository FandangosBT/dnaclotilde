import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    headers: {
      // Alinha CSP de dev com produção para evitar bloqueios de fontes e uploads
      'Content-Security-Policy':
        "default-src 'self'; " +
        // Vite HMR precisa de eval em dev; mantemos inline para estilos gerados
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        // Explicitamente permitir <link rel=stylesheet> de Google Fonts para evitar fallback de style-src
        "style-src-elem 'self' https://fonts.googleapis.com; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com; " +
        // Permitir HMR (ws:), Google Fonts preconnect, Blob Storage e vercel.com
        "connect-src 'self' ws: https://fonts.googleapis.com https://fonts.gstatic.com https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com https://vercel.com https://api.vercel.com; " +
        "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'html'],
    },
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
