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
            // Include password explicitly for authentication purposes
            // This is the ONLY method that should return password
            const found = await EmployeeModel.findOne({ username }).select('+password');

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

    async findByEmail(email: string): Promise<Employee | null> {
        try {
            logger.debug('Finding employee by email', { email });
            const found = await EmployeeModel.findOne({ email: email.toLowerCase() });
            if (!found) return null;
            return this.mapToEntity(found);
        } catch (error) {
            logger.error('Failed to find employee by email', error);
            throw error;
        }
    }

    async setResetPasswordToken(id: string, token: string, expires: Date): Promise<void> {
        try {
            await EmployeeModel.findByIdAndUpdate(id, {
                resetPasswordToken: token,
                resetPasswordExpires: expires
            });
            logger.info('Reset password token set', { id });
        } catch (error) {
            logger.error('Failed to set reset password token', error);
            throw error;
        }
    }

    async findByResetToken(token: string): Promise<Employee | null> {
        try {
            const found = await EmployeeModel.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            }).select('+resetPasswordToken +resetPasswordExpires');
            if (!found) return null;
            return this.mapToEntity(found);
        } catch (error) {
            logger.error('Failed to find by reset token', error);
            throw error;
        }
    }

    async updatePassword(id: string, hashedPassword: string): Promise<void> {
        try {
            await EmployeeModel.findByIdAndUpdate(id, {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            });
            logger.info('Password updated', { id });
        } catch (error) {
            logger.error('Failed to update password', error);
            throw error;
        }
    }

    protected mapToEntity(doc: any): Employee {
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            email: doc.email || '',
            identification: doc.identification,
            username: doc.username,
            password: doc.password,
            roleId: doc.roleId,
            phone: doc.phone,
            salary: doc.salary,
            shifts: doc.shifts instanceof Map ? Object.fromEntries(doc.shifts) : doc.shifts,
            equipment: doc.equipment,
            activeSessionId: doc.activeSessionId,
            lastLoginAt: doc.lastLoginAt,
            resetPasswordToken: doc.resetPasswordToken,
            resetPasswordExpires: doc.resetPasswordExpires
        };
    }
}
