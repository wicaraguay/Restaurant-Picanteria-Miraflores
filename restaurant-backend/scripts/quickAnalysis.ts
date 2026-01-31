import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { BillModel } from '../src/infrastructure/database/schemas/BillSchema';

dotenv.config();

async function quickAnalysis() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db');

    const bills = await BillModel.find().sort({ date: -1 });

    const authorized = bills.filter(b => (b.sriStatus || '').toUpperCase() === 'AUTORIZADO');
    const failed = bills.filter(b => {
        const status = (b.sriStatus || '').toUpperCase();
        return status !== 'AUTORIZADO' && b.accessKey && !status.includes('PROCESO');
    });
    const pending = bills.filter(b => {
        const status = (b.sriStatus || '').toUpperCase();
        return status.includes('PROCESO') || status === 'RECIBIDA';
    });
    const noKey = bills.filter(b => !b.accessKey);

    console.log('\n========== RESUMEN DE FACTURAS ==========\n');
    console.log(`Total facturas:          ${bills.length}`);
    console.log(`Autorizadas (OK):        ${authorized.length}`);
    console.log(`Rechazadas/Fallidas:     ${failed.length}`);
    console.log(`En proceso:              ${pending.length}`);
    console.log(`Sin clave de acceso:     ${noKey.length}`);

    if (failed.length > 0) {
        console.log('\n========== FACTURAS RECHAZADAS ==========\n');
        failed.forEach((b, i) => {
            console.log(`${i + 1}. ${b.documentNumber}`);
            console.log(`   Cliente: ${b.customerName}`);
            console.log(`   Estado: ${b.sriStatus}`);
            console.log(`   Total: $${b.total.toFixed(2)}`);
            console.log(`   Accion: ELIMINAR y regenerar\n`);
        });
    }

    if (pending.length > 0) {
        console.log('\n========== FACTURAS EN PROCESO ==========\n');
        pending.forEach((b, i) => {
            console.log(`${i + 1}. ${b.documentNumber} | ${b.customerName} | $${b.total.toFixed(2)}`);
            console.log(`   Accion: Verificar estado con boton de refresh\n`);
        });
    }

    if (noKey.length > 0) {
        console.log('\n========== SIN CLAVE DE ACCESO ==========\n');
        noKey.forEach((b, i) => {
            console.log(`${i + 1}. ${b.documentNumber} | ${b.customerName} | $${b.total.toFixed(2)}`);
            console.log(`   Accion: Click en refresh para generar\n`);
        });
    }

    const totalAction = failed.length + pending.length + noKey.length;
    console.log('\n========== PLAN DE ACCION ==========\n');

    if (totalAction === 0) {
        console.log('¡Excelente! Todas tus facturas estan AUTORIZADAS.');
        console.log('No hay facturas que requieran atencion.\n');
    } else {
        console.log(`Tienes ${totalAction} facturas que requieren atencion:`);
        if (noKey.length > 0) console.log(`- ${noKey.length} sin clave: hacer click en refresh`);
        if (pending.length > 0) console.log(`- ${pending.length} en proceso: verificar estado`);
        if (failed.length > 0) console.log(`- ${failed.length} rechazadas: eliminar y regenerar\n`);
    }

    await mongoose.disconnect();
}

quickAnalysis().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
