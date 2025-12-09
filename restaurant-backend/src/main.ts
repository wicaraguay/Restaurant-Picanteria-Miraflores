/**
 * Archivo Principal de la Aplicación
 * 
 * Punto de entrada del servidor backend del sistema de gestión de restaurante.
 * Configura Express, middleware, rutas, y manejo de errores.
 * Implementa conexión a base de datos usando Singleton pattern.
 * Incluye manejo de shutdown graceful para SIGTERM y SIGINT.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { dbConnection } from './infrastructure/database/DatabaseConnection';
import { logger } from './infrastructure/utils/Logger';
import { ErrorHandler } from './infrastructure/utils/ErrorHandler';

import customerRoutes from './infrastructure/web/routes/customerRoutes';
import orderRoutes from './infrastructure/web/routes/orderRoutes';
import menuRoutes from './infrastructure/web/routes/menuRoutes';
import authRoutes from './infrastructure/web/routes/authRoutes';
import configRoutes from './infrastructure/web/routes/configRoutes';
import billRoutes from './infrastructure/web/routes/billRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/config', configRoutes);
app.use('/api/bills', billRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        database: dbConnection.isHealthy() ? 'connected' : 'disconnected'
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
