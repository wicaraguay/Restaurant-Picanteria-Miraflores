/**
 * Schema para configuración del Chatbot de WhatsApp
 */

import mongoose from 'mongoose';

const chatbotConfigSchema = new mongoose.Schema({
    // Identificador único (siempre será 'default')
    configId: {
        type: String,
        default: 'default',
        unique: true
    },

    // Información del negocio
    businessName: {
        type: String,
        default: 'Mi Restaurante'
    },

    // Mensajes personalizables
    messages: {
        welcome: {
            type: String,
            default: '¡Hola! Bienvenido a {businessName}\n\n¿Qué deseas hacer hoy?'
        },
        menuHeader: {
            type: String,
            default: 'NUESTRO MENÚ'
        },
        menuFooter: {
            type: String,
            default: 'Para ordenar escribe la cantidad y el producto.'
        },
        askName: {
            type: String,
            default: '¿A nombre de quién va el pedido?'
        },
        askAddress: {
            type: String,
            default: '¿Cuál es tu dirección para el delivery?'
        },
        orderConfirmed: {
            type: String,
            default: '¡PEDIDO CONFIRMADO!\n\nTiempo estimado: {estimatedTime}'
        },
        orderCancelled: {
            type: String,
            default: 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.'
        },
        itemAdded: {
            type: String,
            default: 'Agregado: {quantity}x {item}'
        },
        help: {
            type: String,
            default: '¿Necesitas ayuda? Escribe "Menu" para ver productos.'
        },
        error: {
            type: String,
            default: 'Hubo un error. Por favor intenta de nuevo.'
        },
        noMenu: {
            type: String,
            default: 'No hay productos disponibles en este momento.'
        }
    },

    // Configuración de tiempos
    estimatedDeliveryTime: {
        type: String,
        default: '30-45 minutos'
    },

    // Información de pago
    paymentInfo: {
        acceptsCash: {
            type: Boolean,
            default: true
        },
        acceptsTransfer: {
            type: Boolean,
            default: true
        },
        transferMessage: {
            type: String,
            default: 'Envía el comprobante de pago a este mismo número.'
        },
        banks: [{
            bankName: {
                type: String,
                required: true
            },
            accountType: {
                type: String,
                enum: ['Ahorros', 'Corriente'],
                default: 'Ahorros'
            },
            accountNumber: {
                type: String,
                required: true
            },
            accountHolder: {
                type: String,
                required: true
            },
            identification: {
                type: String,
                required: true
            }
        }]
    },

    // Configuración de comportamiento
    settings: {
        autoReplyEnabled: {
            type: Boolean,
            default: true
        },
        askForAddress: {
            type: Boolean,
            default: true
        },
        askForName: {
            type: Boolean,
            default: true
        },
        sendConfirmationMessage: {
            type: Boolean,
            default: true
        }
    },

    // Palabras clave personalizables
    keywords: {
        greetings: {
            type: [String],
            default: ['hola', 'hi', 'hello', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches']
        },
        menu: {
            type: [String],
            default: ['menu', 'menú', 'carta', 'ver menu', 'productos', 'que tienen']
        },
        order: {
            type: [String],
            default: ['pedir', 'ordenar', 'quiero', 'pedido']
        },
        cancel: {
            type: [String],
            default: ['cancelar', 'no quiero', 'salir', 'terminar']
        },
        confirm: {
            type: [String],
            default: ['listo', 'confirmar', 'si', 'ok']
        }
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export const ChatbotConfigModel = mongoose.model('ChatbotConfig', chatbotConfigSchema);
