/**
 * Conexión a Base de Datos - Patrón Singleton
 * 
 * Este archivo implementa el patrón Singleton para la conexión a MongoDB.
 * Garantiza que solo exista una conexión a la base de datos en toda la aplicación.
 * Maneja la conexión a MongoDB local, MongoDB Atlas, o MongoDB en memoria (para testing).
 * Incluye métodos para verificar el estado de salud de la conexión y desconexión graceful.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { logger } from '../utils/Logger';

/**
 * Clase DatabaseConnection - Implementa patrón Singleton
 * Gestiona la conexión única a MongoDB en toda la aplicación
 */
export class DatabaseConnection {
    private static instance: DatabaseConnection;
    private mongoServer?: MongoMemoryServer;
    private isConnected: boolean = false;

    private constructor() { }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            logger.info('Database already connected');
            return;
        }

        // Default to local MongoDB if MONGODB_URI is not set in .env
        // TO SWITCH TO MONGO ATLAS (PRODUCTION):
        // 1. Create a cluster on MongoDB Atlas
        // 2. Get the connection string (it looks like: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority)
        // 3. Update your .env file: MONGODB_URI=your_atlas_connection_string
        let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant-pm';

        // Connection event listeners
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            logger.info('✅ Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            this.isConnected = false;
            logger.error('❌ Mongoose connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('⚠️  Mongoose disconnected from MongoDB');
        });

        // Enable mongoose debug mode in development
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

        try {
            logger.info('🔄 Attempting to connect to MongoDB...');
            logger.info(`📍 URI: ${uri}`);

            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            logger.info('✅ MongoDB connected successfully!');
            if (mongoose.connection.db) {
                logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
            }

        } catch (error) {
            logger.warn(`⚠️  Local MongoDB connection failed: ${(error as Error).message}`);
            logger.info('🔄 Starting In-Memory MongoDB for testing...');

            try {
                this.mongoServer = await MongoMemoryServer.create();
                uri = this.mongoServer.getUri();
                logger.info(`📍 In-Memory MongoDB URI: ${uri}`);

                await mongoose.connect(uri);

                logger.info('✅ In-Memory MongoDB connected successfully!');
                logger.info('💡 IMPORTANT: You can connect MongoDB Compass to this URI:');
                logger.info(`    ${uri}`);
                logger.warn('⚠️  Note: This is temporary and will be lost when the server stops.');

            } catch (memError) {
                logger.error('❌ Failed to start In-Memory MongoDB', memError);
                throw memError;
            }
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        await mongoose.disconnect();

        if (this.mongoServer) {
            await this.mongoServer.stop();
        }

        this.isConnected = false;
        logger.info('Database disconnected');
    }

    public isHealthy(): boolean {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    public getConnection() {
        return mongoose.connection;
    }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();
