/**
 * Push Service — activa/desactiva las notificaciones Web Push de este dispositivo.
 *
 * Flujo: pedir permiso al usuario → suscribir el navegador con la clave pública
 * VAPID del backend → registrar la suscripción en el servidor. Desde entonces,
 * el backend puede notificar a este dispositivo aunque la app esté cerrada.
 */

import { apiService } from '../api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

class PushService {
    /** ¿Este navegador soporta Web Push? */
    public isSupported(): boolean {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }

    /** Estado del permiso de notificaciones: 'granted' | 'denied' | 'default' */
    public getPermission(): NotificationPermission | 'unsupported' {
        return this.isSupported() ? Notification.permission : 'unsupported';
    }

    /** ¿Este dispositivo ya está suscrito? */
    public async isSubscribed(): Promise<boolean> {
        if (!this.isSupported()) return false;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            return !!subscription;
        } catch {
            return false;
        }
    }

    /**
     * Activa las notificaciones en este dispositivo.
     * @returns 'subscribed' | 'denied' | 'unsupported' | 'disabled' (backend sin VAPID)
     */
    public async subscribe(): Promise<'subscribed' | 'denied' | 'unsupported' | 'disabled'> {
        if (!this.isSupported()) return 'unsupported';

        // 1. Clave pública del backend
        const keyInfo = await apiService.get<{ enabled: boolean; publicKey: string | null }>('/push/public-key');
        if (!keyInfo?.enabled || !keyInfo.publicKey) return 'disabled';

        // 2. Permiso del usuario (el navegador muestra el diálogo)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return 'denied';

        // 3. Suscribir el navegador
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey)
            });
        }

        // 4. Registrar en el backend
        await apiService.post('/push/subscribe', subscription.toJSON());
        return 'subscribed';
    }

    /** Desactiva las notificaciones en este dispositivo */
    public async unsubscribe(): Promise<void> {
        if (!this.isSupported()) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await apiService.post('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => { /* noop */ });
            await subscription.unsubscribe();
        }
    }
}

export const pushService = new PushService();
