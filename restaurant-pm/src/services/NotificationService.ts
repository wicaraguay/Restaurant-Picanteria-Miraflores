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

    /**
     * Plays a distinct double-tone for incoming WhatsApp customer messages.
     * Generado con Web Audio (sin asset externo) para diferenciarse claramente
     * de los sonidos de cocina.
     */
    public playWhatsAppMessageSound() {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const playTone = (freq: number, startAt: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
                gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + startAt + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + startAt);
                osc.stop(ctx.currentTime + startAt + duration + 0.05);
            };

            // Doble tono ascendente tipo "mensaje"
            playTone(880, 0, 0.18);
            playTone(1174, 0.16, 0.22);

            // Liberar el contexto cuando termine
            setTimeout(() => ctx.close().catch(() => { /* noop */ }), 800);
        } catch (e) {
            console.warn('WhatsApp sound blocked:', e);
        }
    }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
