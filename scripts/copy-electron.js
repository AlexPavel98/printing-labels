// Copies electron main + preload to dist-electron/ without any bundling.
// This avoids vite-plugin-electron generating unexpected require() calls.
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'electron')
const dst = path.join(__dirname, '..', 'dist-electron')

fs.mkdirSync(dst, { recursive: true })
fs.copyFileSync(path.join(src, 'main.js'),    path.join(dst, 'main.js'))
fs.copyFileSync(path.join(src, 'preload.js'), path.join(dst, 'preload.js'))

console.log('✓ Electron files copied to dist-electron/')
