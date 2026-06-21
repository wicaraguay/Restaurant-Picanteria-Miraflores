/**
 * CircuitBreaker.test.ts
 * Comprehensive unit tests for the Circuit Breaker pattern implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    CircuitBreaker,
    CircuitState,
    CircuitOpenError,
    getCircuitBreaker,
    getAllCircuitStates
} from './CircuitBreaker';

// Mock the logger to avoid console noise during tests
vi.mock('./Logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn()
    }
}));

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        vi.useFakeTimers();
        circuitBreaker = new CircuitBreaker({
            name: 'test-circuit',
            failureThreshold: 3,
            resetTimeout: 5000, // 5 seconds for faster tests
            successThreshold: 2
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('Estado inicial', () => {
        it('debe inicializarse en estado CLOSED', () => {
            const state = circuitBreaker.getState();
            expect(state.state).toBe(CircuitState.CLOSED);
            expect(state.failures).toBe(0);
            expect(state.successes).toBe(0);
            expect(state.lastFailureTime).toBeNull();
            expect(state.nextAttemptTime).toBeNull();
        });

        it('debe permitir ejecución en estado inicial', () => {
            expect(circuitBreaker.isAvailable()).toBe(true);
        });
    });

    describe('Ejecución exitosa', () => {
        it('debe ejecutar funciones exitosas sin cambiar estado', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            const result = await circuitBreaker.execute(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledOnce();
            expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
            expect(circuitBreaker.getState().failures).toBe(0);
        });

        it('debe resetear el contador de failures después de un éxito', async () => {
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            const successFn = vi.fn().mockResolvedValue('ok');

            // Generar un fallo
            await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            expect(circuitBreaker.getState().failures).toBe(1);

            // Luego un éxito
            await circuitBreaker.execute(successFn);
            expect(circuitBreaker.getState().failures).toBe(0);
        });
    });

    describe('Manejo de errores', () => {
        it('debe incrementar failures en errores transient', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(1);
            expect(circuitBreaker.getState().lastFailureTime).not.toBeNull();
        });

        it('debe abrir circuito después de threshold failures', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

            // Fail threshold times (3)
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();
            }

            const state = circuitBreaker.getState();
            expect(state.state).toBe(CircuitState.OPEN);
            expect(state.failures).toBe(3);
            expect(state.nextAttemptTime).not.toBeNull();
        });

        it('no debe incrementar failures para errores no-transient', async () => {
            const validationError = new Error('Secuencial inválido');
            const fn = vi.fn().mockRejectedValue(validationError);

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(0);
            expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
        });
    });

    describe('Estado OPEN', () => {
        beforeEach(async () => {
            // Force circuit to OPEN by triggering threshold failures
            const fn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();
            }
        });

        it('debe lanzar CircuitOpenError cuando circuito está OPEN', async () => {
            const fn = vi.fn().mockResolvedValue('should not be called');

            await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitOpenError);
            expect(fn).not.toHaveBeenCalled();
        });

        it('CircuitOpenError debe contener información de espera', async () => {
            const fn = vi.fn().mockResolvedValue('test');

            try {
                await circuitBreaker.execute(fn);
                expect.fail('Should have thrown CircuitOpenError');
            } catch (error) {
                expect(error).toBeInstanceOf(CircuitOpenError);
                expect((error as CircuitOpenError).isCircuitOpen).toBe(true);
                expect((error as CircuitOpenError).waitTimeSeconds).toBeGreaterThan(0);
                expect((error as CircuitOpenError).message).toContain('temporalmente no disponible');
            }
        });

        it('debe bloquear todas las peticiones en estado OPEN', async () => {
            const fn1 = vi.fn().mockResolvedValue('test1');
            const fn2 = vi.fn().mockResolvedValue('test2');

            await expect(circuitBreaker.execute(fn1)).rejects.toThrow(CircuitOpenError);
            await expect(circuitBreaker.execute(fn2)).rejects.toThrow(CircuitOpenError);

            expect(fn1).not.toHaveBeenCalled();
            expect(fn2).not.toHaveBeenCalled();
        });
    });

    describe('Transición a HALF_OPEN', () => {
        beforeEach(async () => {
            // Force circuit to OPEN
            const fn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();
            }
        });

        it('debe pasar a HALF_OPEN después de resetTimeout', async () => {
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);

            // Advance time past resetTimeout (5000ms)
            vi.advanceTimersByTime(5000);

            // Next execution should trigger HALF_OPEN
            const fn = vi.fn().mockResolvedValue('test');
            await circuitBreaker.execute(fn);

            expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);
        });

        it('no debe permitir ejecución antes de resetTimeout', async () => {
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);

            // Advance time but not enough
            vi.advanceTimersByTime(2000);

            const fn = vi.fn().mockResolvedValue('test');
            await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitOpenError);

            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe('Estado HALF_OPEN', () => {
        beforeEach(async () => {
            // Force circuit to OPEN
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            // Advance time to trigger HALF_OPEN
            vi.advanceTimersByTime(5000);
        });

        it('debe permitir ejecución en estado HALF_OPEN', async () => {
            const fn = vi.fn().mockResolvedValue('test');

            const result = await circuitBreaker.execute(fn);

            expect(result).toBe('test');
            expect(fn).toHaveBeenCalledOnce();
        });

        it('debe cerrar circuito después de successThreshold éxitos consecutivos', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            // First success (successThreshold = 2)
            await circuitBreaker.execute(fn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);
            expect(circuitBreaker.getState().successes).toBe(1);

            // Second success should close circuit
            await circuitBreaker.execute(fn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
            expect(circuitBreaker.getState().successes).toBe(0);
            expect(circuitBreaker.getState().failures).toBe(0);
        });

        it('debe reabrir circuito si falla en HALF_OPEN', async () => {
            const successFn = vi.fn().mockResolvedValue('ok');
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

            // First success
            await circuitBreaker.execute(successFn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);
            expect(circuitBreaker.getState().successes).toBe(1);

            // Failure should reopen circuit
            await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);
            expect(circuitBreaker.getState().nextAttemptTime).not.toBeNull();
        });
    });

    describe('isTransientError detection', () => {
        it('debe detectar errores de red como transient', async () => {
            const networkErrors = [
                new Error('ECONNREFUSED'),
                new Error('ETIMEDOUT'),
                new Error('ENOTFOUND'),
                new Error('ECONNRESET')
            ];

            for (const error of networkErrors) {
                (error as any).code = error.message;
                const fn = vi.fn().mockRejectedValue(error);
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();

                // Should increment failures for transient errors
                expect(circuitBreaker.getState().failures).toBeGreaterThan(0);

                // Reset for next test
                circuitBreaker.reset();
            }
        });

        it('debe detectar errores 500 como transient', async () => {
            const serverError = new Error('Error 500');
            const fn = vi.fn().mockRejectedValue(serverError);

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(1);
        });

        it('debe detectar errores del SRI como transient', async () => {
            const sriErrors = [
                new Error('servicio del sri no disponible'),
                new Error('temporalmente no disponible'),
                new Error('problemas internos en el servicio')
            ];

            for (const error of sriErrors) {
                const fn = vi.fn().mockRejectedValue(error);
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();

                expect(circuitBreaker.getState().failures).toBeGreaterThan(0);
                circuitBreaker.reset();
            }
        });

        it('debe detectar errores de validación como NO transient', async () => {
            const validationErrors = [
                new Error('secuencial inválido'),
                new Error('firma incorrecta'),
                new Error('identificación no válida'),
                new Error('RUC incorrecto'),
                new Error('clave de acceso inválida')
            ];

            for (const error of validationErrors) {
                const fn = vi.fn().mockRejectedValue(error);
                await expect(circuitBreaker.execute(fn)).rejects.toThrow();

                // Should NOT increment failures for validation errors
                expect(circuitBreaker.getState().failures).toBe(0);
            }
        });

        it('debe detectar axios errors con status >= 500 como transient', async () => {
            const axiosError = new Error('Server error');
            (axiosError as any).response = { status: 503 };
            const fn = vi.fn().mockRejectedValue(axiosError);

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(1);
        });

        it('debe detectar axios errors 4xx como NO transient', async () => {
            const axiosError = new Error('Bad request');
            (axiosError as any).response = { status: 400 };
            const fn = vi.fn().mockRejectedValue(axiosError);

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(0);
        });

        it('debe tratar errores desconocidos como transient por defecto', async () => {
            const unknownError = new Error('Unknown error');
            const fn = vi.fn().mockRejectedValue(unknownError);

            await expect(circuitBreaker.execute(fn)).rejects.toThrow();

            expect(circuitBreaker.getState().failures).toBe(1);
        });
    });

    describe('getCircuitBreaker singleton', () => {
        it('debe retornar singleton por nombre', () => {
            const cb1 = getCircuitBreaker('service-a');
            const cb2 = getCircuitBreaker('service-a');

            expect(cb1).toBe(cb2);
        });

        it('debe crear instancias diferentes para nombres diferentes', () => {
            const cb1 = getCircuitBreaker('service-a');
            const cb2 = getCircuitBreaker('service-b');

            expect(cb1).not.toBe(cb2);
        });

        it('debe aplicar opciones en la primera creación', () => {
            const cb = getCircuitBreaker('custom-service', {
                failureThreshold: 10
            });

            // Force failures to check threshold
            const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

            // Should NOT open after 3 failures (default) but wait for 10
            const runFailures = async (count: number) => {
                for (let i = 0; i < count; i++) {
                    await expect(cb.execute(fn)).rejects.toThrow();
                }
            };

            runFailures(9).then(() => {
                expect(cb.getState().state).toBe(CircuitState.CLOSED);
            });
        });

        it('debe ignorar opciones en llamadas subsecuentes', () => {
            const cb1 = getCircuitBreaker('existing-service', {
                failureThreshold: 5
            });

            const cb2 = getCircuitBreaker('existing-service', {
                failureThreshold: 100 // This should be ignored
            });

            expect(cb1).toBe(cb2);
        });
    });

    describe('getAllCircuitStates', () => {
        it('debe retornar todos los estados de circuit breakers', () => {
            const cb1 = getCircuitBreaker('service-1');
            const cb2 = getCircuitBreaker('service-2');

            const states = getAllCircuitStates();

            expect(states).toHaveProperty('service-1');
            expect(states).toHaveProperty('service-2');
            expect(states['service-1'].state).toBe(CircuitState.CLOSED);
            expect(states['service-2'].state).toBe(CircuitState.CLOSED);
        });

        it('debe reflejar estados actuales', async () => {
            const cb = getCircuitBreaker('monitored-service', {
                failureThreshold: 2,
                resetTimeout: 5000,
                successThreshold: 2
            });

            // Trigger OPEN state
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 2; i++) {
                await expect(cb.execute(failFn)).rejects.toThrow();
            }

            const states = getAllCircuitStates();
            expect(states['monitored-service'].state).toBe(CircuitState.OPEN);
            expect(states['monitored-service'].failures).toBe(2);
        });
    });

    describe('reset()', () => {
        it('debe resetear completamente el estado del circuit breaker', async () => {
            // Force OPEN state
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);

            // Reset
            circuitBreaker.reset();

            const state = circuitBreaker.getState();
            expect(state.state).toBe(CircuitState.CLOSED);
            expect(state.failures).toBe(0);
            expect(state.successes).toBe(0);
            expect(state.lastFailureTime).toBeNull();
            expect(state.nextAttemptTime).toBeNull();
        });

        it('debe permitir ejecución inmediatamente después de reset', async () => {
            // Force OPEN state
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            // Should reject in OPEN state
            const blockedFn = vi.fn().mockResolvedValue('blocked');
            await expect(circuitBreaker.execute(blockedFn)).rejects.toThrow(CircuitOpenError);

            // Reset and try again
            circuitBreaker.reset();

            const successFn = vi.fn().mockResolvedValue('allowed');
            const result = await circuitBreaker.execute(successFn);

            expect(result).toBe('allowed');
            expect(successFn).toHaveBeenCalledOnce();
        });
    });

    describe('Transiciones de estado completas', () => {
        it('debe completar ciclo CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
            const failFn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
            const successFn = vi.fn().mockResolvedValue('ok');

            // CLOSED state
            expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);

            // Trigger failures to open circuit
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            // OPEN state
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);
            await expect(circuitBreaker.execute(successFn)).rejects.toThrow(CircuitOpenError);

            // Wait for resetTimeout
            vi.advanceTimersByTime(5000);

            // HALF_OPEN state (after first success)
            await circuitBreaker.execute(successFn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);

            // Back to CLOSED (after second success)
            await circuitBreaker.execute(successFn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
        });

        it('debe manejar ciclo CLOSED -> OPEN -> HALF_OPEN -> OPEN', async () => {
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            const successFn = vi.fn().mockResolvedValue('ok');

            // CLOSED -> OPEN
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);

            // Wait for resetTimeout
            vi.advanceTimersByTime(5000);

            // OPEN -> HALF_OPEN
            await circuitBreaker.execute(successFn);
            expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);

            // HALF_OPEN -> OPEN (on failure)
            await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);
        });
    });

    describe('isAvailable()', () => {
        it('debe retornar true en estado CLOSED', () => {
            expect(circuitBreaker.isAvailable()).toBe(true);
        });

        it('debe retornar false en estado OPEN antes de resetTimeout', async () => {
            // Force OPEN
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            expect(circuitBreaker.isAvailable()).toBe(false);
        });

        it('debe retornar true en estado HALF_OPEN', async () => {
            // Force OPEN
            const failFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
            }

            // Advance to HALF_OPEN
            vi.advanceTimersByTime(5000);

            expect(circuitBreaker.isAvailable()).toBe(true);
        });
    });
});
