/**
 * Repository para configuración del Chatbot
 */

import { ChatbotConfigModel } from '../database/schemas/ChatbotConfigSchema';
import { logger } from '../utils/Logger';

export interface BankAccount {
    bankName: string;
    accountType: 'Ahorros' | 'Corriente';
    accountNumber: string;
    accountHolder: string;
    identification: string;
}

export interface PaymentInfo {
    acceptsCash: boolean;
    acceptsTransfer: boolean;
    transferMessage: string;
    banks: BankAccount[];
}

export interface ChatbotConfig {
    businessName: string;
    messages: {
        welcome: string;
        menuHeader: string;
        menuFooter: string;
        askName: string;
        askAddress: string;
        orderConfirmed: string;
        orderCancelled: string;
        itemAdded: string;
        help: string;
        error: string;
        noMenu: string;
    };
    estimatedDeliveryTime: string;
    paymentInfo: PaymentInfo;
    settings: {
        autoReplyEnabled: boolean;
        askForAddress: boolean;
        askForName: boolean;
        sendConfirmationMessage: boolean;
    };
    keywords: {
        greetings: string[];
        menu: string[];
        order: string[];
        cancel: string[];
        confirm: string[];
    };
}

export class ChatbotConfigRepository {
    /**
     * Obtiene la configuración del chatbot (crea una por defecto si no existe)
     */
    async get(): Promise<ChatbotConfig> {
        try {
            let config = await ChatbotConfigModel.findOne({ configId: 'default' });
            
            if (!config) {
                // Crear configuración por defecto
                config = await ChatbotConfigModel.create({ configId: 'default' });
                logger.info('[ChatbotConfigRepository] Created default config');
            }
            
            const defaultConfig = this.getDefaultConfig();
            return {
                businessName: config.businessName || defaultConfig.businessName,
                messages: config.messages || defaultConfig.messages,
                estimatedDeliveryTime: config.estimatedDeliveryTime || defaultConfig.estimatedDeliveryTime,
                paymentInfo: config.paymentInfo || defaultConfig.paymentInfo,
                settings: config.settings || defaultConfig.settings,
                keywords: config.keywords || defaultConfig.keywords
            } as ChatbotConfig;
        } catch (error) {
            logger.error('[ChatbotConfigRepository] Error getting config', { error });
            // Retornar configuración por defecto en caso de error
            return this.getDefaultConfig();
        }
    }

    /**
     * Actualiza la configuración del chatbot
     */
    async update(data: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
        try {
            const config = await ChatbotConfigModel.findOneAndUpdate(
                { configId: 'default' },
                {
                    ...data,
                    updatedAt: new Date()
                },
                { new: true, upsert: true }
            );

            if (!config) {
                throw new Error('Failed to update config');
            }

            logger.info('[ChatbotConfigRepository] Config updated');

            const defaultConfig = this.getDefaultConfig();
            return {
                businessName: config.businessName || defaultConfig.businessName,
                messages: config.messages || defaultConfig.messages,
                estimatedDeliveryTime: config.estimatedDeliveryTime || defaultConfig.estimatedDeliveryTime,
                paymentInfo: config.paymentInfo || defaultConfig.paymentInfo,
                settings: config.settings || defaultConfig.settings,
                keywords: config.keywords || defaultConfig.keywords
            } as ChatbotConfig;
        } catch (error) {
            logger.error('[ChatbotConfigRepository] Error updating config', { error });
            throw error;
        }
    }
    
    /**
     * Configuración por defecto
     */
    private getDefaultConfig(): ChatbotConfig {
        return {
            businessName: 'Mi Restaurante',
            messages: {
                welcome: '¡Hola! Bienvenido a {businessName}\n\n¿Qué deseas hacer hoy?',
                menuHeader: 'NUESTRO MENÚ',
                menuFooter: 'Para ordenar escribe la cantidad y el producto.',
                askName: '¿A nombre de quién va el pedido?',
                askAddress: '¿Cuál es tu dirección para el delivery?',
                orderConfirmed: '¡PEDIDO CONFIRMADO!\n\nTiempo estimado: {estimatedTime}',
                orderCancelled: 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.',
                itemAdded: 'Agregado: {quantity}x {item}',
                help: '¿Necesitas ayuda? Escribe "Menu" para ver productos.',
                error: 'Hubo un error. Por favor intenta de nuevo.',
                noMenu: 'No hay productos disponibles en este momento.'
            },
            estimatedDeliveryTime: '30-45 minutos',
            paymentInfo: {
                acceptsCash: true,
                acceptsTransfer: true,
                transferMessage: 'Envía el comprobante de pago a este mismo número.',
                banks: []
            },
            settings: {
                autoReplyEnabled: true,
                askForAddress: true,
                askForName: true,
                sendConfirmationMessage: true
            },
            keywords: {
                greetings: ['hola', 'hi', 'hello', 'buenas'],
                menu: ['menu', 'menú', 'carta', 'productos'],
                order: ['pedir', 'ordenar', 'quiero'],
                cancel: ['cancelar', 'no quiero', 'salir'],
                confirm: ['listo', 'confirmar', 'si', 'ok']
            }
        };
    }
}

// Singleton
let instance: ChatbotConfigRepository | null = null;

export function getChatbotConfigRepository(): ChatbotConfigRepository {
    if (!instance) {
        instance = new ChatbotConfigRepository();
    }
    return instance;
}
