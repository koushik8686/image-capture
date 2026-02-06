import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // Enable network access
    proxy: {
      '/api': 'http://localhost:3001',
      '/images': 'http://localhost:3001',
    }
  }
})
