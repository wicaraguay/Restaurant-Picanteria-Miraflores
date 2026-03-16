import dotenv from 'dotenv';
dotenv.config();

import { container } from '../src/infrastructure/di/DIContainer';
import { Invoice } from '../src/domain/billing/invoice';

async function testManualEmail() {
    console.log('--- Iniciando Prueba Manual de Resend ---');
    
    const emailService = container.getEmailService();
    const testEmail = process.env.TEST_EMAIL;
    const fromEmail = process.env.SMTP_FROM;

    if (!testEmail || testEmail === 'tu-email@ejemplo.com') {
        console.error('❌ ERROR: Debes configurar TEST_EMAIL en tu .env con TU correo personal.');
        return;
    }

    if (fromEmail && fromEmail.includes('@gmail.com')) {
        console.warn('⚠️ ADVERTENCIA: Estás intentando enviar desde un correo @gmail.com.');
        console.warn('Resend no permite esto sin verificar el dominio. Para pruebas usa: SMTP_FROM=onboarding@resend.dev');
    }
    
    const mockInvoice = {
        info: {
            estab: '001',
            ptoEmi: '001',
            secuencial: '999999999',
            nombreComercial: 'Restaurante Prueba',
            razonSocialComprador: 'Cliente de Prueba',
            razonSocial: 'Empresa S.A.',
            dirMatriz: 'Av. Siempre Viva 123',
            importeTotal: 25.50,
            logoUrl: process.env.BUSINESS_LOGO_URL || ''
        },
        creationDate: new Date()
    } as unknown as Invoice;

    const pdfBuffer = Buffer.from('Contenido de prueba PDF');
    const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><factura>Prueba</factura>';

    try {
        console.log(`Enviando correo de prueba a: ${testEmail}...`);
        await emailService.sendInvoiceEmail(testEmail, mockInvoice, pdfBuffer, xmlContent);
        console.log('✅ Si no hubo errores arriba, revisa tu bandeja de entrada (y la carpeta de spam).');
    } catch (error) {
        console.error('❌ Error en la prueba manual:', error);
    }
}

testManualEmail();
