/**
 * FIX M-02: Billing configuration constants
 * These values can be overridden via environment variables
 */

// Límites de facturación
export const CONSUMIDOR_FINAL_LIMIT = 50; // USD
export const CONSUMIDOR_FINAL_RUC = '9999999999999';

// Rate limiting
export const INVOICE_RATE_LIMIT = 10; // por minuto
export const STATUS_CHECK_RATE_LIMIT = 30; // por minuto
export const RESUBMIT_RATE_LIMIT = 5; // por 5 minutos
export const CIRCUIT_RESET_RATE_LIMIT = 3; // por hora

// Circuit breaker
export const CIRCUIT_FAILURE_THRESHOLD = 5;
export const CIRCUIT_RESET_TIMEOUT_MS = 60000;
export const CIRCUIT_SUCCESS_THRESHOLD = 2;

// Queue
export const QUEUE_MAX_CONCURRENCY = 3;
export const QUEUE_MAX_ATTEMPTS = 3;
export const QUEUE_RETRY_DELAY_MS = 5000;
export const QUEUE_JOB_TIMEOUT_MS = 120000;

// SRI retry limits
export const SRI_MAX_DAILY_RETRIES = parseInt(process.env.SRI_MAX_DAILY_RETRIES || '3', 10);
export const SRI_MAX_SEND_ATTEMPTS = parseInt(process.env.SRI_MAX_SEND_ATTEMPTS || '3', 10);

// SRI polling configuration
export const SRI_POLL_MAX_ATTEMPTS = 5;
export const SRI_POLL_INITIAL_DELAY_MS = 3000;
export const SRI_SEQUENTIAL_PLACEHOLDER = 'XXXXXXXXX';

// IVA Codes (SRI)
export const IVA_CODE_0 = '0';
export const IVA_CODE_12 = '2';
export const IVA_CODE_15 = '4';

// Tipos de documento
export const DOC_TYPE_FACTURA = '01';
export const DOC_TYPE_NOTA_CREDITO = '04';

// Timeout for SRI operations (in ms)
export const SRI_REQUEST_TIMEOUT_MS = parseInt(process.env.SRI_REQUEST_TIMEOUT_MS || '30000', 10);
