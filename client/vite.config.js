import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Dev proxy: when running `npm run dev` locally (not Docker),
  // /api requests are forwarded to the Express server on 5001.
  // This keeps CORS simple and mirrors the nginx proxy used in Docker.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
