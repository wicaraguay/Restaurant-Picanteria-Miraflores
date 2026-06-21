import axios from 'axios';
import { logger } from '../../utils/Logger';
import { sriCircuitBreaker } from '../../utils/CircuitBreaker';
import { metricsService } from '../../monitoring/MetricsService';
import { SRIAuthResponse } from './types';
import {
    SRI_POLL_MAX_ATTEMPTS,
    SRI_POLL_INITIAL_DELAY_MS
} from '../../../config/billing.constants';

const DEBUG_XML = process.env.NODE_ENV === 'development';

/**
 * Handles authorization queries to SRI authorization web service
 * FIX D-01: Protected by circuit breaker
 * FIX M-09: Implements exponential backoff for polling
 */
export class SRIAuthorizer {
    /**
     * Queries authorization status for an invoice
     * @param accessKey Access key (Clave de Acceso) to check
     * @param isProduction Whether to use production or test environment
     * @returns Authorization response
     */
    public async authorizeInvoice(accessKey: string, isProduction: boolean = false): Promise<SRIAuthResponse> {
        const url = this.getAuthorizationUrl(isProduction);
        logger.info('[SRIAuth] Authorizing invoice', { env: isProduction ? 'PROD' : 'TEST' });

        return this.queryAuthorization(accessKey, url, 'invoice');
    }

    /**
     * Queries authorization status for a credit note
     * @param accessKey Access key (Clave de Acceso) to check
     * @param isProduction Whether to use production or test environment
     * @returns Authorization response
     */
    public async authorizeCreditNote(accessKey: string, isProduction: boolean = false): Promise<SRIAuthResponse> {
        const url = this.getAuthorizationUrl(isProduction);
        logger.info('[SRIAuth] Authorizing credit note', { env: isProduction ? 'PROD' : 'TEST' });

        return this.queryAuthorization(accessKey, url, 'creditNote');
    }

    /**
     * Polls the SRI authorization service until document is authorized or terminal state is reached
     * FIX M-09: Uses exponential backoff to avoid overwhelming SRI
     * @param accessKey Access key to check
     * @param isProduction Whether to use production or test environment
     * @param maxAttempts Maximum number of polling attempts (default 5)
     * @param baseDelay Base delay between attempts in ms (default 2000) - grows exponentially
     * @returns Final authorization result
     */
    public async pollUntilAuthorized(
        accessKey: string,
        isProduction: boolean = false,
        maxAttempts: number = SRI_POLL_MAX_ATTEMPTS,
        baseDelay: number = SRI_POLL_INITIAL_DELAY_MS
    ): Promise<SRIAuthResponse> {
        let authResult: SRIAuthResponse | undefined;
        let attempts = 0;
        const maxDelay = 30000; // Cap at 30 seconds

        logger.info('[SRIAuth] Starting authorization polling with exponential backoff', {
            maxAttempts,
            baseDelay
        });

        while (attempts < maxAttempts) {
            attempts++;

            if (attempts > 1) {
                // FIX M-09: Exponential backoff with jitter
                // Delay = baseDelay * 2^(attempt-1) + random jitter
                const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
                const jitter = Math.random() * 500; // 0-500ms random jitter
                const actualDelay = Math.floor(exponentialDelay + jitter);

                logger.debug('[SRIAuth] Waiting before retry', { delay: actualDelay, attempt: attempts });
                await new Promise(resolve => setTimeout(resolve, actualDelay));
            }

            logger.debug('[SRIAuth] Authorization attempt', { attempt: attempts, maxAttempts });
            authResult = await this.authorizeInvoice(accessKey, isProduction);

            // Check terminal states
            if (authResult.estado === 'AUTORIZADO') {
                logger.info('[SRIAuth] Document authorized successfully');
                return authResult;
            }

            if (authResult.estado === 'DEVUELTA') {
                // Check if it's actually just processing hidden in a message
                const responseStr = JSON.stringify(authResult);
                if (responseStr.includes('EN PROCESAMIENTO') ||
                    responseStr.includes('CLAVE DE ACCESO EN PROCESAMIENTO')) {
                    logger.debug('[SRIAuth] Status DEVUELTA but processing, retrying...');
                    continue;
                }
                logger.warn('[SRIAuth] Document rejected by SRI');
                return authResult;
            }

            if (authResult.estado === 'UNKNOWN' || authResult.estado === 'EN PROCESO') {
                logger.debug('[SRIAuth] Status pending, retrying', { estado: authResult.estado });
                continue;
            }
        }

        return authResult || {
            estado: 'TIMEOUT',
            numeroAutorizacion: '',
            fechaAutorizacion: '',
            comprobanteAutorizado: '',
            rawResponse: 'El SRI tardó demasiado en responder.'
        };
    }

