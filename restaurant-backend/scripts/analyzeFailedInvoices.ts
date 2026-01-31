/**
 * Script: Analyze Failed Invoices
 * 
 * This script analyzes the database to find all failed/rejected invoices
 * and provides a detailed report with recommendations for each one.
 * 
 * Usage:
 *   npx ts-node scripts/analyzeFailedInvoices.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { BillModel } from '../src/infrastructure/database/schemas/BillSchema';
import { OrderModel } from '../src/infrastructure/database/schemas/OrderSchema';

dotenv.config();

interface FailedBill {
    id: string;
    documentNumber: string;
    date: string;
    customerName: string;
    customerIdentification: string;
    total: number;
    sriStatus: string;
    accessKey?: string;
    orderId?: string;
    environment: string;
}

async function analyzeFailedInvoices() {
    try {
        console.log('🔌 Connecting to MongoDB...\n');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Query all bills
        console.log('📊 Analyzing bills in database...\n');
        const allBills = await BillModel.find().sort({ date: -1 });
        console.log(`Found ${allBills.length} total bills\n`);

        // Categorize bills
        const authorized: FailedBill[] = [];
        const failed: FailedBill[] = [];
        const pending: FailedBill[] = [];
        const noAccessKey: FailedBill[] = [];

        for (const bill of allBills) {
            const billData: FailedBill = {
                id: bill._id.toString(),
                documentNumber: bill.documentNumber,
                date: new Date(bill.date).toLocaleDateString('es-EC'),
                customerName: bill.customerName,
                customerIdentification: bill.customerIdentification,
                total: bill.total,
                sriStatus: bill.sriStatus || 'UNKNOWN',
                accessKey: bill.accessKey,
                orderId: bill.orderId,
                environment: bill.environment === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'
            };

            const status = (bill.sriStatus || '').toUpperCase();

            if (status === 'AUTORIZADO') {
                authorized.push(billData);
            } else if (!bill.accessKey) {
                noAccessKey.push(billData);
            } else if (status.includes('PROCESO') || status === 'RECIBIDA' || status === 'SENT') {
                pending.push(billData);
            } else {
                failed.push(billData);
            }
        }

        // Print Summary
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('                    📋 RESUMEN DE FACTURAS                         ');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        console.log(`✅ AUTORIZADAS:           ${authorized.length} facturas`);
        console.log(`🔴 RECHAZADAS/FALLIDAS:   ${failed.length} facturas`);
        console.log(`🟡 EN PROCESO:            ${pending.length} facturas`);
        console.log(`🟠 SIN CLAVE DE ACCESO:   ${noAccessKey.length} facturas`);
        console.log(`📊 TOTAL:                 ${allBills.length} facturas\n`);

        // Print Failed Bills
        if (failed.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('              🔴 FACTURAS RECHAZADAS/FALLIDAS                      ');
            console.log('═══════════════════════════════════════════════════════════════════\n');
            console.log('Estas facturas fueron RECHAZADAS por el SRI y deben ser eliminadas');
            console.log('y regeneradas con nuevos secuenciales.\n');

            failed.forEach((bill, index) => {
                console.log(`── Factura ${index + 1}/${failed.length} ──────────────────────────────────────`);
                console.log(`   📄 Número:     ${bill.documentNumber}`);
                console.log(`   📅 Fecha:      ${bill.date}`);
                console.log(`   👤 Cliente:    ${bill.customerName} (${bill.customerIdentification})`);
                console.log(`   💰 Total:      $${bill.total.toFixed(2)}`);
                console.log(`   🏷️  Estado:     ${bill.sriStatus}`);
                console.log(`   🌍 Entorno:    ${bill.environment}`);
                console.log(`   🔑 Clave:      ${bill.accessKey?.substring(0, 20)}...`);
                console.log(`   📋 Orden ID:   ${bill.orderId || 'N/A'}`);
                console.log(`   `);
                console.log(`   ⚠️  ACCIÓN RECOMENDADA:`);
                console.log(`      1. Eliminar esta factura del historial (botón 🗑️)`);
                if (bill.orderId) {
                    console.log(`      2. Buscar la orden ${bill.orderId} en "Gestión de Órdenes"`);
                    console.log(`      3. Generar nueva factura desde la orden`);
                } else {
                    console.log(`      2. Crear nueva factura manualmente para este cliente`);
                }
                console.log(`      4. La nueva factura obtendrá un secuencial único`);
                console.log('');
            });
        }

        // Print Pending Bills
        if (pending.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('                   🟡 FACTURAS EN PROCESO                          ');
            console.log('═══════════════════════════════════════════════════════════════════\n');
            console.log('Estas facturas fueron enviadas al SRI pero aún no están autorizadas.\n');

            pending.forEach((bill, index) => {
                console.log(`── Factura ${index + 1}/${pending.length} ──────────────────────────────────────`);
                console.log(`   📄 Número:     ${bill.documentNumber}`);
                console.log(`   📅 Fecha:      ${bill.date}`);
                console.log(`   👤 Cliente:    ${bill.customerName}`);
                console.log(`   💰 Total:      $${bill.total.toFixed(2)}`);
                console.log(`   🏷️  Estado:     ${bill.sriStatus}`);
                console.log(`   `);
                console.log(`   ⚠️  ACCIÓN RECOMENDADA:`);
                console.log(`      1. Hacer clic en botón 🔄 en el historial de facturas`);
                console.log(`      2. El sistema verificará el estado actual en el SRI`);
                console.log(`      3. Si está AUTORIZADA → Se enviará email automáticamente`);
                console.log(`      4. Si sigue EN PROCESO → Esperar más tiempo`);
                console.log(`      5. Si NO AUTORIZADA → Eliminar y generar nueva`);
                console.log('');
            });
        }

        // Print No Access Key Bills
        if (noAccessKey.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('               🟠 FACTURAS SIN CLAVE DE ACCESO                     ');
            console.log('═══════════════════════════════════════════════════════════════════\n');
            console.log('Estas facturas nunca fueron enviadas al SRI.\n');

            noAccessKey.forEach((bill, index) => {
                console.log(`── Factura ${index + 1}/${noAccessKey.length} ──────────────────────────────────────`);
                console.log(`   📄 Número:     ${bill.documentNumber}`);
                console.log(`   📅 Fecha:      ${bill.date}`);
                console.log(`   👤 Cliente:    ${bill.customerName}`);
                console.log(`   💰 Total:      $${bill.total.toFixed(2)}`);
                console.log(`   `);
                console.log(`   ⚠️  ACCIÓN RECOMENDADA:`);
                console.log(`      1. Hacer clic en botón 🔄 en el historial`);
                console.log(`      2. Se generará automáticamente una nueva factura`);
                console.log(`      3. Con nuevo secuencial y nueva clave de acceso`);
                console.log('');
            });
        }

        // Print Action Plan
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('                     📝 PLAN DE ACCIÓN                              ');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const totalToFix = failed.length + pending.length + noAccessKey.length;

        if (totalToFix === 0) {
            console.log('✅ ¡Excelente! No hay facturas fallidas que requieran atención.\n');
            console.log('Todas tus facturas están AUTORIZADAS correctamente.\n');
        } else {
            console.log(`⚠️  Tienes ${totalToFix} facturas que requieren atención:\n`);

            if (failed.length > 0) {
                console.log(`   🔴 ${failed.length} facturas RECHAZADAS:`);
                console.log(`      → Eliminar del historial (botón 🗑️)`);
                console.log(`      → Generar nuevas desde las órdenes originales\n`);
            }

            if (pending.length > 0) {
                console.log(`   🟡 ${pending.length} facturas EN PROCESO:`);
                console.log(`      → Verificar estado con botón 🔄`);
                console.log(`      → Esperar o regenerar si es necesario\n`);
            }

            if (noAccessKey.length > 0) {
                console.log(`   🟠 ${noAccessKey.length} facturas SIN CLAVE:`);
                console.log(`      → Hacer clic en botón 🔄`);
                console.log(`      → Se generarán automáticamente\n`);
            }

            console.log('📋 RECOMENDACIÓN:');
            console.log('   1. Abre el módulo "Historial de Facturas"');
            console.log('   2. Procesa las facturas en este orden:');
            console.log('      a) Primero las SIN CLAVE (más fácil, 1 clic)');
            console.log('      b) Luego las EN PROCESO (verificar estado)');
            console.log('      c) Finalmente las RECHAZADAS (eliminar y regenerar)');
            console.log('   3. Usa los filtros para encontrar facturas específicas');
            console.log('   4. Las nuevas facturas tendrán secuenciales únicos\n');
        }

        // Export CSV Report
        if (totalToFix > 0) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('                    💾 EXPORTAR REPORTE                            ');
            console.log('═══════════════════════════════════════════════════════════════════\n');
            console.log('Para exportar un reporte CSV de todas las facturas fallidas,');
            console.log('usa el botón "Exportar CSV" en el módulo de Historial de Facturas.\n');
        }

        console.log('✅ Análisis completado\n');

    } catch (error) {
        console.error('\n❌ Error during analysis:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

// Run the analysis
analyzeFailedInvoices()
    .then(() => {
        console.log('✅ Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
