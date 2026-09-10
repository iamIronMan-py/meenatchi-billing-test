import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 10000,
    allowedHosts: ['meenatchi-billing-test-1.onrender.com'],
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 10000,
    allowedHosts: ['meenatchi-billing-test-1.onrender.com'],
  },
})
