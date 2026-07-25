import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
      ],
      manifest: {
        name: "Cobro Diario",
        short_name: "Cobro Diario",
        description: "Gestion de clientes, creditos y cobros diarios",
        theme_color: "#1F3A5F",
        background_color: "#F1EFE8",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Cachea la app para que abra offline; los datos reales los maneja
        // la persistencia offline de Firestore, no el service worker.
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
