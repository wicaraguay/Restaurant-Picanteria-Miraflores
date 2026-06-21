/**
 * @file index.ts
 * @description Punto de entrada del módulo de categorías.
 * Exporta los componentes principales y servicios.
 */

export { default as CategoryManagement } from './components/CategoryManagement';
export { CategoryFormModal } from './components/CategoryFormModal';
export { categoryService } from './services/categoryService';
export * from './types/category.types';
