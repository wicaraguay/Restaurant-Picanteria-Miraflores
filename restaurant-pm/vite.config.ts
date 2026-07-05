import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate', // Deploy nuevo → todos los dispositivos se actualizan al abrir
        includeAssets: ['icon.png', 'apple-touch-icon.png'],
        // El manifest NO se genera ni se inyecta aquí: vive como archivo estático
        // (public/manifest.webmanifest) y su <link> lo agrega AdminApp SOLO en
        // rutas /admin. Así Chrome nunca ofrece "Instalar app" a los clientes en
        // la web pública — el scope del manifest no controla eso, solo la
        // presencia del <link> en la página lo hace.
        manifest: false,
        workbox: {
          // Manejador de notificaciones Web Push (alertas de WhatsApp)
          importScripts: ['push-sw.js'],
          // SPA: cualquier navegación cae en index.html (React Router resuelve)
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
          runtimeCaching: [
            {
              // REGLA DE ORO DEL POS: los datos del API JAMÁS se cachean.
              // Pedidos, precios y facturas siempre frescos del servidor.
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              // Tailwind CDN: cachear para que el estilo cargue instantáneo
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdn-cache',
                // CRÍTICO cross-origin: los <script> de otro dominio dan respuestas
                // "opacas" (status 0) que Workbox NO cachea sin esta autorización
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // Fuentes de Google: cambian casi nunca
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              // Imágenes de Cloudinary (fotos del menú): las URLs son INMUTABLES
              // (llevan versión en la ruta) → cache agresivo de 30 días.
              // cacheableResponse [0,200] es OBLIGATORIO: los <img> cross-origin
              // producen respuestas opacas que Workbox descarta por defecto —
              // sin esto la regla existía pero no cacheaba NADA.
              urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cloudinary-images',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true }
              }
            },
            {
              // Resto de imágenes (otros orígenes): cache semanal
              urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
