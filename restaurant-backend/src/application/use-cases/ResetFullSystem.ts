/**
 * Casos de Uso: Resetear Sistema Completo (Factory Reset)
 * 
 * ADVERTENCIA: Esta operación es EXTREMADAMENTE destructiva.
 * Diseñada para preparar el sistema para un cliente nuevo.
 * 
 * Acciones:
 * 1. Elimina TODAS las Facturas y Notas de Crédito.
 * 2. Elimina TODOS los Clientes.
 * 3. Elimina TODA la Carta/Menú.
 * 4. Elimina TODAS las Órdenes de cocina y salón.
 * 5. Elimina TODOS los Empleados EXCEPTO el administrador principal.
 * 6. Reinicia la Configuración del Restaurante a los valores por defecto.
 */

import { BillModel } from '../../infrastructure/database/schemas/BillSchema';
import { CreditNoteModel } from '../../infrastructure/database/schemas/CreditNoteSchema';
import { CustomerModel } from '../../infrastructure/database/schemas/CustomerSchema';
import { MenuItemModel } from '../../infrastructure/database/schemas/MenuItemSchema';
import { OrderModel } from '../../infrastructure/database/schemas/OrderSchema';
import { EmployeeModel } from '../../infrastructure/database/schemas/EmployeeSchema';
import { RestaurantConfigModel } from '../../infrastructure/database/schemas/RestaurantConfigSchema';
import { logger } from '../../infrastructure/utils/Logger';

export class ResetFullSystem {

    async execute(adminUsername: string = 'admin'): Promise<{ success: boolean; message: string }> {
        logger.warn('🚨 INICIANDO PURGA TOTAL DEL SISTEMA (MODO FÁBRICA) 🚨');

        try {
            // 1. Eliminar Facturación
            const bills = await BillModel.deleteMany({});
            const creditNotes = await CreditNoteModel.deleteMany({});
            logger.info(`✅ Facturación borrada: ${bills.deletedCount} facturas, ${creditNotes.deletedCount} notas de crédito`);

            // 2. Eliminar Datos Operativos
            const customers = await CustomerModel.deleteMany({});
            const orders = await OrderModel.deleteMany({});
            const menuItems = await MenuItemModel.deleteMany({});
            logger.info(`✅ Datos operativos borrados: ${customers.deletedCount} clientes, ${orders.deletedCount} órdenes, ${menuItems.deletedCount} productos`);

            // 3. Eliminar Empleados (Preservar Admin)
            const employees = await EmployeeModel.deleteMany({ username: { $ne: adminUsername } });
            logger.info(`✅ Personal borrado: ${employees.deletedCount} empleados (Admin preservado)`);

            // 4. Reiniciar Configuración (Valores por defecto)
            const defaultConfig = {
                name: 'PICANTERÍA MIRAFLORES',
                ruc: '0000000000001',
                businessName: 'NUEVO RESTAURANTE S.A.',
                email: 'admin@restaurante.com',
                phone: '0999999999',
                address: 'Guayaquil, Ecuador',
                brandColors: {
                    primary: '#3b82f6',
                    secondary: '#1e40af',
                    accent: '#60a5fa'
                },
                billing: {
                    establishment: '001',
                    emissionPoint: '001',
                    regime: 'General',
                    currentSequenceFactura: 0,
                    currentSequenceNotaCredito: 0,
                    currentSequenceNotaVenta: 0,
                    taxRate: 15,
                    environment: '1'
                }
            };

            await RestaurantConfigModel.updateOne(
                { _id: 'restaurant-config' },
                { $set: defaultConfig },
                { upsert: true }
            );
            logger.info('✅ Configuración del restaurante reiniciada a valores de fábrica');

            return {
                success: true,
                message: `Purga completa exitosa. Se eliminaron: ${bills.deletedCount} facturas, ${customers.deletedCount} clientes, ${orders.deletedCount} órdenes y ${menuItems.deletedCount} productos.`
            };

        } catch (error: any) {
            logger.error('❌ ERROR FATAL DURANTE LA PURGA DEL SISTEMA:', error);
            throw new Error('Error al realizar el reset de fábrica: ' + error.message);
        }
    }
}
