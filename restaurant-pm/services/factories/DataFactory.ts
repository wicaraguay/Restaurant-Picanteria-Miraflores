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

import { Customer, Order, OrderStatus, MenuItem, Employee, Role, Reservation, Bill } from '../../types';
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
        const createShifts = (pattern: 'AM' | 'PM' | 'AM-PM' | ((day: string) => string)) => {
            return DAYS_OF_WEEK.reduce((acc, day) => ({
                ...acc,
                [day]: typeof pattern === 'function' ? pattern(day) : pattern
            }), {});
        };

        return [
            {
                id: '1',
                name: 'Admin User',
                username: 'admin',
                password: 'password123',
                roleId: '1',
                phone: '555-0101',
                salary: 60000,
                shifts: createShifts('AM'),
                equipment: { uniform: true, epp: true }
            },
            {
                id: '2',
                name: 'Luis Gomez',
                username: 'lgomez',
                password: 'password123',
                roleId: '3',
                phone: '555-0102',
                salary: 40000,
                shifts: createShifts((day) =>
                    day === 'Sabado' || day === 'Domingo' ? 'Libre' : 'PM'
                ),
                equipment: { uniform: true, epp: false }
            },
            {
                id: '3',
                name: 'Ana Torres',
                username: 'atorres',
                password: 'password123',
                roleId: '4',
                phone: '555-0103',
                salary: 45000,
                shifts: createShifts((day) =>
                    day === 'Lunes' || day === 'Martes' ? 'Libre' : 'AM-PM'
                ),
                equipment: { uniform: true, epp: true }
            },
            {
                id: '4',
                name: 'Carlos Caja',
                username: 'ccaja',
                password: 'password123',
                roleId: '2',
                phone: '555-0104',
                salary: 42000,
                shifts: createShifts('AM'),
                equipment: { uniform: true, epp: false }
            }
        ];
    }

    /**
     * Crea clientes de ejemplo
     */
    static createDefaultCustomers(): Customer[] {
        return [
            {
                id: '1',
                name: 'Carlos Mendoza',
                email: 'carlos@example.com',
                phone: '555-1234',
                loyaltyPoints: 120,
                lastVisit: getRelativeDate(2),
                identification: '1712345678'
            },
            {
                id: '2',
                name: 'Maria Rodriguez',
                email: 'maria@example.com',
                phone: '555-5678',
                loyaltyPoints: 75,
                lastVisit: getRelativeDate(5),
                identification: '1798765432001'
            }
        ];
    }

    /**
     * Crea reservaciones de ejemplo
     */
    static createDefaultReservations(): Reservation[] {
        return [
            {
                id: '1',
                name: 'Familia Lopez',
                partySize: 4,
                time: '20:00',
                status: 'Confirmada'
            },
            {
                id: '2',
                name: 'Reunión de trabajo',
                partySize: 8,
                time: '13:00',
                status: 'Pendiente'
            }
        ];
    }

    /**
     * Crea items del menú de ejemplo
     */
    static createDefaultMenuItems(): MenuItem[] {
        return [
            {
                id: '1',
                name: 'Lomo a la Piedra',
                description: 'Jugoso lomo de res servido sobre una piedra volcánica caliente.',
                price: 18.50,
                imageUrl: 'https://via.placeholder.com/150',
                category: 'Carnes',
                available: true
            },
            {
                id: '2',
                name: 'Ceviche Mixto',
                description: 'Pescado y mariscos frescos marinados en jugo de limón de pica.',
                price: 12.00,
                imageUrl: 'https://via.placeholder.com/150',
                category: 'Mariscos',
                available: true
            },
            {
                id: '3',
                name: 'Tiramisú',
                description: 'Clásico postre italiano con capas de mascarpone y café.',
                price: 6.50,
                imageUrl: 'https://via.placeholder.com/150',
                category: 'Postres',
                available: false
            }
        ];
    }

    /**
     * Crea órdenes de ejemplo
     */
    static createDefaultOrders(): Order[] {
        return [
            {
                id: 'ord1',
                customerName: 'Mesa 3',
                items: [{ name: 'Lomo a la Piedra', quantity: 2 }],
                type: 'En Local',
                status: OrderStatus.New,
                createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
                billed: false
            },
            {
                id: 'ord2',
                customerName: 'Juan Perez',
                items: [{ name: 'Ceviche Mixto', quantity: 1 }],
                type: 'Delivery',
                status: OrderStatus.Completed,
                createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
                billed: false
            }
        ];
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
