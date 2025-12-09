/**
 * @file MenuItem.ts
 * @description Entidad de dominio que representa un ítem del menú del restaurante
 * 
 * @purpose
 * Define la estructura de datos de un producto/plato del menú incluyendo
 * precio, categoría, disponibilidad e imagen.
 * 
 * @connections
 * - Usado por: IMenuRepository (domain/repositories)
 * - Usado por: MongoMenuRepository (infrastructure/repositories)
 * - Usado por: MenuItemSchema (infrastructure/database/schemas)
 * - Usado por: GetMenu (application/use-cases)
 * - Usado por: menuRoutes (infrastructure/web/routes)
 * - Usado por: seed.ts (para crear menú inicial)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    available: boolean;
}
