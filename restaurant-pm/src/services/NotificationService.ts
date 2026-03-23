/**
 * @file NotificationService.ts
 * @description Utility service for playing notification sounds.
 */

class NotificationService {
    private static instance: NotificationService;
    private bellSound: HTMLAudioElement | null = null;
    private readySound: HTMLAudioElement | null = null;

    private constructor() {
        // Kitchen bell sound (Short, distinct)
        this.bellSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        // Ready sound (Slightly different or same)
        this.readySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Plays a bell sound for new orders
     */
    public playNewOrderSound() {
        if (this.bellSound) {
            this.bellSound.currentTime = 0;
            this.bellSound.play().catch(e => console.warn('Audio play blocked:', e));
        }
    }

    /**
     * Plays a sound for ready orders
     */
    public playOrderReadySound() {
        if (this.readySound) {
            this.readySound.currentTime = 0;
            this.readySound.play().catch(e => console.warn('Audio play blocked:', e));
        }
    }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
