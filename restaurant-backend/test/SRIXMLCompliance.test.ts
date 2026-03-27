
import { describe, it, expect } from 'vitest';
import { SRIService } from '../src/infrastructure/services/SRIService';
import { Invoice } from '../src/domain/billing/invoice';

describe('SRIService XML Compliance 2026', () => {
    const sriService = new SRIService();

    const baseInvoice: Invoice = {
        orderId: 'order-123',
        status: 'PENDING',
        creationDate: new Date(),
        detalles: [
            {
                codigoPrincipal: 'PROD-001',
                descripcion: 'Test Product',
                cantidad: 1,
                precioUnitario: 10.00,
                descuento: 0,
                precioTotalSinImpuesto: 10.00,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: '4', // 15%
                    tarifa: 15,
                    baseImponible: 10.00,
                    valor: 1.50
                }]
            }
        ],
        info: {
            ambiente: '1',
            tipoEmision: '1',
            razonSocial: 'BUSINESS NAME',
            nombreComercial: 'COMMERCIAL NAME',
            ruc: '1104679939001',
            dirMatriz: 'Main St 123',
            codDoc: '01',
            estab: '002',
            ptoEmi: '001',
            secuencial: '000000001',
            fechaEmision: '27/03/2026',
            obligadoContabilidad: 'NO',
            tipoIdentificacionComprador: '04',
            razonSocialComprador: 'CLIENT NAME',
            identificacionComprador: '1712345678001',
            totalSinImpuestos: 10.00,
            totalDescuento: 0,
            totalImpuestos: [],
            importeTotal: 11.50,
            moneda: 'DOLAR'
        }
    };

    it('should include RIMPE legend in infoAdicional when regime is RIMPE', () => {
        const invoice = {
            ...baseInvoice,
            info: {
                ...baseInvoice.info,
                regime: 'RIMPE - Emprendedor' as any
            }
        };

        const xml = sriService.generateInvoiceXML(invoice);
        expect(xml).toContain('<campoAdicional nombre="Régimen">Contribuyente Régimen RIMPE</campoAdicional>');
    });

    it('should include Agente de Retención legend when agenteRetencion is present', () => {
        const invoice = {
            ...baseInvoice,
            info: {
                ...baseInvoice.info,
                agenteRetencion: 'NAC-DNCRASC20-00000001'
            }
        };

        const xml = sriService.generateInvoiceXML(invoice);
        expect(xml).toContain('<campoAdicional nombre="Agente de Retención">Resolución No. NAC-DNCRASC20-00000001</campoAdicional>');
    });

    it('should include both legends when both are present', () => {
        const invoice = {
            ...baseInvoice,
            info: {
                ...baseInvoice.info,
                regime: 'RIMPE - Negocio Popular' as any,
                agenteRetencion: 'NAC-123'
            }
        };

        const xml = sriService.generateInvoiceXML(invoice);
        expect(xml).toContain('<campoAdicional nombre="Régimen">Contribuyente Régimen RIMPE</campoAdicional>');
        expect(xml).toContain('<campoAdicional nombre="Agente de Retención">Resolución No. NAC-123</campoAdicional>');
    });

    it('should not include legends when not present', () => {
        const xml = sriService.generateInvoiceXML(baseInvoice);
        expect(xml).not.toContain('<campoAdicional nombre="Régimen">');
        expect(xml).not.toContain('<campoAdicional nombre="Agente de Retención">');
    });

    it('should include the provided payment method code in the XML', () => {
        const invoice = {
            ...baseInvoice,
            info: {
                ...baseInvoice.info,
                formaPago: '19' // Pre-mapped code for Credit Card
            }
        };

        const xml = sriService.generateInvoiceXML(invoice);
        expect(xml).toContain('<formaPago>19</formaPago>');
    });
});
