import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/BHEV-website/',
  server: {
    port: 5173,
    // CORS & origin verification for local development
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  },
})
