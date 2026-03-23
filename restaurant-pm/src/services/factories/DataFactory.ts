/**
 * @file DataFactory.ts
 * @description Factory para crear datos iniciales del sistema (Factory Pattern)
 * 
 * @purpose
 * Centraliza la creación de datos mock/iniciales para desarrollo y fallback.
 * Implementa Factory Pattern para generar entidades consistentes.
 * Facilita testing y mantenimiento de datos de prueba.
 * 
 * @connections
 * - Usa: types.ts (Customer, Order, MenuItem, Employee, Role, etc.)
 * - Usado por: DataService (para fallback data)
 * - Usado por: Tests (para mock data)
 * 
 * @layer Services - Factory Pattern
 */

import { Customer, Reservation } from '../../modules/customers/types/customer.types';
import { Bill } from '../../modules/billing/types/billing.types';
import { Order, OrderStatus } from '../../modules/orders/types/order.types';
import { MenuItem } from '../../modules/menu/types/menu.types';
import { Employee, Role } from '../../modules/hr/types/hr.types';
import { OrderNumberGenerator } from '../../modules/orders/utils/orderNumberGenerator';
import { DAYS_OF_WEEK } from '../../constants';

/**
 * Utilidad para generar fechas relativas
 */
const getRelativeDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

/**
 * DataFactory - Patrón Factory para crear entidades
 * Centraliza la creación de datos iniciales/mock
 */
export class DataFactory {
    /**
     * Crea roles por defecto del sistema
     */
    static createDefaultRoles(): Role[] {
        return [
            {
                id: '1',
                name: 'Administrador',
                permissions: {
                    dashboard: true,
                    customers: true,
                    orders: true,
                    menu: true,
                    kitchen: true,
                    hr: true,
                    settings: true,
                    billing: true
                }
            },
            {
                id: '2',
                name: 'Cajero',
                permissions: {
                    dashboard: true,
                    customers: true,
                    orders: true,
                    billing: true
                }
            },
            {
                id: '3',
                name: 'Mesero',
                permissions: {
                    dashboard: true,
                    customers: true,
                    orders: true,
                    menu: true
                }
            },
            {
                id: '4',
                name: 'Cocinero',
                permissions: {
                    kitchen: true,
                    menu: true
                }
            }
        ];
    }

    /**
     * Crea empleados de ejemplo
     */
    static createDefaultEmployees(): Employee[] {
        const defaultShifts = {
            'Lunes': 'AM',
            'Martes': 'AM',
            'Miercoles': 'AM',
            'Jueves': 'AM',
            'Viernes': 'AM',
            'Sabado': 'Libre',
            'Domingo': 'Libre'
        };
        return [
            { id: '1', identification: '0999999991', name: 'Admin User', username: 'admin', roleId: '1', phone: '0999999991', shifts: defaultShifts, salary: 1000, equipment: { uniform: true, epp: true } },
            { id: '2', identification: '0999999992', name: 'Cajero User', username: 'cajero', roleId: '2', phone: '0999999992', shifts: defaultShifts, salary: 500, equipment: { uniform: true, epp: true } },
            { id: '3', identification: '0999999993', name: 'Mesero User', username: 'mesero', roleId: '3', phone: '0999999993', shifts: defaultShifts, salary: 450, equipment: { uniform: true, epp: true } },
            { id: '4', identification: '0999999994', name: 'Cocinero User', username: 'cocinero', roleId: '4', phone: '0999999994', shifts: defaultShifts, salary: 600, equipment: { uniform: true, epp: true } },
        ];
    }

    /**
     * Crea clientes de ejemplo
     */
    static createDefaultCustomers(): Customer[] {
        return [
            { id: '1', identification: '0999999991', name: 'Juan Perez', email: 'juan@test.com', phone: '0999123456', address: 'Guayaquil', loyaltyPoints: 0, lastVisit: new Date().toISOString() },
            { id: '2', identification: '0999999992', name: 'Maria Lopez', email: 'maria@test.com', phone: '0999123457', address: 'Guayaquil', loyaltyPoints: 0, lastVisit: new Date().toISOString() },
            { id: '9999999999999', identification: '9999999999999', name: 'CONSUMIDOR FINAL', email: 'consumidor@final.com', phone: '9999999999', address: 'S/N', loyaltyPoints: 0, lastVisit: new Date().toISOString() }
        ];
    }

    /**
     * Crea reservaciones de ejemplo
     */
    static createDefaultReservations(): Reservation[] {
        return [];
    }

    /**
     * Crea items del menú de ejemplo
     */
    static createDefaultMenuItems(): MenuItem[] {
        return [
            { id: '1', name: 'Arroz con Pollo', description: 'Arroz con pollo clásico', price: 10.50, category: 'Main', available: true, imageUrl: '' },
            { id: '2', name: 'Ceviche', description: 'Ceviche de camarón', price: 12.00, category: 'Seafood', available: true, imageUrl: '' },
            { id: '3', name: 'Coca Cola', description: 'Refresca tu día', price: 1.50, category: 'Beverages', available: true, imageUrl: '' }
        ];
    }

    /**
     * Crea órdenes de ejemplo
     */
    static createDefaultOrders(): Order[] {
        return [];
    }

    /**
     * Crea facturas vacías (se generan dinámicamente)
     */
    static createDefaultBills(): Bill[] {
        return [];
    }

    /**
     * Crea todos los datos iniciales del sistema
     */
    static createAllDefaultData() {
        return {
            roles: this.createDefaultRoles(),
            employees: this.createDefaultEmployees(),
            customers: this.createDefaultCustomers(),
            reservations: this.createDefaultReservations(),
            menuItems: this.createDefaultMenuItems(),
            orders: this.createDefaultOrders(),
            bills: this.createDefaultBills()
        };
    }
}
