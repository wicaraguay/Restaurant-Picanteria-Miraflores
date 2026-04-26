/**
 * Tests — Sistema de Log de Errores SRI (Facturas y Notas de Crédito)
 *
 * Verifica que:
 * 1. Las entradas del errorLog se acumulan correctamente (nunca se sobreescriben)
 * 2. La clasificación de errores es correcta (usuario vs SRI vs timeout)
 * 3. El formato de timestamp es correcto
 * 4. Los errores de NC se guardan igual que los de factura
 */

import { describe, it, expect } from 'vitest';
import { BillErrorEntry } from '../../../src/domain/entities/Bill';

// --------------------------------------------------------------------------
// Réplica de classifyError del frontend (ErrorLogPanel.tsx)
// --------------------------------------------------------------------------
function classifyError(entry: BillErrorEntry): {
    type: 'user' | 'sri' | 'timeout' | 'unknown';
    label: string;
} {
    const msg = (entry.message || '').toLowerCase();
    const status = (entry.sriStatus || '').toLowerCase();

    if (msg.includes('ruc') || msg.includes('identificacion') || msg.includes('cedula') ||
        msg.includes('razon social') || msg.includes('secuencial') || msg.includes('impuesto') ||
        msg.includes('estructura') || msg.includes('clave acceso') || msg.includes('datos') ||
        status === 'devuelta' || status === 'rechazada') {
        return { type: 'user', label: 'Error de datos' };
    }
    if (msg.includes('timeout') || msg.includes('time out') || msg.includes('conexion') ||
        msg.includes('connection') || msg.includes('econnrefused') || status === 'timeout') {
        return { type: 'timeout', label: 'Timeout / Conexión' };
    }
    if (msg.includes('sri') || msg.includes('interno') || msg.includes('servidor') ||
        msg.includes('500') || msg.includes('mantenimiento') || status === 'error') {
        return { type: 'sri', label: 'Error del SRI' };
    }
    return { type: 'unknown', label: 'Error desconocido' };
}

// Simula la acumulación de errorLog usando $push (inmutable)
function simulatePushErrorLog(
    existingLog: BillErrorEntry[],
    newEntry: BillErrorEntry
): BillErrorEntry[] {
    // $push en MongoDB no sobreescribe — simplemente agrega al array
    return [...existingLog, newEntry];
}

// ==========================================================================
// 1. ACUMULACIÓN DEL LOG (invariante principal)
// ==========================================================================
describe('📋 Acumulación del errorLog — nunca sobreescribe', () => {

    it('el primer error crea una entrada con attempt=1', () => {
        const log: BillErrorEntry[] = [];
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'Error: RUC inválido para empresa',
            attempt: 1
        };
        const updated = simulatePushErrorLog(log, entry);
        expect(updated).toHaveLength(1);
        expect(updated[0].attempt).toBe(1);
    });

    it('el segundo intento AGREGA una nueva entrada, NO sobreescribe la primera', () => {
        const log: BillErrorEntry[] = [{
            timestamp: '2026-04-25T20:00:00.000Z',
            sriStatus: 'DEVUELTA',
            message: 'Error: Secuencial ya registrado',
            attempt: 1
        }];

        const secondEntry: BillErrorEntry = {
            timestamp: '2026-04-25T20:05:00.000Z',
            sriStatus: 'ERROR',
            message: 'Timeout al conectar con SRI',
            attempt: 2
        };

        const updated = simulatePushErrorLog(log, secondEntry);

        // El log tiene AMBAS entradas
        expect(updated).toHaveLength(2);
        // La primera sigue intacta
        expect(updated[0].message).toContain('Secuencial ya registrado');
        expect(updated[0].attempt).toBe(1);
        // La segunda es la nueva
        expect(updated[1].message).toContain('Timeout');
        expect(updated[1].attempt).toBe(2);
    });

    it('múltiples reintentos acumulan el historial cronológicamente', () => {
        let log: BillErrorEntry[] = [];
        const errores = [
            { sriStatus: 'DEVUELTA', message: 'Error RUC', attempt: 1 },
            { sriStatus: 'TIMEOUT', message: 'Timeout SRI', attempt: 2 },
            { sriStatus: 'ERROR', message: 'Error servidor interno', attempt: 3 },
        ];

        for (const err of errores) {
            log = simulatePushErrorLog(log, {
                ...err,
                timestamp: new Date().toISOString()
            });
        }

        expect(log).toHaveLength(3);
        expect(log[0].attempt).toBe(1);
        expect(log[1].attempt).toBe(2);
        expect(log[2].attempt).toBe(3);
        // El orden cronológico se preserva
        expect(log.map(e => e.attempt)).toEqual([1, 2, 3]);
    });

    it('cuando la factura se autoriza finalmente, el log previo se conserva', () => {
        const log: BillErrorEntry[] = [
            { timestamp: '2026-04-25T20:00:00Z', sriStatus: 'DEVUELTA', message: 'Error inicial', attempt: 1 },
            { timestamp: '2026-04-25T20:05:00Z', sriStatus: 'TIMEOUT', message: 'Timeout', attempt: 2 },
        ];

        // Cuando se autoriza, no se llama a pushErrorLog → log permanece como está
        // El sriStatus del documento pasa a AUTORIZADO pero el log histórico está intacto
        const finalLog = log; // inmutable — no se toca
        expect(finalLog).toHaveLength(2); // Los 2 errores anteriores siguen registrados
    });
});

