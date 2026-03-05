/**
 * @file customer.types.ts
 * @description Tipos para el módulo de clientes.
 */

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyPoints: number;
    lastVisit: string;
    // Campos SRI (Ecuador)
    identification?: string; // RUC o Cédula
    address?: string;
}

export interface Reservation {
    id: string;
    name: string;
    partySize: number;
    time: string;
    status: 'Confirmada' | 'Pendiente' | 'Cancelada';
}
