import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites from /<repo-name>/, so every root-relative
// path (including the PWA manifest below) needs that prefix. Set to '/' if you
// deploy somewhere that serves from the domain root instead (Vercel, Netlify, a
// custom domain on Pages, etc).
const base = '/split/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Split',
        short_name: 'Split',
        description: 'Simple expense sharing with friends',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#EFEEE7',
        theme_color: '#EFEEE7',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
