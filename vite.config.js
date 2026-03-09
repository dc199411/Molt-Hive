import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/ollama': {
                target: process.env.VITE_OLLAMA_URL || 'http://localhost:11434',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ollama/, ''),
            }
        }
    }
})
