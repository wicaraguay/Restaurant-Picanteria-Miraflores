import axios from 'axios';
import { logger } from '../../utils/Logger';
import { sriCircuitBreaker } from '../../utils/CircuitBreaker';
import { metricsService } from '../../monitoring/MetricsService';
import { SRIReceptionResponse } from './types';

const DEBUG_XML = process.env.NODE_ENV === 'development';

/**
 * Handles sending signed documents to SRI reception web service
 * FIX D-01: Protected by circuit breaker to prevent cascading failures
 */
export class SRISender {
    /**
     * Sends a signed invoice XML to SRI reception service
     * @param signedXml Signed XML content
     * @param isProduction Whether to use production or test environment
     * @returns Reception response with status
     */
    public async sendToSRI(signedXml: string, isProduction: boolean = false): Promise<SRIReceptionResponse> {
        const url = this.getReceptionUrl(isProduction);
        logger.info('[SRISender] Sending invoice to SRI', { env: isProduction ? 'PROD' : 'TEST' });

        return this.sendDocument(signedXml, url, 'invoice');
    }

    /**
     * Sends a signed credit note XML to SRI reception service
     * @param signedXml Signed XML content
     * @param isProduction Whether to use production or test environment
     * @returns Reception response with status
     */
    public async sendCreditNoteToSRI(signedXml: string, isProduction: boolean = false): Promise<SRIReceptionResponse> {
        const url = this.getReceptionUrl(isProduction);
        logger.info('[SRISender] Sending credit note to SRI', { env: isProduction ? 'PROD' : 'TEST' });

        return this.sendDocument(signedXml, url, 'creditNote');
    }

    /**
     * Internal document sending implementation
     * FIX D-01: Uses circuit breaker to protect against SRI outages
     */
    private async sendDocument(
        signedXml: string,
        url: string,
        docType: 'invoice' | 'creditNote'
    ): Promise<SRIReceptionResponse> {
        const startTime = Date.now();

        // 1. Encode XML to Base64
        const xmlBase64 = Buffer.from(signedXml).toString('base64');

        // 2. Construct SOAP Envelope
        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:validarComprobante>
                        <xml>${xmlBase64}</xml>
                    </ec:validarComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        // FIX D-01: Wrap SRI call with circuit breaker
        return sriCircuitBreaker.execute(async () => {
            try {
                // 3. Send Request
                const response = await axios.post(url, soapEnvelope, {
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': ''
                    }
                });

                // 4. Parse Response
                const responseBody = response.data;
                const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
                const estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

                logger.info('[SRISender] Reception response', { estado, docType });

                // Record metrics
                const duration = (Date.now() - startTime) / 1000;
                const operation = docType === 'invoice' ? 'send_invoice' : 'send_credit_note';
                metricsService.recordSRIRequestDuration(operation, duration);

                // Record success/failure counters
                const status = estado === 'RECIBIDA' ? 'success' : 'rejected';
                if (docType === 'invoice') {
                    metricsService.recordSRIInvoice(status);
                } else {
                    metricsService.recordSRICreditNote(status);
                }

                // If "DEVUELTA", extract error messages
                let mensajes: string[] = [];
                if (estado === 'DEVUELTA') {
                    if (DEBUG_XML) logger.debug('[SRISender] Full response', { body: responseBody });
                    const mensajeMatch = responseBody.match(/<mensaje>(.*?)<\/mensaje>/);
                    if (mensajeMatch) mensajes.push(mensajeMatch[1]);
                }

                // 5. Check for common errors and provide better feedback
                this.checkForCommonErrors(mensajes, docType);

                return {
                    estado: estado, // RECIBIDA or DEVUELTA
                    rawResponse: responseBody,
                    mensajes: mensajes
                };

            } catch (error: any) {
                // Record failure metrics
                const duration = (Date.now() - startTime) / 1000;
                const operation = docType === 'invoice' ? 'send_invoice' : 'send_credit_note';
                metricsService.recordSRIRequestDuration(operation, duration);

                if (docType === 'invoice') {
                    metricsService.recordSRIInvoice('failed');
                } else {
                    metricsService.recordSRICreditNote('failed');
                }

                logger.error('[SRISender] Error sending to SRI', { error: error.message, docType });
                this.handleSendError(error);
                throw error; // Should never reach here due to throw in handleSendError
            }
        });
    }

    /**
     * Checks for common SRI errors in messages
     */
    private checkForCommonErrors(mensajes: string[], docType: 'invoice' | 'creditNote'): void {
        if (mensajes.length === 0) return;

        const combinedMessages = mensajes.join(' ');

        if (combinedMessages.includes('ERROR SECUENCIAL REGISTRADO')) {
            const docTypeStr = docType === 'invoice' ? 'factura' : 'NOTA DE CRÉDITO';
            throw new Error(
                `Error de Secuencia: El número de ${docTypeStr} ya existe en el SRI. ` +
                'Por favor, actualice el secuencial en la configuración.'
            );
        }
    }

    /**
     * Handles errors from SRI sending attempts
     * Provides user-friendly messages for different error types
     */
    private handleSendError(error: any): never {
        // Check if it's an axios error with response
        if (error.response) {
            logger.error('[SRISender] Response error', { status: error.response.status });

            // IMPROVED ERROR HANDLING: Distinguish between SRI server errors and connectivity issues
            if (error.response.status === 500) {
                // SRI Server Error (Internal Server Error)
                const errorData = error.response.data;

                // Check if it's a database error from SRI
                if (errorData && (
                    errorData.includes('GenericJDBCException') ||
                    errorData.includes('could not execute statement') ||
                    errorData.includes('soap:Server')
                )) {
                    throw new Error(
                        '⚠️ El servicio del SRI está experimentando problemas internos (Error 500). ' +
                        'Esto no es un problema de tu aplicación. Por favor, intenta nuevamente en 15-30 minutos. ' +
                        'Si el problema persiste, verifica el estado del SRI en https://www.sri.gob.ec'
                    );
                }

                // Generic 500 error
                throw new Error(
                    '⚠️ El servidor del SRI está temporalmente no disponible (Error 500). ' +
                    'Por favor, intenta nuevamente en unos minutos.'
                );
            }

            // Other HTTP errors (400, 401, 403, etc.)
            throw new Error(
                `Error del SRI (HTTP ${error.response.status}): ${error.message}. ` +
                'Verifica tu configuración o contacta con soporte técnico del SRI.'
            );
        }

        // Propagate specific errors (like sequence errors)
        if (error.message.includes('Error de Secuencia')) {
            throw error;
        }

        // Network/Connectivity errors (no response from server)
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            throw new Error(
                '🔌 No se pudo conectar al servicio del SRI. ' +
                'Verifica tu conexión a internet o que el SRI no esté en mantenimiento.'
            );
        }

        // Generic fallback
        throw new Error('Failed to connect to SRI Web Service: ' + error.message);
    }

    /**
     * Gets the reception web service URL for the specified environment
     */
    private getReceptionUrl(isProduction: boolean): string {
        return isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';
    }
}
