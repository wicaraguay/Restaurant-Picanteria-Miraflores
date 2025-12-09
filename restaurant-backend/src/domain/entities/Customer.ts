/**
 * @file Customer.ts
 * @description Entidad de dominio que representa un cliente del restaurante
 * 
 * @purpose
 * Define la estructura de datos de un cliente con información de contacto,
 * identificación y programa de lealtad.
 * 
 * @connections
 * - Usado por: ICustomerRepository (domain/repositories)
 * - Usado por: MongoCustomerRepository (infrastructure/repositories)
 * - Usado por: CustomerSchema (infrastructure/database/schemas)
 * - Usado por: CreateCustomer, GetCustomers (application/use-cases)
 * - Usado por: customerRoutes (infrastructure/web/routes)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyPoints: number;
    lastVisit: Date;
    identification?: string; // RUC or CI
    address?: string;
}
