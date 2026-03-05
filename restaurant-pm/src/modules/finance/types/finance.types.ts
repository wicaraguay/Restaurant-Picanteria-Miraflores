/**
 * @file finance.types.ts
 * @description Tipos para el módulo de finanzas.
 */

export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'Ingreso' | 'Gasto';
}
