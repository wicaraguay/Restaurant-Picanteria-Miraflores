/**
 * Tests Unitarios + Integración — MongoRestaurantConfigRepository
 *
 * Cubre los bugs corregidos:
 *  1. fiscalAddress se guarda y recupera correctamente
 *  2. taxRate dentro de billing se guarda sin borrar el resto de billing
 *  3. Actualizar billing.taxRate NO destruye currentSequenceFactura ni régimen
 *  4. Actualizar fiscalAddress NO destruye campos de billing
 *
 * Usa mongodb-memory-server para no necesitar una BD real.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoRestaurantConfigRepository } from '../../../src/infrastructure/repositories/MongoRestaurantConfigRepository';

// --------------------------------------------------------------------------
// Setup / Teardown
// --------------------------------------------------------------------------
let mongod: MongoMemoryServer;
let repo: MongoRestaurantConfigRepository;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    repo = new MongoRestaurantConfigRepository();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    // Limpiar colección antes de cada test para independencia total
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// --------------------------------------------------------------------------
// CONSTANTE: config base que se usa en todos los tests
// --------------------------------------------------------------------------
const BASE_CONFIG = {
    name: 'Picantería Test',
    phone: '+593 99 000 0000',
    email: 'test@test.com',
    address: 'Av. Test 123, Loja',
    ruc: '1109876543001',
    businessName: 'Restaurante Test CIA. LTDA.',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/Guayaquil',
    locale: 'es-EC',
    brandColors: { primary: '#000', secondary: '#111', accent: '#222' },
    billing: {
        establishment: '001',
        emissionPoint: '001',
        regime: 'General' as const,
        taxRate: 15,
        currentSequenceFactura: 10,
        currentSequenceNotaCredito: 5,
        currentSequenceNotaVenta: 2,
    },
};

// ==========================================================================
// 1. TESTS UNITARIOS — Persistencia básica
// ==========================================================================
describe('📦 Unit — getOrCreate()', () => {
    it('crea la config por defecto si no existe en BD', async () => {
        const config = await repo.getOrCreate();
        expect(config).toBeDefined();
        expect(config.billing).toBeDefined();
        expect(config.billing.taxRate).toBe(15);
    });

    it('retorna null en get() si no hay config', async () => {
        const config = await repo.get();
        expect(config).toBeNull();
    });
});

// ==========================================================================
// 2. TESTS DE INTEGRACIÓN — fiscalAddress
// ==========================================================================
describe('🏠 Integración — fiscalAddress (dirección en factura)', () => {
    it('guarda fiscalAddress y se puede recuperar', async () => {
        // Crear config base
        await repo.update({ ...BASE_CONFIG });

        // Actualizar con dirección fiscal
        const updated = await repo.update({
            fiscalAddress: 'Av. Eugenio Espejo S/N, Miraflores, Loja',
        });

        expect(updated.fiscalAddress).toBe('Av. Eugenio Espejo S/N, Miraflores, Loja');
    });

    it('get() devuelve fiscalAddress después de guardar', async () => {
        await repo.update({ ...BASE_CONFIG, fiscalAddress: 'Calle Principal 456' });

        const fetched = await repo.get();
        expect(fetched).not.toBeNull();
        expect(fetched!.fiscalAddress).toBe('Calle Principal 456');
    });

    it('actualizar fiscalAddress NO borra campos de billing', async () => {
        // Guardar config completa
        await repo.update({ ...BASE_CONFIG });

        // Actualizar SOLO fiscalAddress
        await repo.update({ fiscalAddress: 'Nueva Dirección Fiscal' });

        const fetched = await repo.get();
        expect(fetched).not.toBeNull();

        // fiscalAddress debe estar guardado
        expect(fetched!.fiscalAddress).toBe('Nueva Dirección Fiscal');

        // ⚠️ CRÍTICO: billing NO debe haberse borrado
        expect(fetched!.billing.establishment).toBe('001');
        expect(fetched!.billing.regime).toBe('General');
        expect(fetched!.billing.taxRate).toBe(15);
        expect(fetched!.billing.currentSequenceFactura).toBe(10);
        expect(fetched!.billing.currentSequenceNotaCredito).toBe(5);
    });

    it('fiscalAddress puede actualizarse a string vacío', async () => {
        await repo.update({ ...BASE_CONFIG, fiscalAddress: 'Dirección Antigua' });
        await repo.update({ fiscalAddress: '' });

        const fetched = await repo.get();
        expect(fetched!.fiscalAddress).toBe('');
    });
});

// ==========================================================================
// 3. TESTS DE INTEGRACIÓN — taxRate (IVA)
// ==========================================================================
describe('💰 Integración — billing.taxRate (tarifa IVA)', () => {
    it('guarda taxRate=15 por defecto', async () => {
        await repo.update({ ...BASE_CONFIG });
        const fetched = await repo.get();
        expect(fetched!.billing.taxRate).toBe(15);
    });

    it('actualizar billing.taxRate a 12 lo persiste correctamente', async () => {
        await repo.update({ ...BASE_CONFIG });

        await repo.update({
            billing: { ...BASE_CONFIG.billing, taxRate: 12 },
        });

        const fetched = await repo.get();
        expect(fetched!.billing.taxRate).toBe(12);
    });

    it('⚠️ CRÍTICO: cambiar taxRate NO destruye currentSequenceFactura', async () => {
        // Guardar con secuencial 10
        await repo.update({ ...BASE_CONFIG });

        // Cambiar SOLO el taxRate
        await repo.update({
            billing: { ...BASE_CONFIG.billing, taxRate: 8 },
        });

        const fetched = await repo.get();
        expect(fetched!.billing.taxRate).toBe(8);

        // ⚠️ Los secuenciales deben sobrevivir intactos
        expect(fetched!.billing.currentSequenceFactura).toBe(10);
        expect(fetched!.billing.currentSequenceNotaCredito).toBe(5);
        expect(fetched!.billing.currentSequenceNotaVenta).toBe(2);
        expect(fetched!.billing.establishment).toBe('001');
        expect(fetched!.billing.emissionPoint).toBe('001');
        expect(fetched!.billing.regime).toBe('General');
    });

    it('taxRate acepta valor 0 (tarifa cero)', async () => {
        await repo.update({ ...BASE_CONFIG });
        await repo.update({ billing: { ...BASE_CONFIG.billing, taxRate: 0 } });

        const fetched = await repo.get();
        expect(fetched!.billing.taxRate).toBe(0);
    });

    it('taxRate acepta decimales (ej: 12.5)', async () => {
        await repo.update({ ...BASE_CONFIG });
        await repo.update({ billing: { ...BASE_CONFIG.billing, taxRate: 12.5 } });

        const fetched = await repo.get();
        expect(fetched!.billing.taxRate).toBe(12.5);
    });
});

// ==========================================================================
// 4. TESTS DE INTEGRACIÓN — Guardado combinado (todo junto)
// ==========================================================================
describe('🔄 Integración — Guardado combinado (fiscalAddress + taxRate + billing)', () => {
    it('guardar fiscalAddress + billing completo en una sola llamada', async () => {
        const result = await repo.update({
            ...BASE_CONFIG,
            fiscalAddress: 'Av. Amazonas N34-451, Quito',
            billing: {
                ...BASE_CONFIG.billing,
                taxRate: 12,
                currentSequenceFactura: 99,
            },
        });

        expect(result.fiscalAddress).toBe('Av. Amazonas N34-451, Quito');
        expect(result.billing.taxRate).toBe(12);
        expect(result.billing.currentSequenceFactura).toBe(99);
        expect(result.billing.establishment).toBe('001');
        expect(result.billing.regime).toBe('General');
    });

    it('múltiples actualizaciones sucesivas no pierden datos', async () => {
        // Paso 1: config inicial
        await repo.update({ ...BASE_CONFIG });

        // Paso 2: dirección fiscal
        await repo.update({ fiscalAddress: 'Dirección Final' });

        // Paso 3: cambio de IVA
        await repo.update({ billing: { ...BASE_CONFIG.billing, taxRate: 5 } });

        // Paso 4: cambio de régimen
        await repo.update({
            billing: { ...BASE_CONFIG.billing, taxRate: 5, regime: 'RIMPE - Emprendedor' },
        });

        const fetched = await repo.get();
        expect(fetched!.fiscalAddress).toBe('Dirección Final');      // no se perdió
        expect(fetched!.billing.taxRate).toBe(5);                    // actualizado
        expect(fetched!.billing.regime).toBe('RIMPE - Emprendedor'); // actualizado
        expect(fetched!.billing.currentSequenceFactura).toBe(10);    // intacto
    });
});

// ==========================================================================
// 5. TEST — mapToEntity incluye todos los campos nuevos
// ==========================================================================
describe('🗺️  mapToEntity — todos los campos se mapean correctamente', () => {
    it('get() incluye fiscalAddress, taxRate y agenteRetencion en la respuesta', async () => {
        await repo.update({
            ...BASE_CONFIG,
            fiscalAddress: 'Calle Bolívar 1-23',
            billing: {
                ...BASE_CONFIG.billing,
                taxRate: 15,
                agenteRetencion: '5368',
            },
        });

        const fetched = await repo.get();
        expect(fetched).not.toBeNull();
        expect(fetched!.fiscalAddress).toBe('Calle Bolívar 1-23');
        expect(fetched!.billing.taxRate).toBe(15);
        expect(fetched!.billing.agenteRetencion).toBe('5368');
    });
});
