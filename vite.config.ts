import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  // es2022: o pdfjs-dist usa top-level await; navegadores atuais suportam.
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // O pdfjs-dist NÃO fica aqui de propósito. Um pedaço nomeado nesta lista entra no grafo
          // do primeiro acesso, e por isso o leitor de PDF (294 kB) era baixado por todo mundo que
          // abria o site, inclusive por quem só ia ver a tela de entrada. Fora da lista, o Rollup o
          // separa sozinho como pedaço que chega na hora em que alguém envia um PDF.
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  esbuild: { target: 'es2022' },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
