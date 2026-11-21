// Monta a bancada de medição da casa /geo (auditoria/geo) em dist-auditoria/.
// Esta pasta NÃO é publicada: o scripts/publicar.sh só conhece dist-prod.
// Uso: npx vite build --config vite.auditoria.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'auditoria/geo'),
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { outDir: path.resolve(__dirname, 'dist-auditoria'), emptyOutDir: true },
})
