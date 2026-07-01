/**
 * Archivo Principal de la Aplicación
 * 
 * Punto de entrada del servidor backend del sistema de gestión de restaurante.
 * Configura Express, middleware, rutas, y manejo de errores.
 * Implementa conexión a base de datos usando Singleton pattern.
 * Incluye manejo de shutdown graceful para SIGTERM y SIGINT.
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { dbConnection } from './infrastructure/database/DatabaseConnection';
import { logger } from './infrastructure/utils/Logger';
import { ErrorHandler } from './infrastructure/utils/ErrorHandler';
import { sentryService } from './infrastructure/monitoring/SentryService';
import { metricsService } from './infrastructure/monitoring/MetricsService';
import { SentryMiddleware } from './infrastructure/web/middleware/SentryMiddleware';
import { requestIdMiddleware } from './infrastructure/web/middleware/requestId';
import { auditContextMiddleware } from './infrastructure/http/middleware/AuditContextMiddleware';

import customerRoutes from './infrastructure/web/routes/customerRoutes';
import orderRoutes from './infrastructure/web/routes/orderRoutes';
import menuRoutes from './infrastructure/web/routes/menuRoutes';
import authRoutes from './infrastructure/web/routes/authRoutes';
import configRoutes from './infrastructure/web/routes/configRoutes';
import billRoutes from './infrastructure/web/routes/billRoutes';
import employeeRoutes from './infrastructure/web/routes/employeeRoutes';
import roleRoutes from './infrastructure/web/routes/roleRoutes';
import creditNoteRoutes from './infrastructure/web/routes/creditNoteRoutes';
import dashboardRoutes from './infrastructure/web/routes/dashboard.routes';
import metricsRoutes from './infrastructure/web/routes/metricsRoutes';
import categoryRoutes from './infrastructure/web/routes/categoryRoutes';

import { cacheService } from './infrastructure/utils/CacheService';
import { container } from './infrastructure/di/DIContainer';
import { getWhatsAppChatbot, getWhatsAppClient, isWhatsAppEnabled } from './infrastructure/services/whatsapp';
import { whatsAppSocketManager } from './infrastructure/websocket/WhatsAppSocketManager';
import { OrderStatus } from './domain/entities/Order';


// dotenv configured at top level

// Initialize monitoring services
sentryService.init();
metricsService.init();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for express-rate-limit behind reverse proxy/Docker)
app.set('trust proxy', 1);

// Middleware
// Request ID (must be first to ensure all subsequent middleware has access to requestId)
app.use(requestIdMiddleware);

// CORS: En producción solo permite orígenes específicos
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3001'];
logger.info('CORS allowed origins', { allowedOrigins });

// Cabeceras CORS manuales para que INCLUSO errores 500 lleven cabeceras CORS
// Sin esto, el navegador bloquea la lectura de cualquier respuesta de error
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    // Responder inmediatamente a preflight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (como mobile apps o curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        logger.warn('CORS blocked origin', { origin, allowedOrigins });
        // No lanzar Error (causaba 500 sin cabeceras CORS). 
        // Devolver false para rechazar sin crashear.
        callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(compression()); // Enable gzip compression for responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10), // Configurable, default 500 requests/15min
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        res.status(429).json({
            status: 'error',
            message: 'Límite de peticiones alcanzado. Por favor espera un momento.',
            code: 'TOO_MANY_REQUESTS'
        });
    }
});
app.use(limiter);

// Sentry request handler (must be before routes)
app.use(SentryMiddleware.requestHandler);

// Prometheus metrics middleware (must be before routes)
app.use(metricsService.middleware());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Audit context middleware (captures user info for audit logs)
app.use(auditContextMiddleware);

import billingRoutes from './infrastructure/web/routes/billingRoutes';
import whatsappApiRoutes from './infrastructure/web/routes/whatsappApiRoutes';
import exportRoutes from './interfaces/http/routes/exportRoutes';
import maintenanceRoutes from './interfaces/http/routes/maintenanceRoutes';
import auditRoutes from './infrastructure/web/routes/auditRoutes';
import { setupSwagger } from './infrastructure/http/swagger';

// Setup Swagger/OpenAPI Documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/config', configRoutes);
app.use('/api/bills', billRoutes); // CRUD de facturas internas
app.use('/api/billing', billingRoutes); // Generación de XML SRI
app.use('/api/employees', employeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/categories', categoryRoutes); // Categorías de productos
app.use('/api/credit-notes', creditNoteRoutes); // Notas de crédito SRI
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappApiRoutes); // WhatsApp API para frontend
app.use('/api/export', exportRoutes); // Exportación de datos (Excel/CSV)
app.use('/api/maintenance', maintenanceRoutes); // Operaciones de mantenimiento y limpieza
app.use('/api/audit', auditRoutes); // Logs de auditoría (solo admin)

// Metrics endpoint (Prometheus)
app.use('/metrics', metricsRoutes);

app.get('/health', async (req, res) => {
    const cacheStats = cacheService.getStats();
    const dbHealthy = await dbConnection.isHealthy();
    res.json({
        status: 'ok',
        timestamp: new Date(),
        database: dbHealthy ? 'connected' : 'disconnected',
        cache: {
            enabled: true,
            entries: cacheStats.size,
            keys: cacheStats.keys
        },
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        }
    });
});

// Sentry error handler (must be before general error handler)
app.use(SentryMiddleware.errorHandler);

// Global error handler (must be last)
app.use(ErrorHandler.middleware());

// Start Server
const startServer = async () => {
    try {
        logger.info('🚀 Starting server...');

        // Connect to database
        await dbConnection.connect();

        // Start background tasks (Cron Jobs)
        container.getCronService().init();

        // Initialize WhatsApp (Baileys - sin Chromium)
        if (isWhatsAppEnabled()) {
            logger.info('📱 WhatsApp ENABLED (Baileys)');

            const chatbot = getWhatsAppChatbot();
            const whatsappClient = getWhatsAppClient();

            if (whatsappClient) {
                chatbot.setMenuRepository(container.getMenuRepository());

                // Escuchar mensajes entrantes
                whatsappClient.on('message', async (message: any) => {
                    try {
                        await chatbot.processMessage({
                            from: message.from,
                            text: message.text
                        });
                    } catch (error) {
                        logger.error('[WhatsApp] Error processing message', { error });
                    }
                });

                // Conectar automáticamente si hay sesión guardada
                whatsappClient.connect().catch(err => {
                    logger.info('[WhatsApp] No saved session, waiting for QR scan');
                });

                logger.info('📱 WhatsApp Chatbot ready');
            }
        } else {
            logger.info('📱 WhatsApp DISABLED');
        }

        // Crear servidor HTTP
        const server = http.createServer(app);

        // WebSocket para QR en tiempo real
        if (isWhatsAppEnabled()) {
            whatsAppSocketManager.initialize(server);
            logger.info('🔌 WhatsApp WebSocket on /ws/whatsapp');
        }

        // Start listening
        server.listen(PORT, () => {
            logger.info(`✅ Server running on port ${PORT}`);
            logger.info(`🌐 Backend ready at http://localhost:${PORT}`);
            logger.info(`💚 Health check: http://localhost:${PORT}/health`);
            if (isWhatsAppEnabled()) {
                logger.info(`📱 WhatsApp WebSocket: ws://localhost:${PORT}/ws/whatsapp`);
            }
        });
    } catch (err) {
        logger.error('Failed to start server', err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');

    // Stop WhatsApp client if running
    if (isWhatsAppEnabled()) {
        const whatsappClient = getWhatsAppClient();
        if (whatsappClient) {
            logger.info('Stopping WhatsApp client...');
            try {
                await whatsappClient.stop();
            } catch (error) {
                logger.error('Error stopping WhatsApp client', { error });
            }
        }
    }

    // Flush Sentry events
    logger.info('Flushing Sentry events...');
    await sentryService.flush(2000);

    await dbConnection.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');

    // Stop WhatsApp client if running
    if (isWhatsAppEnabled()) {
        const whatsappClient = getWhatsAppClient();
        if (whatsappClient) {
            logger.info('Stopping WhatsApp client...');
            try {
                await whatsappClient.stop();
            } catch (error) {
                logger.error('Error stopping WhatsApp client', { error });
            }
        }
    }

    // Flush Sentry events
    logger.info('Flushing Sentry events...');
    await sentryService.flush(2000);

    await dbConnection.disconnect();
    process.exit(0);
});

startServer(); // Reload trigger to read updated .env variables