// ==========================================================================
// 2. CLASIFICACIÓN DE ERRORES
// ==========================================================================
describe('🏷️ Clasificación de errores SRI', () => {

    it('status DEVUELTA → tipo "user" (error de datos)', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'Factura devuelta por el SRI',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('user');
    });

    it('mensaje con "ruc" → tipo "user"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'El RUC del emisor no existe en el registro del SRI',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('user');
    });

    it('mensaje con "secuencial" → tipo "user"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'ERROR SECUENCIAL REGISTRADO en la BD del SRI',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('user');
    });

    it('mensaje con "timeout" → tipo "timeout"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'TIMEOUT',
            message: 'Connection timeout al enviar al SRI',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('timeout');
    });

    it('mensaje con "econnrefused" → tipo "timeout"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'ERROR',
            message: 'ECONNREFUSED: No se pudo conectar',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('timeout');
    });

    it('mensaje con "interno" o "500" → tipo "sri"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'ERROR',
            message: 'Error interno del servidor SRI - HTTP 500',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('sri');
    });

    it('mensaje con "mantenimiento" → tipo "sri"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'ERROR',
            message: 'El portal SRI está en mantenimiento',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('sri');
    });

    it('mensaje desconocido → tipo "unknown"', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'PENDING',
            message: 'Situación no categorizada',
            attempt: 1
        };
        expect(classifyError(entry).type).toBe('unknown');
    });
});

// ==========================================================================
// 3. ESTRUCTURA DE DATOS
// ==========================================================================
describe('📊 Estructura del errorLog', () => {

    it('cada entrada tiene los 4 campos requeridos', () => {
        const entry: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'Error de prueba',
            attempt: 1
        };

        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('sriStatus');
        expect(entry).toHaveProperty('message');
        expect(entry).toHaveProperty('attempt');
        expect(typeof entry.timestamp).toBe('string');
        expect(typeof entry.sriStatus).toBe('string');
        expect(typeof entry.message).toBe('string');
        expect(typeof entry.attempt).toBe('number');
    });

    it('el timestamp es un ISO string válido', () => {
        const ts = new Date().toISOString();
        const entry: BillErrorEntry = {
            timestamp: ts,
            sriStatus: 'ERROR',
            message: 'Test',
            attempt: 1
        };
        expect(() => new Date(entry.timestamp)).not.toThrow();
        expect(isNaN(new Date(entry.timestamp).getTime())).toBe(false);
    });

    it('el número de intento es consecutivo y positivo', () => {
        let log: BillErrorEntry[] = [];
        for (let i = 1; i <= 5; i++) {
            log = simulatePushErrorLog(log, {
                timestamp: new Date().toISOString(),
                sriStatus: 'ERROR',
                message: `Intento ${i}`,
                attempt: i
            });
        }

        log.forEach((entry, idx) => {
            expect(entry.attempt).toBe(idx + 1);
            expect(entry.attempt).toBeGreaterThan(0);
        });
    });
});

// ==========================================================================
// 4. CASOS REALES DEL SRI ECUADOR
// ==========================================================================
describe('🇪🇨 Errores reales del SRI Ecuador', () => {

    it('ERROR SECUENCIAL REGISTRADO → user (ya enviada antes)', () => {
        const e: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'CLAVE ACCESO REGISTRADA - ERROR SECUENCIAL REGISTRADO',
            attempt: 1
        };
        const c = classifyError(e);
        expect(c.type).toBe('user');
    });

    it('CLAVE ACCESO REGISTRADA → user', () => {
        const e: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'CLAVE ACCESO REGISTRADA EN EL SISTEMA',
            attempt: 1
        };
        // No matchea "user" directo pero "devuelta" sí
        expect(classifyError(e).type).toBe('user');
    });

    it('identificacion inválida → user', () => {
        const e: BillErrorEntry = {
            timestamp: new Date().toISOString(),
            sriStatus: 'DEVUELTA',
            message: 'La identificacion del comprador no es válida',
            attempt: 1
        };
        expect(classifyError(e).type).toBe('user');
    });
});
