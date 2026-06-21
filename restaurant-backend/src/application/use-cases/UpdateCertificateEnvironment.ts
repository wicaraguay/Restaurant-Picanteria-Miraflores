/**
 * @file UpdateCertificateEnvironment.ts
 * @description Caso de uso para cambiar el ambiente del certificado SRI (Pruebas ↔ Producción)
 *
 * @purpose
 * Permite cambiar el ambiente del SRI sin necesidad de volver a subir el certificado.
 * El certificado .p12 es el mismo para ambos ambientes, solo cambia el endpoint del SRI.
 *
 * IMPORTANTE: Al cambiar de ambiente, muestra información de secuenciales:
 * - Último secuencial usado en el ambiente destino
 * - Permite opcionalmente configurar nuevos secuenciales iniciales
 *
 * @connections
 * - Usa: IRestaurantConfigRepository
 * - Usado por: ConfigController
 *
 * @layer Application - Lógica de negocio
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { NotFoundError, ValidationError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export interface UpdateCertificateEnvironmentParams {
    environment: '1' | '2';  // 1 = Pruebas, 2 = Producción
    // Opcionales: permitir configurar secuenciales al cambiar de ambiente
    newSequenceFactura?: number;
    newSequenceNotaCredito?: number;
}

/** Información de secuenciales por ambiente */
export interface SequentialInfo {
    factura: number;
    notaCredito: number;
    notaVenta: number;
}

/** Resultado del cambio de ambiente con información detallada */
export interface UpdateCertificateEnvironmentResult {
    success: boolean;
    message: string;
    /** Ambiente anterior */
    previousEnvironment: {
        code: '1' | '2';
        name: string;
        sequentials: SequentialInfo;
    };
    /** Ambiente nuevo (destino) */
    newEnvironment: {
        code: '1' | '2';
        name: string;
        sequentials: SequentialInfo;
    };
    /** Siguiente factura que se emitirá */
    nextInvoiceNumber: string;
    /** Siguiente nota de crédito que se emitirá */
    nextCreditNoteNumber: string;
}

export class UpdateCertificateEnvironment {
    constructor(
        private configRepository: IRestaurantConfigRepository
    ) {}

