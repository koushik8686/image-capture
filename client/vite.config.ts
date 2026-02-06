import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    port: 5173,
    host: true, // Enable network access
    proxy: {
      '/api': 'https://political-cenogenetic-genevieve.ngrok-free.dev',
      '/uploads': 'https://political-cenogenetic-genevieve.ngrok-free.dev', // Changed from images to uploads based on server.js static serve
      '/socket.io': {
        target: 'https://political-cenogenetic-genevieve.ngrok-free.dev',
        ws: true
      }
    }
  }
})
