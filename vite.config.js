import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite only builds the React renderer.
// Electron main + preload are copied as-is by scripts/copy-electron.js
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: './',
  build: { outDir: 'dist' },
})