    async execute(params: UpdateCertificateEnvironmentParams): Promise<UpdateCertificateEnvironmentResult> {
        const { environment, newSequenceFactura, newSequenceNotaCredito } = params;

        // Validar ambiente
        if (environment !== '1' && environment !== '2') {
            throw new ValidationError('Environment must be "1" (testing) or "2" (production)');
        }

        // Obtener configuración actual
        const config = await this.configRepository.get();
        if (!config) {
            throw new NotFoundError('Restaurant configuration not found');
        }

        // Verificar que existe certificado
        if (!config.sriCertificate) {
            throw new NotFoundError('No certificate found. Please upload a certificate first.');
        }

        const oldEnvCode = config.sriCertificate.environment || '1';
        const oldEnvName = oldEnvCode === '1' ? 'Pruebas' : 'Producción';
        const newEnvName = environment === '1' ? 'Pruebas' : 'Producción';
        const isProduction = environment === '2';

        // Secuenciales del ambiente anterior
        const previousSequentials: SequentialInfo = {
            factura: oldEnvCode === '2'
                ? config.billing.currentSequenceFactura
                : (config.billing.testSequenceFactura ?? 1),
            notaCredito: oldEnvCode === '2'
                ? config.billing.currentSequenceNotaCredito
                : (config.billing.testSequenceNotaCredito ?? 1),
            notaVenta: oldEnvCode === '2'
                ? config.billing.currentSequenceNotaVenta
                : (config.billing.testSequenceNotaVenta ?? 1)
        };

        // Secuenciales del ambiente destino (antes de cualquier modificación)
        let targetSequentials: SequentialInfo = {
            factura: isProduction
                ? config.billing.currentSequenceFactura
                : (config.billing.testSequenceFactura ?? 1),
            notaCredito: isProduction
                ? config.billing.currentSequenceNotaCredito
                : (config.billing.testSequenceNotaCredito ?? 1),
            notaVenta: isProduction
                ? config.billing.currentSequenceNotaVenta
                : (config.billing.testSequenceNotaVenta ?? 1)
        };

        // Log detallado de la situación actual
        logger.info('[UpdateCertificateEnvironment] ═══════════════════════════════════════');
        logger.info('[UpdateCertificateEnvironment] CAMBIO DE AMBIENTE SRI');
        logger.info('[UpdateCertificateEnvironment] ═══════════════════════════════════════');
        logger.info(`[UpdateCertificateEnvironment] De: ${oldEnvName} → A: ${newEnvName}`);
        logger.info(`[UpdateCertificateEnvironment] RUC: ${config.sriCertificate.rucInCertificate}`);
        logger.info('[UpdateCertificateEnvironment] ───────────────────────────────────────');
        logger.info(`[UpdateCertificateEnvironment] SECUENCIALES AMBIENTE ANTERIOR (${oldEnvName}):`);
        logger.info(`[UpdateCertificateEnvironment]   • Facturas: ${previousSequentials.factura}`);
        logger.info(`[UpdateCertificateEnvironment]   • Notas de Crédito: ${previousSequentials.notaCredito}`);
        logger.info('[UpdateCertificateEnvironment] ───────────────────────────────────────');
        logger.info(`[UpdateCertificateEnvironment] SECUENCIALES AMBIENTE DESTINO (${newEnvName}):`);
        logger.info(`[UpdateCertificateEnvironment]   • Facturas: ${targetSequentials.factura} (próxima: ${targetSequentials.factura + 1})`);
        logger.info(`[UpdateCertificateEnvironment]   • Notas de Crédito: ${targetSequentials.notaCredito} (próxima: ${targetSequentials.notaCredito + 1})`);

        // Preparar actualización
        const updateData: any = {
            sriCertificate: {
                ...config.sriCertificate,
                environment
            }
        };

        // Si se proporcionan nuevos secuenciales, actualizarlos
        if (newSequenceFactura !== undefined && newSequenceFactura > 0) {
            const fieldName = isProduction ? 'currentSequenceFactura' : 'testSequenceFactura';
            updateData.billing = updateData.billing || {};
            updateData.billing[fieldName] = newSequenceFactura - 1; // -1 porque getNextSequential incrementa antes de devolver
            targetSequentials.factura = newSequenceFactura - 1;
            logger.info(`[UpdateCertificateEnvironment] ⚠️ Secuencial de facturas configurado manualmente: ${newSequenceFactura}`);
        }

        if (newSequenceNotaCredito !== undefined && newSequenceNotaCredito > 0) {
            const fieldName = isProduction ? 'currentSequenceNotaCredito' : 'testSequenceNotaCredito';
            updateData.billing = updateData.billing || {};
            updateData.billing[fieldName] = newSequenceNotaCredito - 1;
            targetSequentials.notaCredito = newSequenceNotaCredito - 1;
            logger.info(`[UpdateCertificateEnvironment] ⚠️ Secuencial de notas de crédito configurado manualmente: ${newSequenceNotaCredito}`);
        }

        // Actualizar configuración
        await this.configRepository.update(updateData);

        // Calcular números de documento
        const estab = config.billing.establishment.padStart(3, '0');
        const ptoEmi = config.billing.emissionPoint.padStart(3, '0');
        const nextFacturaSeq = (targetSequentials.factura + 1).toString().padStart(9, '0');
        const nextNCSeq = (targetSequentials.notaCredito + 1).toString().padStart(9, '0');

        const nextInvoiceNumber = `${estab}-${ptoEmi}-${nextFacturaSeq}`;
        const nextCreditNoteNumber = `${estab}-${ptoEmi}-${nextNCSeq}`;

        logger.info('[UpdateCertificateEnvironment] ───────────────────────────────────────');
        logger.info('[UpdateCertificateEnvironment] ✅ CAMBIO COMPLETADO');
        logger.info(`[UpdateCertificateEnvironment]   • Próxima factura: ${nextInvoiceNumber}`);
        logger.info(`[UpdateCertificateEnvironment]   • Próxima N/C: ${nextCreditNoteNumber}`);
        logger.info('[UpdateCertificateEnvironment] ═══════════════════════════════════════');

        return {
            success: true,
            message: `Ambiente cambiado de ${oldEnvName} a ${newEnvName}. Próxima factura: ${nextInvoiceNumber}`,
            previousEnvironment: {
                code: oldEnvCode as '1' | '2',
                name: oldEnvName,
                sequentials: previousSequentials
            },
            newEnvironment: {
                code: environment,
                name: newEnvName,
                sequentials: targetSequentials
            },
            nextInvoiceNumber,
            nextCreditNoteNumber
        };
    }
}