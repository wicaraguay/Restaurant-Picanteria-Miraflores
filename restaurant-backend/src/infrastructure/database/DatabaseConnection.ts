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
     * Runs index migrations using DIRECT MongoDB API (no Mongoose model needed).
     *
     * WHY: mongoose.model().ensureIndexes() fails in production because the model
     * is not registered yet when DatabaseConnection runs. Direct collection API avoids this.
     *
     * FIXES:
     * 1. identification_1: Was unique+non-sparse -> must be unique+sparse (allows multiple without ID)
     * 2. email_1: Was unique -> must be non-unique (email is optional, not a unique key for customers)
     */
    private async runIndexMigrations(): Promise<void> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                logger.warn('[Migration] No DB connection, skipping.');
                return;
            }

            const col = db.collection('customers');
            const indexes = await col.listIndexes().toArray();

            // ── FIX 1: identification_1 must be unique + sparse ──────────────────
            const identificationIdx = indexes.find((i: any) => i.name === 'identification_1');
            if (identificationIdx && identificationIdx.sparse !== true) {
                logger.warn('[Migration] Dropping old non-sparse identification_1 index...');
                await col.dropIndex('identification_1');
                logger.info('[Migration] identification_1 dropped.');
            }

            // Clean up documents with identification:'' or null so the sparse index works
            const idCleanup = await col.updateMany(
                { identification: { $in: ['', null] } },
                { $unset: { identification: '' } }
            );
            if (idCleanup.modifiedCount > 0) {
                logger.info(`[Migration] Cleaned ${idCleanup.modifiedCount} customer(s) with empty identification.`);
            }

            // Recreate identification index correctly (idempotent)
            const indexesAfterDrop = await col.listIndexes().toArray();
            const hasCorrectIdIdx = indexesAfterDrop.some(
                (i: any) => i.name === 'identification_1' && i.sparse === true
            );
            if (!hasCorrectIdIdx) {
                await col.createIndex(
                    { identification: 1 },
                    { unique: true, sparse: true, name: 'identification_1' }
                );
                logger.info('[Migration] Sparse unique index on identification created.');
            } else {
                logger.info('[Migration] identification_1 already correct.');
            }

            // ── FIX 2: email_1 must be unique + sparse ───────────────────────────
            // Email is optional but must be unique when provided (same pattern as identification).
            // Production MongoDB had it as unique WITHOUT sparse -> blocks multiple customers without email.
            const emailIdx = indexesAfterDrop.find((i: any) => i.name === 'email_1');
            if (emailIdx && (emailIdx.sparse !== true)) {
                logger.warn('[Migration] Dropping old email_1 index (needs to be unique+sparse)...');
                await col.dropIndex('email_1');
                // Also clean up documents with email:'' or null so sparse index works
                const emailCleanup = await col.updateMany(
                    { email: { $in: ['', null] } },
                    { $unset: { email: '' } }
                );
                if (emailCleanup.modifiedCount > 0) {
                    logger.info(`[Migration] Cleaned ${emailCleanup.modifiedCount} customer(s) with empty email.`);
                }
                await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
                logger.info('[Migration] email_1 recreated as unique+sparse index.');
            } else if (!emailIdx) {
                await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
                logger.info('[Migration] email_1 unique+sparse index created.');
            } else {
                logger.info('[Migration] email_1 already correct (unique+sparse).');
            }

        } catch (error) {
            logger.error('[Migration] Failed (non-fatal):', error);
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
