/**
 * @file migrateMenuCategoryNames.ts
 * @description Migración v2: sincroniza el texto `category` de cada MenuItem
 * con el nombre canónico de su Category.
 *
 * PROBLEMA:
 * La migración v1 asignó categoryId a los platos pero preservó el texto
 * original de `category`. Las categorías canónicas se crearon capitalizadas
 * ("Especial De Casa") mientras los platos viejos conservan su texto libre
 * ("ESPECIAL DE CASA", "Especial de casa "). Toda vista que agrupa o filtra
 * por ese texto muestra la misma categoría duplicada.
 *
 * COMPORTAMIENTO:
 * - Se ejecuta UNA SOLA VEZ (flag en colección _migrations)
 * - Platos CON categoryId válido → category = nombre canónico de la Category
 * - Platos SIN categoryId (o con categoryId colgante hacia una categoría
 *   borrada) → se enlazan a la Category cuyo nombre coincida (sin distinguir
 *   mayúsculas/espacios) y adoptan el nombre canónico; queda logueado
 * - Platos sin Category correspondiente → solo se recortan espacios
 * - Si aún no hay platos, NO se marca el flag: se reintenta al próximo arranque
 */

import mongoose from 'mongoose';
import { MenuItemModel } from '../schemas/MenuItemSchema';
import { CategoryModel } from '../schemas/CategorySchema';
import { logger } from '../../utils/Logger';

const MIGRATION_KEY = 'migration_menu_category_names_v2';

export async function migrateMenuCategoryNames(): Promise<void> {
    logger.info('[Migration] Verificando migración de nombres de categoría (v2)...');

    try {
        const db = mongoose.connection.db;
        if (!db) {
            logger.warn('[Migration] No hay conexión a BD. Saltando migración de nombres de categoría.');
            return;
        }

        const migrationsCol = db.collection('_migrations');
        const existingMigration = await migrationsCol.findOne({ key: MIGRATION_KEY });

        if (existingMigration) {
            logger.info('[Migration] Migración de nombres de categoría ya fue ejecutada. Saltando.');
            return;
        }

        const categories = await CategoryModel.find({}).lean();
        const nameById = new Map<string, string>();
        const canonicalByNormalizedName = new Map<string, { id: string; name: string }>();

        for (const cat of categories) {
            const id = (cat._id as mongoose.Types.ObjectId).toString();
            nameById.set(id, cat.name);
            const normalized = cat.name.trim().toLowerCase();
            if (!canonicalByNormalizedName.has(normalized)) {
                canonicalByNormalizedName.set(normalized, { id, name: cat.name });
            }
        }

        const menuItems = await MenuItemModel.find({}).lean();

        if (menuItems.length === 0) {
            logger.info('[Migration] No hay platos para normalizar aún. Se reintentará en el próximo arranque.');
            return;
        }

        let renamedCount = 0;
        let linkedCount = 0;
        let trimmedCount = 0;

        for (const item of menuItems) {
            const rawCategory = String((item as any).category || '');
            const categoryId = (item as any).categoryId ? String((item as any).categoryId) : '';
            const update: Record<string, string> = {};

            const canonicalName = categoryId ? nameById.get(categoryId) : undefined;

            if (canonicalName) {
                if (rawCategory !== canonicalName) {
                    update.category = canonicalName;
                    renamedCount++;
                    logger.info(`[Migration] "${(item as any).name}": categoría "${rawCategory}" → "${canonicalName}"`);
                }
            } else {
                const match = canonicalByNormalizedName.get(rawCategory.trim().toLowerCase());
                if (match) {
                    update.categoryId = match.id;
                    if (rawCategory !== match.name) {
                        update.category = match.name;
                    }
                    linkedCount++;
                    logger.info(`[Migration] "${(item as any).name}": enlazado a categoría "${match.name}" (${match.id})`);
                } else if (rawCategory !== rawCategory.trim()) {
                    update.category = rawCategory.trim();
                    trimmedCount++;
                }
            }

            if (Object.keys(update).length > 0) {
                await MenuItemModel.findByIdAndUpdate(item._id, { $set: update });
            }
        }

        await migrationsCol.insertOne({
            key: MIGRATION_KEY,
            completedAt: new Date(),
            itemsRenamed: renamedCount,
            itemsLinked: linkedCount,
            itemsTrimmed: trimmedCount
        });

        logger.info('[Migration] ✅ Migración de nombres de categoría (v2) completada');
        logger.info(`[Migration]   • Renombrados al nombre canónico: ${renamedCount}`);
        logger.info(`[Migration]   • Enlazados a su categoría: ${linkedCount}`);
        logger.info(`[Migration]   • Solo recortados: ${trimmedCount}`);

    } catch (error) {
        logger.error('[Migration] Error durante la migración de nombres de categoría:', error);
        throw error;
    }
}
