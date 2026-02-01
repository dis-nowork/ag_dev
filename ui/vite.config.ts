import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 80,
    proxy: {
      '/api': 'http://localhost:4001'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 80
  }
})
