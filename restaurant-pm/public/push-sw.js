/**
 * Manejador de Web Push del Service Worker.
 * Se importa dentro del SW generado por vite-plugin-pwa (workbox.importScripts).
 *
 * Recibe las notificaciones push del backend (alertas de WhatsApp) y las
 * muestra como notificación nativa del sistema — funciona con el navegador
 * cerrado o la app en segundo plano.
 */

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'Picantería Miraflores', body: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'Picantería Miraflores';
    const options = {
        body: data.body || '',
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'picanteria-alert', // agrupa notificaciones repetidas
        renotify: true,                       // vuelve a sonar/vibrar aunque agrupe
        data: { url: data.url || '/admin' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Si la app ya está abierta, enfocarla y navegar
            for (const client of windowClients) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Si no, abrir una ventana nueva
            return clients.openWindow(targetUrl);
        })
    );
});
