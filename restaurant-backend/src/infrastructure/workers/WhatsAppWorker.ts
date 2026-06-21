/**
 * @file WhatsAppWorker.ts
 * @description Worker para operaciones pesadas de WhatsApp usando BullMQ
 *
 * Maneja operaciones asíncronas como envío de mensajes bulk,
 * evitando bloquear el proceso principal del backend.
 */

import { Worker, Queue, Job } from 'bullmq';
import { logger } from '../utils/Logger';
import { getWhatsAppClient, isWhatsAppEnabled } from '../services/whatsapp/WhatsAppWebClient';

const QUEUE_NAME = 'whatsapp-operations';

// Configuración de conexión Redis
const getRedisConnection = () => {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    return { host, port, password };
};

// Cola de operaciones de WhatsApp
let whatsAppQueue: Queue | null = null;

/**
 * Obtiene o crea la cola de WhatsApp
 */
export function getWhatsAppQueue(): Queue | null {
    if (!isWhatsAppEnabled()) {
        return null;
    }

    if (!whatsAppQueue) {
        try {
            whatsAppQueue = new Queue(QUEUE_NAME, {
                connection: getRedisConnection(),
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50
                }
            });
            logger.info('[WhatsAppWorker] Queue initialized');
        } catch (error) {
            logger.warn('[WhatsAppWorker] Failed to initialize queue (Redis may not be available)', { error });
            return null;
        }
    }

    return whatsAppQueue;
}

/**
 * Worker de WhatsApp para procesar jobs
 */
export class WhatsAppWorker {
    private worker: Worker | null = null;
    private static instance: WhatsAppWorker;

    private constructor() {}

    public static getInstance(): WhatsAppWorker {
        if (!WhatsAppWorker.instance) {
            WhatsAppWorker.instance = new WhatsAppWorker();
        }
        return WhatsAppWorker.instance;
    }

    /**
     * Inicia el worker
     */
    public start(): void {
        if (!isWhatsAppEnabled()) {
            logger.info('[WhatsAppWorker] WhatsApp disabled, skipping worker');
            return;
        }

        try {
            this.worker = new Worker(
                QUEUE_NAME,
                async (job: Job) => this.processJob(job),
                {
                    connection: getRedisConnection(),
                    concurrency: 5, // Procesar hasta 5 jobs en paralelo
                    limiter: {
                        max: 10,
                        duration: 1000 // Máximo 10 mensajes por segundo
                    }
                }
            );

            this.worker.on('completed', (job) => {
                logger.debug(`[WhatsAppWorker] Job ${job.id} completed`, { name: job.name });
            });

            this.worker.on('failed', (job, err) => {
                logger.error(`[WhatsAppWorker] Job ${job?.id} failed`, {
                    name: job?.name,
                    error: err.message
                });
            });

            this.worker.on('error', (err) => {
                logger.error('[WhatsAppWorker] Worker error', { error: err.message });
            });

            logger.info('[WhatsAppWorker] Worker started successfully');
        } catch (error) {
            logger.warn('[WhatsAppWorker] Failed to start worker (Redis may not be available)', { error });
        }
    }

    /**
     * Procesa un job de la cola
     */
    private async processJob(job: Job): Promise<any> {
        const client = getWhatsAppClient();

        if (!client || !client.isEnabled()) {
            throw new Error('WhatsApp client not available or not ready');
        }

        switch (job.name) {
            case 'send-message':
                return this.handleSendMessage(job.data);

            case 'send-bulk':
                return this.handleSendBulk(job.data);

            case 'send-template':
                return this.handleSendTemplate(job.data);

            default:
                throw new Error(`Unknown job type: ${job.name}`);
        }
    }

    /**
     * Envía un mensaje individual
     */
    private async handleSendMessage(data: { to: string; message: string }): Promise<any> {
        const client = getWhatsAppClient();
        if (!client) throw new Error('WhatsApp client not available');

        const result = await client.sendText(data.to, data.message);
        return result;
    }

    /**
     * Envía mensajes en bulk
     */
    private async handleSendBulk(data: { messages: Array<{ to: string; message: string }> }): Promise<any> {
        const client = getWhatsAppClient();
        if (!client) throw new Error('WhatsApp client not available');

        const results = [];

        for (const msg of data.messages) {
            try {
                // Delay entre mensajes para evitar rate limiting de WhatsApp
                await new Promise(resolve => setTimeout(resolve, 500));

                const result = await client.sendText(msg.to, msg.message);
                results.push({ to: msg.to, success: result.success, messageId: result.messageId });
            } catch (error: any) {
                results.push({ to: msg.to, success: false, error: error.message });
            }
        }

        return { sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
    }

    /**
     * Envía un mensaje con template (variables)
     */
    private async handleSendTemplate(data: {
        to: string;
        template: string;
        variables: Record<string, string>
    }): Promise<any> {
        const client = getWhatsAppClient();
        if (!client) throw new Error('WhatsApp client not available');

        // Reemplazar variables en el template
        let message = data.template;
        for (const [key, value] of Object.entries(data.variables)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return client.sendText(data.to, message);
    }

    /**
     * Detiene el worker
     */
    public async stop(): Promise<void> {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
            logger.info('[WhatsAppWorker] Worker stopped');
        }
    }
}

// ==================== Helper Functions ====================

/**
 * Encola un mensaje para envío asíncrono
 */
export async function queueWhatsAppMessage(to: string, message: string): Promise<string | null> {
    const queue = getWhatsAppQueue();
    if (!queue) {
        logger.warn('[WhatsAppWorker] Queue not available, sending synchronously');
        // Fallback: enviar sincrónicamente
        const client = getWhatsAppClient();
        if (client) {
            await client.sendText(to, message);
        }
        return null;
    }

    const job = await queue.add('send-message', { to, message });
    return job.id || null;
}

/**
 * Encola múltiples mensajes para envío en bulk
 */
export async function queueBulkMessages(messages: Array<{ to: string; message: string }>): Promise<string | null> {
    const queue = getWhatsAppQueue();
    if (!queue) {
        logger.warn('[WhatsAppWorker] Queue not available for bulk send');
        return null;
    }

    const job = await queue.add('send-bulk', { messages }, {
        priority: 2 // Menor prioridad que mensajes individuales
    });
    return job.id || null;
}

/**
 * Encola un mensaje con template
 */
export async function queueTemplateMessage(
    to: string,
    template: string,
    variables: Record<string, string>
): Promise<string | null> {
    const queue = getWhatsAppQueue();
    if (!queue) {
        logger.warn('[WhatsAppWorker] Queue not available for template message');
        return null;
    }

    const job = await queue.add('send-template', { to, template, variables });
    return job.id || null;
}

// Exportar singleton
export const whatsAppWorker = WhatsAppWorker.getInstance();
