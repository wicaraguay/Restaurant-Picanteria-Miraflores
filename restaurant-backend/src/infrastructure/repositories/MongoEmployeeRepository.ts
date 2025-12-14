/**
 * Repositorio de Empleados - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Implementa método específico findByUsername para autenticación.
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { Employee } from '../../domain/entities/Employee';
import { EmployeeModel } from '../database/schemas/EmployeeSchema';
import { BaseRepository } from './BaseRepository';
import { logger } from '../utils/Logger';

import { RoleModel } from '../database/schemas/RoleSchema';
import { Role } from '../../domain/entities/Role';

export class MongoEmployeeRepository extends BaseRepository<Employee> implements IEmployeeRepository {
    constructor() {
        super(EmployeeModel, 'Employee');
    }

    async findByUsername(username: string): Promise<Employee | null> {
        try {
            logger.debug('Finding employee by username', { username });
            const found = await EmployeeModel.findOne({ username });

            if (!found) return null;

            const entity = this.mapToEntity(found);

            // Poplar el rol manualmente ya que está en otra colección
            if (entity.roleId) {
                let roleDoc;

                // Intentar buscar por ID
                if (entity.roleId.match(/^[0-9a-fA-F]{24}$/)) {
                    roleDoc = await RoleModel.findById(entity.roleId);
                }

                // Si no se encuentra por ID o no es ID válido, intentar por nombre (fallback legacy)
                if (!roleDoc) {
                    // Mapeo de legacy "slugs" a nombres reales
                    const legacyRoleMap: Record<string, string> = {
                        'admin': 'Administrador',
                        'waiter': 'Mesero',
                        'chef': 'Chef',
                        'cashier': 'Cajero'
                    };
                    const roleName = legacyRoleMap[entity.roleId] || entity.roleId;
                    roleDoc = await RoleModel.findOne({ name: roleName });
                }

                if (roleDoc) {
                    entity.role = {
                        id: roleDoc._id.toString(),
                        name: roleDoc.name,
                        permissions: Object.fromEntries(roleDoc.permissions || new Map()),
                        isSystem: roleDoc.isSystem
                    } as Role;
                }
            }

            return entity;
        } catch (error) {
            logger.error('Failed to find employee by username', error);
            throw error;
        }
    }

    async updateSession(id: string, sessionId: string, lastLoginAt: Date): Promise<void> {
        try {
            logger.debug('Updating employee session', { id, sessionId });
            await EmployeeModel.findByIdAndUpdate(id, {
                activeSessionId: sessionId,
                lastLoginAt: lastLoginAt
            });
            logger.info('Employee session updated', { id });
        } catch (error) {
            logger.error('Failed to update employee session', error);
            throw error;
        }
    }

    protected mapToEntity(doc: any): Employee {
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            username: doc.username,
            password: doc.password,
            roleId: doc.roleId,
            phone: doc.phone,
            salary: doc.salary,
            shifts: doc.shifts instanceof Map ? Object.fromEntries(doc.shifts) : doc.shifts,
            equipment: doc.equipment,
            activeSessionId: doc.activeSessionId,
            lastLoginAt: doc.lastLoginAt
        };
    }
}
