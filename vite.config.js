import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sin esto, el manifest y el service worker solo se generan en
      // `npm run build` — probar la instalación por WiFi contra
      // `npm run dev` no tendría manifest real que ofrecerle a iOS.
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: [
        'iconos/icono-16.png',
        'iconos/icono-32.png',
        'iconos/icono-180.png',
        'iconos/logo.png',
      ],
      manifest: {
        name: 'CrediDev',
        short_name: 'CrediDev',
        description: 'Gestión moderna de clientes, créditos y cobros',
        theme_color: '#0E0E0D',
        background_color: '#0E0E0D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          // Icono principal: Android lo recorta a la forma del launcher, por eso
          // va con fondo sólido y el rombo dentro de la zona segura.
          {
            src: 'iconos/icono-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cachea la app para que abra offline; los datos reales los maneja
        // la persistencia offline de Firestore, no el service worker.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
