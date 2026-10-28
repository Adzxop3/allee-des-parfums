import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Autorise l'import de ../shared (code commun au client et au serveur)
    fs: { allow: ['..'] },
    // Les appels /api/... sont redirigés vers le serveur Express
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
