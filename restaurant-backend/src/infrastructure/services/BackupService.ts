/**
 * BackupService - Sistema de respaldos de base de datos
 * Mantiene máximo 20 backups, elimina automáticamente los más viejos
 */

import fs from 'fs';
import path from 'path';
import { dbConnection } from '../database/DatabaseConnection';
import { logger } from '../utils/Logger';

export interface BackupInfo {
    id: string;
    filename: string;
    createdAt: Date;
    size: number;
    collections: string[];
}

class BackupService {
    private backupDir: string;
    private maxBackups: number = 20;

    constructor() {
        this.backupDir = process.env.BACKUP_PATH || path.join(process.cwd(), 'backups');
        this.ensureBackupDir();
    }

    private ensureBackupDir(): void {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            logger.info('[BackupService] Backup directory created', { path: this.backupDir });
        }
    }

    /**
     * Crea un nuevo backup de la base de datos
     */
    public async createBackup(): Promise<BackupInfo> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            const db = dbConnection.getConnection();
            if (!db) {
                throw new Error('Database not connected');
            }

            // Obtener todas las colecciones
            const collections = await db.listCollections().toArray();
            const backupData: Record<string, any[]> = {};
            const collectionNames: string[] = [];

            for (const col of collections) {
                const collectionName = col.name;
                // Excluir colecciones del sistema
                if (collectionName.startsWith('system.')) continue;

                const data = await db.collection(collectionName).find({}).toArray();
                backupData[collectionName] = data;
                collectionNames.push(collectionName);
            }

            // Guardar backup
            const backupContent = JSON.stringify({
                createdAt: new Date().toISOString(),
                database: db.databaseName,
                collections: backupData
            }, null, 2);

            fs.writeFileSync(filepath, backupContent, 'utf-8');

            const stats = fs.statSync(filepath);

            logger.info('[BackupService] Backup created', {
                filename,
                collections: collectionNames.length,
                size: stats.size
            });

            // Limpiar backups viejos
            await this.cleanOldBackups();

            return {
                id: timestamp,
                filename,
                createdAt: new Date(),
                size: stats.size,
                collections: collectionNames
            };

        } catch (error: any) {
            logger.error('[BackupService] Error creating backup', { error: error.message });
            throw error;
        }
    }

    /**
     * Lista todos los backups disponibles
     */
    public async listBackups(): Promise<BackupInfo[]> {
        this.ensureBackupDir();

        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
                .sort()
                .reverse(); // Más recientes primero

            const backups: BackupInfo[] = [];

            for (const filename of files) {
                const filepath = path.join(this.backupDir, filename);
                const stats = fs.statSync(filepath);

                // Extraer timestamp del nombre
                const match = filename.match(/backup_(.+)\.json/);
                const id = match ? match[1] : filename;

                // Leer colecciones del backup
                let collections: string[] = [];
                try {
                    const content = fs.readFileSync(filepath, 'utf-8');
                    const data = JSON.parse(content);
                    collections = Object.keys(data.collections || {});
                } catch {
                    // Si no puede leer, continuar
                }

                backups.push({
                    id,
                    filename,
                    createdAt: stats.birthtime,
                    size: stats.size,
                    collections
                });
            }

            return backups;

        } catch (error: any) {
            logger.error('[BackupService] Error listing backups', { error: error.message });
            return [];
        }
    }

    /**
     * Elimina backups antiguos, manteniendo solo los últimos N
     */
    private async cleanOldBackups(): Promise<void> {
        const backups = await this.listBackups();

        if (backups.length <= this.maxBackups) {
            return;
        }

        // Ordenar por fecha (más viejos primero)
        const sorted = backups.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Eliminar los más viejos
        const toDelete = sorted.slice(0, backups.length - this.maxBackups);

        for (const backup of toDelete) {
            const filepath = path.join(this.backupDir, backup.filename);
            try {
                fs.unlinkSync(filepath);
                logger.info('[BackupService] Old backup deleted', { filename: backup.filename });
            } catch (error: any) {
                logger.warn('[BackupService] Could not delete backup', {
                    filename: backup.filename,
                    error: error.message
                });
            }
        }
    }

    /**
     * Elimina un backup específico
     */
    public async deleteBackup(id: string): Promise<boolean> {
        const filename = `backup_${id}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                logger.info('[BackupService] Backup deleted', { filename });
                return true;
            }
            return false;
        } catch (error: any) {
            logger.error('[BackupService] Error deleting backup', { error: error.message });
            return false;
        }
    }

    /**
     * Descarga un backup específico
     */
    public getBackupPath(id: string): string | null {
        const filename = `backup_${id}.json`;
        const filepath = path.join(this.backupDir, filename);

        if (fs.existsSync(filepath)) {
            return filepath;
        }
        return null;
    }
}

// Singleton
let backupServiceInstance: BackupService | null = null;

export function getBackupService(): BackupService {
    if (!backupServiceInstance) {
        backupServiceInstance = new BackupService();
    }
    return backupServiceInstance;
}

export { BackupService };
