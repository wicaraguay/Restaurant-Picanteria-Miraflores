/**
 * @file migrateSequentialsToEnvironments.ts
 * @description Migración única para corregir secuenciales históricos
 *
 * PROBLEMA:
 * Antes de implementar la separación por ambiente, todas las facturas de prueba
 * usaban `currentSequenceFactura` (que ahora es para Producción).
 *
 * SOLUCIÓN:
 * Si el ambiente actual es Pruebas ('1') pero `currentSequenceFactura` tiene un valor alto
 * mientras `testSequenceFactura` está en 1, significa que los datos están invertidos.
 * Esta migración los corrige automáticamente.
 *
 * COMPORTAMIENTO:
 * - Se ejecuta UNA SOLA VEZ (guarda flag en DB)
 * - Solo actúa si detecta datos invertidos
 * - Logea todo lo que hace para auditoría
 */

import { RestaurantConfigModel } from '../schemas/RestaurantConfigSchema';
import { logger } from '../../utils/Logger';

const MIGRATION_KEY = 'migration_sequentials_v1_completed';
const FIXED_CONFIG_ID = 'restaurant-config';

export async function migrateSequentialsToEnvironments(): Promise<void> {
    logger.info('[Migration] ═══════════════════════════════════════════════════════');
    logger.info('[Migration] Verificando migración de secuenciales por ambiente...');
    logger.info('[Migration] ═══════════════════════════════════════════════════════');

    try {
        // 1. Verificar si ya se ejecutó esta migración
        const config = await RestaurantConfigModel.findById(FIXED_CONFIG_ID);

        if (!config) {
            logger.info('[Migration] No hay configuración aún. Migración no necesaria.');
            return;
        }

        // Verificar flag de migración completada
        const metadata = (config as any).metadata || {};
        if (metadata[MIGRATION_KEY]) {
            logger.info('[Migration] Migración ya fue ejecutada anteriormente. Saltando.');
            return;
        }

        // 2. Obtener valores actuales
        const currentEnv = config.sriCertificate?.environment || '1';
        const currentSeqFactura = config.billing?.currentSequenceFactura || 0;
        const currentSeqNC = config.billing?.currentSequenceNotaCredito || 0;
        const testSeqFactura = config.billing?.testSequenceFactura || 1;
        const testSeqNC = config.billing?.testSequenceNotaCredito || 1;

        logger.info('[Migration] Estado actual de secuenciales:');
        logger.info(`[Migration]   • Ambiente actual: ${currentEnv === '1' ? 'Pruebas' : 'Producción'}`);
        logger.info(`[Migration]   • currentSequenceFactura (Prod): ${currentSeqFactura}`);
        logger.info(`[Migration]   • currentSequenceNotaCredito (Prod): ${currentSeqNC}`);
        logger.info(`[Migration]   • testSequenceFactura (Test): ${testSeqFactura}`);
        logger.info(`[Migration]   • testSequenceNotaCredito (Test): ${testSeqNC}`);

        // 3. Detectar si necesita corrección
        // Condición: Ambiente es Pruebas, pero currentSequence tiene valor alto y testSequence está en default
        const needsMigration =
            currentEnv === '1' && // Está en ambiente de pruebas
            currentSeqFactura > 10 && // currentSequence tiene valor significativo
            testSeqFactura <= 1; // testSequence está en default

        if (!needsMigration) {
            logger.info('[Migration] Los datos parecen correctos. No se requiere migración.');

            // Marcar como completada de todas formas para no volver a verificar
            await RestaurantConfigModel.findByIdAndUpdate(
                FIXED_CONFIG_ID,
                { $set: { [`metadata.${MIGRATION_KEY}`]: new Date().toISOString() } }
            );
            return;
        }

        // 4. EJECUTAR MIGRACIÓN
        logger.warn('[Migration] ⚠️ DATOS INVERTIDOS DETECTADOS - Ejecutando corrección...');
        logger.info('[Migration] Intercambiando secuenciales:');
        logger.info(`[Migration]   • testSequenceFactura: 1 → ${currentSeqFactura}`);
        logger.info(`[Migration]   • testSequenceNotaCredito: 1 → ${currentSeqNC}`);
        logger.info(`[Migration]   • currentSequenceFactura: ${currentSeqFactura} → 0`);
        logger.info(`[Migration]   • currentSequenceNotaCredito: ${currentSeqNC} → 0`);

        await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            {
                $set: {
                    // Mover los valores actuales a PRUEBAS (donde realmente se usaron)
                    'billing.testSequenceFactura': currentSeqFactura,
                    'billing.testSequenceNotaCredito': currentSeqNC,
                    'billing.testSequenceNotaVenta': config.billing?.currentSequenceNotaVenta || 0,
                    // Resetear PRODUCCIÓN a 0 (nuevo establecimiento)
                    'billing.currentSequenceFactura': 0,
                    'billing.currentSequenceNotaCredito': 0,
                    'billing.currentSequenceNotaVenta': 0,
                    // Marcar migración como completada
                    [`metadata.${MIGRATION_KEY}`]: new Date().toISOString()
                }
            }
        );

        logger.info('[Migration] ═══════════════════════════════════════════════════════');
        logger.info('[Migration] ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        logger.info('[Migration] ═══════════════════════════════════════════════════════');
        logger.info('[Migration] Nuevo estado:');
        logger.info(`[Migration]   • Pruebas - Facturas: ${currentSeqFactura} (próxima: ${currentSeqFactura + 1})`);
        logger.info(`[Migration]   • Pruebas - N/C: ${currentSeqNC} (próxima: ${currentSeqNC + 1})`);
        logger.info(`[Migration]   • Producción - Facturas: 0 (próxima: 1)`);
        logger.info(`[Migration]   • Producción - N/C: 0 (próxima: 1)`);
        logger.info('[Migration] ═══════════════════════════════════════════════════════');

    } catch (error) {
        logger.error('[Migration] Error durante la migración:', error);
        throw error;
    }
}
