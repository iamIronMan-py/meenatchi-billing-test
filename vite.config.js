import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 10000,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 10000,
  },
})
