import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/motion-replay-lab/',
  plugins: [react()],
  server: {
    allowedHosts: ['.ts.net'],
  },
})
