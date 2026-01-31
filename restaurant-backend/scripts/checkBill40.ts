import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { BillModel } from '../src/infrastructure/database/schemas/BillSchema';

dotenv.config();

async function checkBill40() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db');

    const bill = await BillModel.findOne({ documentNumber: /000000040/ });

    if (bill) {
        console.log('\n=== FACTURA SECUENCIAL 40 ===\n');
        console.log('Numero:', bill.documentNumber);
        console.log('Estado SRI:', bill.sriStatus);
        console.log('Clave Acceso:', bill.accessKey);
        console.log('Fecha:', new Date(bill.date).toLocaleString('es-EC'));
        console.log('Cliente:', bill.customerName);
        console.log('Total: $' + bill.total.toFixed(2));
        console.log('\n=== ACCION REQUERIDA ===\n');
        console.log('Esta factura tiene el error de codigo estatico.');
        console.log('Debes ELIMINARLA del historial y generar una NUEVA.');
        console.log('La nueva factura usara codigo aleatorio y funcionara.\n');
    } else {
        console.log('\nNo se encontro factura con secuencial 040\n');
    }

    await mongoose.disconnect();
}

checkBill40().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
