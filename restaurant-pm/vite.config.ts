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
        manifest: {
          name: 'Picantería Miraflores',
          short_name: 'Picantería',
          description: 'Sistema de gestión del restaurante — pedidos, cocina y facturación',
          lang: 'es',
          start_url: '/admin',
          // Scope /admin: la invitación a "Instalar app" solo aparece a quien
          // navega el ADMIN (personal). Los clientes en la web pública (/) no
          // ven ningún aviso de instalación.
          scope: '/admin',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#1E40AF',
          background_color: '#ffffff',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ],
          // Mantener presionado el ícono de la app → accesos directos
          shortcuts: [
            {
              name: 'Tomar Pedido (POS)',
              short_name: 'POS',
              url: '/admin/orders/pos',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            },
            {
              name: 'Central de Cocina',
              short_name: 'Cocina',
              url: '/admin/kitchen',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            },
            {
              name: 'Pedidos en Curso',
              short_name: 'Pedidos',
              url: '/admin/orders/tablero',
              icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
            }
          ]
        },
        workbox: {
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
              options: { cacheName: 'cdn-cache' }
            },
            {
              // Fuentes de Google: cambian casi nunca
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              // Imágenes (fotos del menú, logos): cache con expiración semanal
              urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 7 }
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
