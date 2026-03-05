/**
 * @file admin.types.ts
 * @description Tipos para el módulo administrativo y legal.
 */

export interface Feedback {
    id: string;
    customerName: string;
    date: string;
    type: 'Queja' | 'Sugerencia';
    details: string;
    status: 'Abierto' | 'Resuelto';
}

export interface LegalDocument {
    id: string;
    name: string;
    type: 'Sanitario' | 'Municipal' | 'SRI';
    dueDate: string;
    status: 'Vigente' | 'Por Vencer' | 'Vencido';
}
