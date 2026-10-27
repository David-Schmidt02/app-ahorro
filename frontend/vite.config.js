import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo la API corre aparte (uvicorn en :8000); en producción FastAPI sirve este build
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
