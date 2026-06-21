/**
 * @file menu.types.ts
 * @description Tipos e interfaces para el módulo de menú.
 */

import { Category } from '../../categories/types/category.types';

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string; // Legacy: nombre de categoría (texto)
    categoryId?: string; // Referencia a Category._id
    categoryData?: Category; // Datos de categoría populados
    available: boolean;
    taxRate: number; // Porcentaje de IVA individual (0, 5, 12, 15)
}
