/**
 * @file DeleteInactiveClients.ts
 * @description Caso de uso para eliminar clientes inactivos
 *
 * @purpose
 * Limpia clientes que no han realizado compras en X meses.
 * Cumple con políticas de retención de datos y GDPR/LOPD.
 *
 * @connections
 * - Usa: IClientRepository, IBillRepository
 * - Usado por: MaintenanceController
 *
 * @layer Application - Lógica de negocio
 */

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { ValidationError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export interface DeleteInactiveClientsParams {
    monthsInactive: number;
}

export interface DeleteInactiveClientsResult {
    deletedCount: number;
    message: string;
}

export class DeleteInactiveClients {
    constructor(
        private customerRepository: ICustomerRepository,
        private billRepository: IBillRepository
    ) {}

    async execute(params: DeleteInactiveClientsParams): Promise<DeleteInactiveClientsResult> {
        const { monthsInactive } = params;

        // Validar parámetros
        if (!monthsInactive || monthsInactive < 1 || monthsInactive > 60) {
            throw new ValidationError('Months must be between 1 and 60');
        }

        // Calcular fecha límite
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsInactive);

        logger.info('[DeleteInactiveClients] Starting deletion of inactive clients', {
            monthsInactive,
            cutoffDate: cutoffDate.toISOString()
        });

        try {
            const customers = await this.customerRepository.findAll();
            const bills = await this.billRepository.findAll();

            // Identificar clientes inactivos
            const customersToDelete: string[] = [];

            for (const customer of customers) {
                // Buscar facturas del cliente (por identification)
                const customerBills = bills.filter(bill => bill.customerIdentification === customer.identification);

                if (customerBills.length === 0) {
                    // No tiene facturas - verificar última visita
                    const lastVisit = new Date(customer.lastVisit);
                    if (lastVisit < cutoffDate) {
                        customersToDelete.push(customer.id);
                    }
                } else {
                    // Tiene facturas - verificar la más reciente
                    const lastBillDate = customerBills
                        .map(bill => bill.createdAt ? new Date(bill.createdAt) : null)
                        .filter(date => date !== null)
                        .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0];

                    if (lastBillDate && lastBillDate < cutoffDate) {
                        customersToDelete.push(customer.id);
                    }
                }
            }

            // Eliminar clientes inactivos
            let deletedCount = 0;
            for (const customerId of customersToDelete) {
                await this.customerRepository.delete(customerId);
                deletedCount++;
            }

            logger.info('[DeleteInactiveClients] Clients deleted successfully', {
                deletedCount,
                monthsInactive
            });

            return {
                deletedCount,
                message: `${deletedCount} clientes inactivos eliminados correctamente`
            };
        } catch (error) {
            logger.error('[DeleteInactiveClients] Error deleting inactive clients', error);
            throw error;
        }
    }
}
