/**
 * Archivo Principal de la Aplicación
 * 
 * Punto de entrada del servidor backend del sistema de gestión de restaurante.
 * Configura Express, middleware, rutas, y manejo de errores.
 * Implementa conexión a base de datos usando Singleton pattern.
 * Incluye manejo de shutdown graceful para SIGTERM y SIGINT.
 */

import 'dotenv/config';
console.log('DEBUG: main.ts is starting...');
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { dbConnection } from './infrastructure/database/DatabaseConnection';
import { logger } from './infrastructure/utils/Logger';
import { ErrorHandler } from './infrastructure/utils/ErrorHandler';

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
import { cacheService } from './infrastructure/utils/CacheService';
import { container } from './infrastructure/di/DIContainer';


// dotenv configured at top level

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression()); // Enable gzip compression for responses
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10000, // Aumentado significativamente para evitar bloqueos por polling (5s/10s)
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        res.status(429).json({
            status: 'error',
            message: 'Límite de peticiones alcanzado (10,000 / 15min). Por favor espera un momento.',
            code: 'TOO_MANY_REQUESTS'
        });
    }
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

import billingRoutes from './infrastructure/web/routes/billingRoutes';

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
app.use('/api/credit-notes', creditNoteRoutes); // Notas de crédito SRI
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
    const cacheStats = cacheService.getStats();
    res.json({
        status: 'ok',
        timestamp: new Date(),
        database: dbConnection.isHealthy() ? 'connected' : 'disconnected',
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


        // Start listening
        app.listen(PORT, () => {
            logger.info(`✅ Server running on port ${PORT}`);
            logger.info(`🌐 Backend ready at http://localhost:${PORT}`);
            logger.info(`💚 Health check: http://localhost:${PORT}/health`);
        });
    } catch (err) {
        logger.error('Failed to start server', err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await dbConnection.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await dbConnection.disconnect();
    process.exit(0);
});

startServer();
