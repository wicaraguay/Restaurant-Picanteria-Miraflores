/**
 * @file menu.types.ts
 * @description Tipos e interfaces para el módulo de menú.
 */

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    available: boolean;
    taxRate: number; // Porcentaje de IVA individual (0, 5, 12, 15)
}
