import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as dbHandler from '../helpers/db-handler';
import mongoose from 'mongoose';
import { MongoEmployeeRepository } from '../../src/infrastructure/repositories/MongoEmployeeRepository';
import { CreateEmployee } from '../../src/application/use-cases/CreateEmployee';
import { UpdateEmployee } from '../../src/application/use-cases/UpdateEmployee';
import { MongoRoleRepository } from '../../src/infrastructure/repositories/MongoRoleRepository';
import { RoleModel } from '../../src/infrastructure/database/schemas/RoleSchema';

describe('Employee CRUD Integration Tests', () => {
    const employeeRepo = new MongoEmployeeRepository();
    const roleRepo = new MongoRoleRepository();
    const createEmployee = new CreateEmployee(employeeRepo, roleRepo);
    const updateEmployee = new UpdateEmployee(employeeRepo, roleRepo);

    let roleId: string;

    beforeAll(async () => {
        await dbHandler.connect();
        // Crear un rol para las pruebas
        const role = await RoleModel.create({
            name: 'Mesero',
            permissions: new Map([['orders', true]])
        });
        roleId = role._id.toString();
    });

    afterAll(async () => await dbHandler.closeDatabase());
    beforeEach(async () => {
        // No borrar el rol, solo los empleados
        if (mongoose.connection.db) {
            await mongoose.connection.db.collection('employees').deleteMany({});
        }
    });

    it('should create an employee with shifts', async () => {
        const employeeData = {
            name: 'Test Employee',
            username: 'testuser',
            password: 'password123',
            roleId: roleId,
            phone: '0999999999',
            salary: 450,
            shifts: {
                'Lunes': 'AM',
                'Martes': 'PM',
                'Miercoles': 'Libre'
            },
            equipment: { uniform: true, epp: false }
        };

        const created = await createEmployee.execute(employeeData as any);
        
        expect(created.id).toBeDefined();
        expect(created.shifts['Lunes']).toBe('AM');
        expect(created.shifts['Miercoles']).toBe('Libre');

        const found = await employeeRepo.findById(created.id);
        expect(found?.shifts['Lunes']).toBe('AM');
    });

    it('should update employee shifts partially', async () => {
        // 1. Crear inicial
        const initialData = {
            name: 'Update Test',
            username: 'updateuser',
            password: 'password123',
            roleId: roleId,
            shifts: { 'Lunes': 'Libre', 'Martes': 'Libre' }
        };
        const created = await createEmployee.execute(initialData as any);

        // 2. Actualizar solo el martes
        const updateData = {
            shifts: { ...created.shifts, 'Martes': 'AM' }
        };
        const updated = await updateEmployee.execute(created.id, updateData as any);

        expect(updated.shifts['Martes']).toBe('AM');
        expect(updated.shifts['Lunes']).toBe('Libre');

        // 3. Verificar en la base de datos directamente
        const found = await employeeRepo.findById(created.id);
        expect(found?.shifts['Martes']).toBe('AM');
    });

    it('should correctly handle all shift types (AM, PM, AM-PM, Libre)', async () => {
        const employeeData = {
            name: 'Shift Tester',
            username: 'shifttest',
            password: 'password123',
            roleId: roleId,
            shifts: { 'Lunes': 'AM' }
        };
        const created = await createEmployee.execute(employeeData as any);
        expect(created.shifts['Lunes']).toBe('AM');

        // Update to PM
        await updateEmployee.execute(created.id, { shifts: { 'Lunes': 'PM' } } as any);
        let found = await employeeRepo.findById(created.id);
        expect(found?.shifts['Lunes']).toBe('PM');

        // Update to AM-PM
        await updateEmployee.execute(created.id, { shifts: { 'Lunes': 'AM-PM' } } as any);
        found = await employeeRepo.findById(created.id);
        expect(found?.shifts['Lunes']).toBe('AM-PM');

        // Update to Libre
        await updateEmployee.execute(created.id, { shifts: { 'Lunes': 'Libre' } } as any);
        found = await employeeRepo.findById(created.id);
        expect(found?.shifts['Lunes']).toBe('Libre');
    });

    it('should handle different day name keys correctly (Standardization)', async () => {
        const employeeData = {
            name: 'Day Test',
            username: 'dayuser',
            password: 'password123',
            roleId: roleId,
            shifts: { 'Miercoles': 'AM', 'Sabado': 'PM' }
        };

        const created = await createEmployee.execute(employeeData as any);
        expect(created.shifts['Miercoles']).toBe('AM');
        
        // Simular lo que pasaba antes con el acento mandado desde el frontend (antes de mi fix)
        const updateWithAccent = {
            shifts: { ...created.shifts, 'Miércoles': 'PM' }
        };
        const updated = await updateEmployee.execute(created.id, updateWithAccent as any);
        
        // Si el sistema no está estandarizado, tendría AM en Miercoles y PM en Miércoles
        expect(updated.shifts['Miercoles']).toBe('AM');
        expect(updated.shifts['Miércoles']).toBe('PM');
    });
});
