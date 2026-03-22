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
                maxPoolSize: 50,        // Maximum number of connections in the pool
                minPoolSize: 10,        // Minimum number of connections to maintain
            });

            logger.info('✅ MongoDB connected successfully!');
            if (mongoose.connection.db) {
                logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
            }

            // Run index migrations after connection
            await this.runIndexMigrations();

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

    /**
     * Runs index migrations to fix any mismatched index definitions.
     * Specifically drops and recreates the `identification_1` index on customers
     * so it is created with `sparse: true`, allowing multiple docs with empty identification.
     */
    private async runIndexMigrations(): Promise<void> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                logger.warn('⚠️  [Migration] No DB connection, skipping index migrations.');
                return;
            }

            const customersCollection = db.collection('customers');
            const existingIndexes = await customersCollection.listIndexes().toArray();

            const identificationIndex = existingIndexes.find(
                (idx: any) => idx.name === 'identification_1'
            );

            if (identificationIndex) {
                const isSparse = identificationIndex.sparse === true;
                if (!isSparse) {
                    logger.warn('🔧 [Migration] Found non-sparse identification_1 index. Dropping and recreating as sparse...');
                    await customersCollection.dropIndex('identification_1');
                    logger.info('✅ [Migration] Old identification_1 index dropped. Mongoose will recreate as sparse on next ensureIndexes.');
                } else {
                    logger.info('✅ [Migration] identification_1 index is already sparse. No migration needed.');
                }
            } else {
                logger.info('ℹ️  [Migration] identification_1 index not found. Will be created by Mongoose.');
            }

            // Force Mongoose to sync indexes now
            await mongoose.model('Customer').ensureIndexes();
            logger.info('✅ [Migration] Customer indexes synchronized.');

        } catch (error) {
            // Non-fatal: log but don't crash the server
            logger.error('❌ [Migration] Failed to run index migrations:', error);
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
