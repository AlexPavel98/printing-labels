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
        // Main process
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/main.js',
              formats: ['cjs'],
            },
            rollupOptions: {
              external: [
                'better-sqlite3',
                'electron',
                'path',
                'fs',
                'os',
                'child_process',
                'crypto',
                'http',
                'https',
                'url',
                'util',
              ],
              output: {
                entryFileNames: 'main.js',
              },
            },
          },
        },
      },
      {
        // Preload script
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.js',
              formats: ['cjs'],
            },
            rollupOptions: {
              external: ['electron'],
              output: {
                entryFileNames: 'preload.js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
})
