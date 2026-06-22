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

    // Horarios de atención
    schedule: {
        enabled: {
            type: Boolean,
            default: false  // Por defecto deshabilitado (atiende 24/7)
        },
        timezone: {
            type: String,
            default: 'America/Guayaquil'
        },
        // Horarios por día de la semana (0 = Domingo, 6 = Sábado)
        days: {
            type: [{
                dayOfWeek: {
                    type: Number,
                    min: 0,
                    max: 6,
                    required: true
                },
                dayName: {
                    type: String,
                    enum: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                },
                isOpen: {
                    type: Boolean,
                    default: true
                },
                openTime: {
                    type: String,
                    default: '08:00'  // Formato HH:mm
                },
                closeTime: {
                    type: String,
                    default: '22:00'  // Formato HH:mm
                }
            }],
            default: [
                { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 2, dayName: 'Martes', isOpen: true, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, openTime: '08:00', closeTime: '22:00' },
                { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:00', closeTime: '22:00' }
            ]
        },
        // Mensaje cuando está cerrado
        closedMessage: {
            type: String,
            default: '¡Hola! Gracias por escribirnos.\n\nEn este momento estamos *fuera de horario de atención*.\n\n🕐 Nuestro horario es:\n{schedule}\n\n¡Te esperamos!'
        },
        // Permitir que el cliente deje un mensaje aunque esté cerrado
        allowMessagesWhenClosed: {
            type: Boolean,
            default: true
        },
        // Mensaje de confirmación cuando deja mensaje fuera de horario
        messageReceivedWhenClosed: {
            type: String,
            default: 'Hemos recibido tu mensaje. Te responderemos cuando abramos. ¡Gracias!'
        }
    },

    // Configuración de ubicación/delivery
    location: {
        // Habilitar funciones de ubicación
        enabled: {
            type: Boolean,
            default: false
        },
        // Ubicación del negocio (para cálculo de distancia)
        businessLocation: {
            lat: {
                type: Number,
                default: -2.170998  // Guayaquil por defecto
            },
            lng: {
                type: Number,
                default: -79.922356
            },
            address: {
                type: String,
                default: ''
            }
        },
        // Radio máximo de delivery en km
        maxDeliveryRadiusKm: {
            type: Number,
            default: 10
        },
        // Costo por km (para calcular delivery)
        costPerKm: {
            type: Number,
            default: 0.50
        },
        // Costo mínimo de delivery
        minDeliveryCost: {
            type: Number,
            default: 2.00
        },
        // Mensaje cuando está fuera del área de delivery
        outOfRangeMessage: {
            type: String,
            default: 'Lo sentimos, tu ubicación está fuera de nuestra área de cobertura ({distance}km). Nuestro radio máximo es de {maxRadius}km.'
        },
        // API Key de Google Maps (opcional, se usa si está configurada)
        googleMapsApiKey: {
            type: String,
            default: ''
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
