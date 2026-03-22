import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { NotFoundError, ValidationError } from '../../domain/errors/CustomErrors';
import { BillingService } from '../services/BillingService';

export class UpdateBill {
    constructor(
        private billRepository: IBillRepository,
        private billingService: BillingService
    ) { }

    async execute(id: string, updateData: { 
        name?: string, 
        identification?: string, 
        address?: string, 
        email?: string,
        phone?: string,
        items?: any[],
        taxRate?: number
    }): Promise<any> {
        const bill = await this.billRepository.findById(id);

        if (!bill) {
            throw new NotFoundError('La factura no existe.', 'Bill');
        }

        const inProgressStates = ['PENDING', 'SENT', 'RECIBIDA', 'VALIDADO'];
        if (inProgressStates.includes(bill.sriStatus || '')) {
            throw new ValidationError(`No se puede editar una factura que está en proceso con el SRI (Estado: ${bill.sriStatus}). Espere el resultado.`);
        }

        if (bill.sriStatus === 'AUTORIZADO' || bill.sriStatus === 'CANCELADO') {
            throw new ValidationError('No se puede editar una factura que ya ha sido AUTORIZADA o CANCELADA.');
        }

        let updatedItems = bill.items;
        let subtotal = bill.subtotal;
        let tax = bill.tax;
        let total = bill.total;

        // If items are provided, recalculate everything
        if (updateData.items) {
            const taxRate = updateData.taxRate || 15;
            const details = this.billingService.calculateDetails(updateData.items, taxRate);
            
            updatedItems = details.map(d => {
                const itemTotal = d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0);
                return {
                    name: d.descripcion,
                    quantity: d.cantidad,
                    price: parseFloat((itemTotal / d.cantidad).toFixed(6)),
                    total: itemTotal
                };
            });

            subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
            const totalImpuestos = details.reduce((sum, d) => sum + (d.impuestos[0]?.valor || 0), 0);
            tax = totalImpuestos;
            total = subtotal + totalImpuestos;
        }

        // Update document
        const updatedBill = await this.billRepository.upsert({
            id: bill.id,
            customerName: updateData.name || bill.customerName,
            customerIdentification: updateData.identification || bill.customerIdentification,
            customerAddress: updateData.address || bill.customerAddress,
            customerEmail: updateData.email || bill.customerEmail,
            customerPhone: updateData.phone || bill.customerPhone,
            items: updatedItems,
            subtotal,
            tax,
            total,
            sriStatus: 'BORRADOR', // Reset status to Draft after edit to force re-validation
            sriMessage: 'Datos y detalles corregidos por el usuario. Re-enviar para procesar.',
            accessKey: undefined, // Clear metadata to force new XML generation
            xmlContent: undefined,
            // documentNumber stays as is to preserve numbering unless SRI rejects it later
        });
        
        // Auto-learn/Update customer data after bill update
        // Use current date as 'lastVisit'
        const hasCustomerData = updateData.identification || updateData.name || updateData.email || updateData.address || updateData.phone;
        if (hasCustomerData) {
            await this.billingService.autoLearnCustomer({
                identification: updateData.identification || bill.customerIdentification,
                name: updateData.name || bill.customerName,
                email: updateData.email || bill.customerEmail,
                address: updateData.address || bill.customerAddress,
                phone: updateData.phone || bill.customerPhone
            }, new Date());
        }

        return updatedBill;
    }
}
