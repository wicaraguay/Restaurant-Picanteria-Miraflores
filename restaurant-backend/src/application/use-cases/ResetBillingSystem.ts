/**
 * Casos de Uso: Resetear Sistema de Facturación
 * 
 * ADVERTENCIA: Esta operación es destructiva.
 * 
 * Acciones:
 * 1. Elimina TODAS las facturas de la base de datos using BillModel directly (faster for bulk delete).
 * 2. Elimina TODAS las notas de crédito.
 * 3. Reinicia las secuencias de facturación en RestaurantConfig a 0.
 * 4. Actualiza todas las órdenes a estado "no facturado" (billed: false).
 */

import { BillModel } from '../../infrastructure/database/schemas/BillSchema';
import { CreditNoteModel } from '../../infrastructure/database/schemas/CreditNoteSchema';
import { OrderModel } from '../../infrastructure/database/schemas/OrderSchema';
import { RestaurantConfigModel } from '../../infrastructure/database/schemas/RestaurantConfigSchema';
import { logger } from '../../infrastructure/utils/Logger';

export class ResetBillingSystem {

    async execute(): Promise<{ success: boolean; message: string }> {
        logger.warn('⚠️ INICIANDO RESETEO COMPLETO DEL SISTEMA DE FACTURACIÓN ⚠️');

        try {
            // 1. Resetear secuencias en Configuración
            // Establecemos a 0 para que la siguiente sea 1
            await RestaurantConfigModel.updateOne(
                { _id: 'restaurant-config' },
                {
                    $set: {
                        'billing.currentSequenceFactura': 0,
                        'billing.currentSequenceNotaCredito': 0,
                        'billing.currentSequenceNotaVenta': 0
                    }
                }
            );
            logger.info('✅ Secuencias de facturación reiniciadas a 0');

            // 2. Eliminar todas las facturas
            const billsResult = await BillModel.deleteMany({});
            logger.info(`✅ Facturas eliminadas: ${billsResult.deletedCount}`);

            // 3. Eliminar todas las notas de crédito
            // Nota: Asumimos que existe el modelo, si no existe el archivo se debe crear o importar correctamente
            // Si CreditNoteModel no está disponible globalmente, se debería inyectar o importar.
            // Verificaremos si existe importación, si da error se corregirá.
            const creditNotesResult = await CreditNoteModel.deleteMany({});
            logger.info(`✅ Notas de crédito eliminadas: ${creditNotesResult.deletedCount}`);

            // 4. Resetear estado de órdenes
            const ordersResult = await OrderModel.updateMany(
                { billed: true },
                { $set: { billed: false } }
            );
            logger.info(`✅ Órdenes actualizadas a no facturadas: ${ordersResult.modifiedCount}`);

            return {
                success: true,
                message: `Sistema reseteado correctamente. Facturas eliminadas: ${billsResult.deletedCount}. Notas de crédito eliminadas: ${creditNotesResult.deletedCount}. Órdenes reseteadas: ${ordersResult.modifiedCount}.`
            };

        } catch (error: any) {
            logger.error('❌ Error fatal al resetear sistema de facturación:', error);
            throw new Error('Error al resetear sistema de facturación: ' + error.message);
        }
    }
}
