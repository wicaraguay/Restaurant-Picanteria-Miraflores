/**
 * @file CreateOrder.ts
 * @description Caso de uso para crear una nueva orden/pedido
 *
 * @purpose
 * Crea una nueva orden en el sistema. Puede incluir lógica de validación de items y cálculos.
 *
 * @connections
 * - Usa: IOrderRepository (domain/repositories)
 * - Usa: Order entity (domain/entities)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 *
 * @layer Application - Lógica de negocio
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order, OrderItem, OrderStatus } from '../../domain/entities/Order';
import { ValidationError } from '../../domain/errors/CustomErrors';

export interface CreateOrderDTO {
    customerName: string;
    items: OrderItem[];
    type: 'En Local' | 'Delivery' | 'Para Llevar';
    status?: OrderStatus;
}

export class CreateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(orderData: CreateOrderDTO): Promise<Order> {
        // Validar que cada item tenga taxRate (obligatorio para cálculos correctos de IVA)
        this.validateItems(orderData.items);

        // El número lo asigna SIEMPRE el servidor (contador atómico) y se ignora
        // cualquier valor enviado por el cliente: los números generados en el
        // navegador (localStorage) se duplicaban entre dispositivos.
        const orderNumber = await this.orderRepository.getNextOrderNumber();

        const order = await this.orderRepository.create({ ...orderData, orderNumber } as any);
        return order;
    }

    /**
     * Valida que cada item tenga los campos requeridos para facturación
     * - taxRate es OBLIGATORIO para calcular IVA correctamente (0%, 15%, etc.)
     * - price es OBLIGATORIO para calcular totales
     */
    private validateItems(items: OrderItem[]): void {
        if (!items || items.length === 0) {
            throw new ValidationError('La orden debe tener al menos un producto.');
        }

        items.forEach((item, index) => {
            // Validar que el item tenga nombre
            if (!item.name || item.name.trim() === '') {
                throw new ValidationError(
                    `El producto en posición ${index + 1} no tiene nombre.`
                );
            }

            // Validar cantidad
            if (!item.quantity || item.quantity <= 0) {
                throw new ValidationError(
                    `El producto "${item.name}" debe tener una cantidad mayor a 0.`
                );
            }

            // Validar precio
            if (item.price === undefined || item.price === null || item.price < 0) {
                throw new ValidationError(
                    `El producto "${item.name}" debe tener un precio válido.`
                );
            }

            // Validar taxRate (CRÍTICO para cálculos de IVA)
            if (item.taxRate === undefined || item.taxRate === null) {
                throw new ValidationError(
                    `El producto "${item.name}" no tiene tasa de IVA (taxRate). ` +
                    `Todos los productos deben incluir su taxRate (0, 5, 12 o 15).`
                );
            }

            // Validar que taxRate sea un valor válido
            const validTaxRates = [0, 5, 12, 15];
            if (!validTaxRates.includes(item.taxRate)) {
                throw new ValidationError(
                    `El producto "${item.name}" tiene una tasa de IVA inválida: ${item.taxRate}%. ` +
                    `Las tasas válidas son: ${validTaxRates.join(', ')}%.`
                );
            }
        });
    }
}
