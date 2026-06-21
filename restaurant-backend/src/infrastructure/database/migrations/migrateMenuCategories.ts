/**
 * @file migrateMenuCategories.ts
 * @description Migración para convertir categorías de texto libre a referencias de Category
 *
 * PROBLEMA:
 * Los MenuItem existentes usan `category` como texto libre (string).
 * Con el nuevo sistema de categorías estructuradas, necesitamos:
 * 1. Extraer las categorías únicas de los productos existentes
 * 2. Crear documentos Category para cada una
 * 3. Actualizar los MenuItem con categoryId apuntando al Category correspondiente
 *
 * COMPORTAMIENTO:
 * - Se ejecuta UNA SOLA VEZ (guarda flag en DB via _migrations collection)
 * - Preserva el campo `category` original como fallback
 * - Las nuevas categorías se crean con visibleOnWebsite=true y productType='menu' por defecto
 * - Logea todo lo que hace para auditoría
 */

import mongoose from 'mongoose';
import { MenuItemModel } from '../schemas/MenuItemSchema';
import { CategoryModel } from '../schemas/CategorySchema';
import { logger } from '../../utils/Logger';

const MIGRATION_KEY = 'migration_menu_categories_v1';

export async function migrateMenuCategories(): Promise<void> {
    logger.info('[Migration] ═══════════════════════════════════════════════════════');
    logger.info('[Migration] Verificando migración de categorías de menú...');
    logger.info('[Migration] ═══════════════════════════════════════════════════════');

    try {
        const db = mongoose.connection.db;
        if (!db) {
            logger.warn('[Migration] No hay conexión a BD. Saltando migración de categorías.');
            return;
        }

        // 1. Verificar si ya se ejecutó esta migración usando colección _migrations
        const migrationsCol = db.collection('_migrations');
        const existingMigration = await migrationsCol.findOne({ key: MIGRATION_KEY });

        if (existingMigration) {
            logger.info('[Migration] Migración de categorías ya fue ejecutada anteriormente. Saltando.');
            return;
        }

        // 2. Obtener todas las categorías únicas de los MenuItem existentes
        const menuItems = await MenuItemModel.find({
            category: { $exists: true, $ne: '' }
        }).lean();

        if (menuItems.length === 0) {
            logger.info('[Migration] No hay productos con categorías para migrar.');
            return;
        }

        // Extraer categorías únicas (case-insensitive, trimmed)
        const uniqueCategories = new Map<string, string>();
        for (const item of menuItems) {
            const original = (item as any).category?.trim();
            if (original) {
                const normalized = original.toLowerCase();
                // Guardar la primera versión encontrada (preserva casing original)
                if (!uniqueCategories.has(normalized)) {
                    uniqueCategories.set(normalized, original);
                }
            }
        }

        logger.info(`[Migration] Encontradas ${uniqueCategories.size} categorías únicas:`);
        for (const [normalized, original] of uniqueCategories) {
            logger.info(`[Migration]   • "${original}" (normalizado: ${normalized})`);
        }

        // 3. Crear documentos Category para cada categoría única
        const categoryMap = new Map<string, string>(); // normalized -> categoryId
        let sortOrder = 0;

        for (const [normalized, original] of uniqueCategories) {
            // Verificar si ya existe una categoría con ese nombre
            const existing = await CategoryModel.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(original)}$`, 'i') }
            }).lean();

            if (existing) {
                logger.info(`[Migration] Categoría "${original}" ya existe con ID ${existing._id}`);
                categoryMap.set(normalized, existing._id.toString());
            } else {
                // Crear nueva categoría
                const newCategory = await CategoryModel.create({
                    name: capitalizeFirst(original),
                    description: `Categoría migrada automáticamente desde "${original}"`,
                    imageUrl: '',
                    productType: 'menu',
                    visibleOnWebsite: true,
                    sortOrder: sortOrder++,
                    available: true,
                });

                logger.info(`[Migration] Creada categoría "${newCategory.name}" con ID ${newCategory._id}`);
                categoryMap.set(normalized, (newCategory._id as mongoose.Types.ObjectId).toString());
            }
        }

        // 4. Actualizar MenuItem con categoryId
        let updatedCount = 0;
        let skippedCount = 0;

        for (const item of menuItems) {
            const original = (item as any).category?.trim();
            if (!original) continue;

            const normalized = original.toLowerCase();
            const categoryId = categoryMap.get(normalized);

            if (!categoryId) {
                logger.warn(`[Migration] No se encontró categoría para "${original}". Saltando.`);
                skippedCount++;
                continue;
            }

            // Solo actualizar si no tiene categoryId
            if (!(item as any).categoryId) {
                await MenuItemModel.findByIdAndUpdate(item._id, {
                    $set: { categoryId }
                });
                updatedCount++;
            }
        }

        // 5. Marcar migración como completada
        await migrationsCol.insertOne({
            key: MIGRATION_KEY,
            completedAt: new Date(),
            categoriesCreated: categoryMap.size,
            productsUpdated: updatedCount,
            productsSkipped: skippedCount
        });

        logger.info('[Migration] ═══════════════════════════════════════════════════════');
        logger.info('[Migration] ✅ MIGRACIÓN DE CATEGORÍAS COMPLETADA');
        logger.info('[Migration] ═══════════════════════════════════════════════════════');
        logger.info(`[Migration] Resumen:`);
        logger.info(`[Migration]   • Categorías creadas: ${categoryMap.size}`);
        logger.info(`[Migration]   • Productos actualizados: ${updatedCount}`);
        logger.info(`[Migration]   • Productos saltados: ${skippedCount}`);
        logger.info('[Migration] ═══════════════════════════════════════════════════════');

    } catch (error) {
        logger.error('[Migration] Error durante la migración de categorías:', error);
        throw error;
    }
}

/**
 * Escapa caracteres especiales de regex
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Capitaliza la primera letra de cada palabra
 */
function capitalizeFirst(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
