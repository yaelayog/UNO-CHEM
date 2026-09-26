import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': SW baru menunggu sampai `src/lib/pembaruan.ts` mengaktifkannya
      // (saat pemain di menu) — bukan langsung ambil alih di tengah permainan.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'UNO-Chem — Game Kartu Kimia',
        short_name: 'UNO-Chem',
        description:
          'Game kartu edukasi kimia berbasis UNO: belajar golongan & periode unsur sambil bermain.',
        lang: 'id',
        dir: 'ltr',
        categories: ['education', 'games'],
        theme_color: '#0f766e',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
