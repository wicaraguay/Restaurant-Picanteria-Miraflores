"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const PDFService_1 = require("../src/infrastructure/services/PDFService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function testPDFGeneration() {
    console.log('🧪 Generando PDF de prueba...');
    // Mock Invoice Data (matching structure from billing.routes.ts)
    const mockInvoice = {
        orderId: 'test-order-123',
        status: 'PENDING',
        creationDate: new Date(),
        authorizationDate: '25/01/2026 13:45:00',
        detalles: [
            {
                codigoPrincipal: 'HAM-001',
                descripcion: 'Hamburguesa Clásica',
                cantidad: 2,
                precioUnitario: 8.50, // Base price
                descuento: 0,
                precioTotalSinImpuesto: 17.00,
                impuestos: [{
                        codigo: '2',
                        codigoPorcentaje: '4',
                        tarifa: 15,
                        baseImponible: 17.00,
                        valor: 2.55
                    }]
            },
            {
                codigoPrincipal: 'BEB-002',
                descripcion: 'Coca Cola',
                cantidad: 2,
                precioUnitario: 1.50,
                descuento: 0,
                precioTotalSinImpuesto: 3.00,
                impuestos: [{
                        codigo: '2',
                        codigoPorcentaje: '4',
                        tarifa: 15,
                        baseImponible: 3.00,
                        valor: 0.45
                    }]
            }
        ],
        info: {
            ambiente: '1',
            tipoEmision: '1',
            razonSocial: 'RESTAURANTE PICANTERÍA MIRAFLORES',
            nombreComercial: 'PICANTERÍA MIRAFLORES',
            ruc: '0999999999001',
            dirMatriz: 'Av. Principal 123 y Calle Secundaria',
            dirEstablecimiento: 'Av. Principal 123 y Calle Secundaria',
            codDoc: '01',
            estab: '001',
            ptoEmi: '001',
            secuencial: '000000123',
            fechaEmision: '25/01/2026',
            obligadoContabilidad: 'NO',
            tipoIdentificacionComprador: '05',
            razonSocialComprador: 'CONSUMIDOR FINAL',
            identificacionComprador: '9999999999999',
            direccionComprador: 'S/N',
            totalSinImpuestos: 20.00,
            totalDescuento: 0,
            totalImpuestos: [],
            importeTotal: 23.00,
            moneda: 'DOLAR',
            emailComprador: 'wicaraguay@gmail.com',
            formaPago: '01',
            logoUrl: 'https://placehold.co/180x60/png',
            tasaIva: '15',
            telefonoComprador: '0987654321',
            emailMatriz: 'info@picanteria-miraflores.com',
            claveAcceso: '2501202601123456789000100010010000001231234567890'
        }
    };
    try {
        const pdfService = new PDFService_1.PDFService();
        const pdfBuffer = await pdfService.generateInvoicePDF(mockInvoice);
        const outputPath = path.join(__dirname, '..', 'test-invoice-v11.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('✅ PDF generado exitosamente!');
        console.log(`📄 Ubicación: ${outputPath}`);
        console.log('\n🔍 Por favor, abre el archivo para verificar que el diseño coincida con el PDF de impresión del frontend.');
    }
    catch (error) {
        console.error('❌ Error al generar PDF:', error);
        process.exit(1);
    }
}
testPDFGeneration();
