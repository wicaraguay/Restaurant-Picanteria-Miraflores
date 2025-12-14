/**
 * @file Role.ts
 * @description Entidad de dominio que representa un rol de empleado
 * 
 * @purpose
 * Define la estructura de datos de un rol incluyendo nombre y permisos
 * por vista del sistema. Los roles controlan el acceso a diferentes secciones.
 * 
 * @connections
 * - Usado por: IRoleRepository (domain/repositories)
 * - Usado por: MongoRoleRepository (infrastructure/repositories)
 * - Usado por: RoleSchema (infrastructure/database/schemas)
 * - Usado por: Employee entity (roleId field)
 * - Usado por: CreateRole, GetRoles use cases (application/use-cases)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export interface Role {
    id: string;
    name: string;
    permissions: {
        [key: string]: boolean;
    };
    isSystem?: boolean; // Protege roles del sistema como "Administrador"
    createdAt?: Date;
    updatedAt?: Date;
}