    /**
     * Internal authorization query implementation
     * FIX D-01: Uses circuit breaker
     */
    private async queryAuthorization(
        accessKey: string,
        url: string,
        docType: 'invoice' | 'creditNote'
    ): Promise<SRIAuthResponse> {
        const startTime = Date.now();
        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:autorizacionComprobante>
                        <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
                    </ec:autorizacionComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        // FIX D-01: Wrap authorization call with circuit breaker
        return sriCircuitBreaker.execute(async () => {
            try {
                const response = await axios.post(url, soapEnvelope, {
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': ''
                    }
                });

                const responseBody = response.data;
                const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
                let estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

                logger.info('[SRIAuth] Authorization response', { estado, docType });

                // Record metrics
                const duration = (Date.now() - startTime) / 1000;
                const operation = docType === 'invoice' ? 'authorize_invoice' : 'authorize_credit_note';
                metricsService.recordSRIRequestDuration(operation, duration);

                let numeroAutorizacion = '';
                let fechaAutorizacion = '';
                let comprobanteAutorizado = '';
                let mensajes: string[] = [];

                if (estado === 'AUTORIZADO') {
                    const numMatch = responseBody.match(/<numeroAutorizacion>(.*?)<\/numeroAutorizacion>/);
                    if (numMatch) numeroAutorizacion = numMatch[1];

                    const fechaMatch = responseBody.match(/<fechaAutorizacion>(.*?)<\/fechaAutorizacion>/);
                    if (fechaMatch) fechaAutorizacion = fechaMatch[1];

                    // Extract the CDATA content of the authorized XML
                    const compMatch = responseBody.match(/<comprobante><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/);
                    if (compMatch) comprobanteAutorizado = compMatch[1];
                } else {
                    // Check if it's a "Not Found" or "Pending" case (0 authorizations)
                    if (responseBody.includes('<numeroComprobantes>0</numeroComprobantes>')) {
                        logger.debug('[SRIAuth] 0 authorizations returned, may be pending');
                        if (DEBUG_XML) logger.debug('[SRIAuth] Response body', { body: responseBody });
                        estado = 'EN PROCESO'; // More friendly status
                    } else {
                        // Extract error messages for rejected documents
                        const mensajeRegex = /<mensaje>(.*?)<\/mensaje>/g;
                        let match;
                        while ((match = mensajeRegex.exec(responseBody)) !== null) {
                            mensajes.push(match[1]);
                        }
                        if (mensajes.length > 0) {
                            logger.warn('[SRIAuth] Document rejected', { mensajes, docType });
                        }
                        if (DEBUG_XML) logger.debug('[SRIAuth] Full response', { body: responseBody });
                    }
                }

                return {
                    estado,
                    numeroAutorizacion,
                    fechaAutorizacion,
                    comprobanteAutorizado,
                    rawResponse: responseBody,
                    mensajes: mensajes.length > 0 ? mensajes : undefined
                };

            } catch (error: any) {
                logger.error('[SRIAuth] Error authorizing document', { error: error.message, docType });
                throw new Error(`Failed to connect to SRI Authorization Service for ${docType}`);
            }
        });
    }

    /**
     * Gets the authorization web service URL for the specified environment
     */
    private getAuthorizationUrl(isProduction: boolean): string {
        return isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';
    }
}
