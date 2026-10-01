import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only proxy - in production, VITE_API_URL env variable is used
    proxy: {
      '/api': 'http://localhost:5000',
      '/upload': 'http://localhost:5000',
      '/dashboard': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})

