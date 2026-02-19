import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', 'electron', 'path', 'fs', 'os'],
              output: { format: 'cjs', entryFileNames: '[name].js' },
            },
          },
        },
      },
      {
        entry: 'electron/preload.js',
        onstart: (o) => o.reload(),
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: { format: 'cjs', entryFileNames: '[name].js' },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: './',
})
