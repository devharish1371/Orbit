import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const base =
    process.env.VITE_BASE ??
    loadEnv(mode, process.cwd(), 'VITE_').VITE_BASE ??
    '/'
  return {
    base,
    plugins: [
      {
        name: 'orbit-production-csp',
        apply: 'build',
        transformIndexHtml() {
          return [
            {
              tag: 'meta',
              attrs: {
                'http-equiv': 'Content-Security-Policy',
                content:
                  "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org; img-src 'self' data: blob: https://*.supabase.co https://tiles.openfreemap.org; media-src 'self' blob: https://*.supabase.co; font-src 'self' data:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'none'",
              },
              injectTo: 'head',
            },
          ]
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        // Native updates ship as APKs. Do not register a service worker in Capacitor.
        disable: base === './',
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['orbit.svg'],
        manifest: {
          name: 'Orbit',
          short_name: 'Orbit',
          description: 'A private space for the two of you.',
          theme_color: '#0B0B12',
          background_color: '#0B0B12',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'icons/orbit-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/orbit-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/orbit-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Defer the map and its worker until Map opens; tiles remain network-only.
          globIgnores: ['**/maplibre*', '**/MapPage-*'],
          runtimeCaching: [],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/rest\//,
            /^\/auth\//,
            /^\/storage\//,
            /^\/functions\//,
          ],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'maplibre', test: /node_modules[\\/]maplibre-gl/ },
            ],
          },
        },
      },
    },
  }
})
