import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as dbHandler from '../helpers/db-handler';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoEmployeeRepository } from '../../src/infrastructure/repositories/MongoEmployeeRepository';
import { EmployeeModel } from '../../src/infrastructure/database/schemas/EmployeeSchema';
import { RoleModel } from '../../src/infrastructure/database/schemas/RoleSchema';

describe('Auth Password Reset Integration Tests', () => {
    const employeeRepo = new MongoEmployeeRepository();
    let roleId: string;
    let testEmployeeId: string;

    beforeAll(async () => {
        await dbHandler.connect();
        const role = await RoleModel.create({
            name: 'Administrador',
            permissions: new Map([['settings', true]])
        });
        roleId = role._id.toString();
    });

    afterAll(async () => await dbHandler.closeDatabase());

    beforeEach(async () => {
        if (mongoose.connection.db) {
            await mongoose.connection.db.collection('employees').deleteMany({});
        }

        const hashedPassword = await bcrypt.hash('password123', 10);
        const employee = await EmployeeModel.create({
            name: 'Test User',
            email: 'test@example.com',
            username: 'testuser',
            password: hashedPassword,
            roleId: roleId,
            phone: '0999999999'
        });
        testEmployeeId = employee._id.toString();
    });

    describe('findByEmail', () => {
        it('should find employee by email', async () => {
            const found = await employeeRepo.findByEmail('test@example.com');
            expect(found).not.toBeNull();
            expect(found?.name).toBe('Test User');
            expect(found?.email).toBe('test@example.com');
        });

        it('should return null for non-existent email', async () => {
            const found = await employeeRepo.findByEmail('nonexistent@example.com');
            expect(found).toBeNull();
        });

        it('should be case-insensitive', async () => {
            const found = await employeeRepo.findByEmail('TEST@EXAMPLE.COM');
            expect(found).not.toBeNull();
        });
    });

    describe('setResetPasswordToken', () => {
        it('should set reset token and expiry', async () => {
            const token = 'test-reset-token-123';
            const expires = new Date(Date.now() + 3600000); // 1 hour

            await employeeRepo.setResetPasswordToken(testEmployeeId, token, expires);

            const doc = await EmployeeModel.findById(testEmployeeId)
                .select('+resetPasswordToken +resetPasswordExpires');

            expect(doc?.resetPasswordToken).toBe(token);
            expect(doc?.resetPasswordExpires).toBeDefined();
        });
    });

    describe('findByResetToken', () => {
        it('should find employee by valid reset token', async () => {
            const token = 'valid-token-123';
            const expires = new Date(Date.now() + 3600000);

            await employeeRepo.setResetPasswordToken(testEmployeeId, token, expires);
            const found = await employeeRepo.findByResetToken(token);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(testEmployeeId);
        });

        it('should return null for expired token', async () => {
            const token = 'expired-token-123';
            const expires = new Date(Date.now() - 3600000); // 1 hour ago

            await employeeRepo.setResetPasswordToken(testEmployeeId, token, expires);
            const found = await employeeRepo.findByResetToken(token);

            expect(found).toBeNull();
        });

        it('should return null for non-existent token', async () => {
            const found = await employeeRepo.findByResetToken('nonexistent-token');
            expect(found).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('should update password and clear reset token', async () => {
            const token = 'temp-token';
            const expires = new Date(Date.now() + 3600000);
            await employeeRepo.setResetPasswordToken(testEmployeeId, token, expires);

            const newHashedPassword = await bcrypt.hash('newpassword456', 10);
            await employeeRepo.updatePassword(testEmployeeId, newHashedPassword);

            const doc = await EmployeeModel.findById(testEmployeeId)
                .select('+password +resetPasswordToken +resetPasswordExpires');

            expect(doc?.password).toBe(newHashedPassword);
            expect(doc?.resetPasswordToken).toBeNull();
            expect(doc?.resetPasswordExpires).toBeNull();
        });

        it('should allow login with new password', async () => {
            const newPassword = 'newpassword789';
            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            await employeeRepo.updatePassword(testEmployeeId, newHashedPassword);

            const employee = await employeeRepo.findByUsername('testuser');
            expect(employee).not.toBeNull();

            const isValid = await bcrypt.compare(newPassword, employee!.password!);
            expect(isValid).toBe(true);
        });
    });

    describe('Employee with email field', () => {
        it('should create employee with email', async () => {
            const created = await employeeRepo.create({
                id: '',
                name: 'New Employee',
                email: 'new@example.com',
                identification: '1234567890',
                username: 'newuser',
                password: await bcrypt.hash('pass123', 10),
                roleId: roleId,
                phone: '0988888888',
                salary: 500,
                shifts: {},
                equipment: { uniform: true, epp: false }
            });

            expect(created.email).toBe('new@example.com');

            const found = await employeeRepo.findByEmail('new@example.com');
            expect(found).not.toBeNull();
            expect(found?.username).toBe('newuser');
        });

        it('should update employee email', async () => {
            await employeeRepo.update(testEmployeeId, { email: 'updated@example.com' });

            const found = await employeeRepo.findByEmail('updated@example.com');
            expect(found).not.toBeNull();
            expect(found?.id).toBe(testEmployeeId);

            const oldEmail = await employeeRepo.findByEmail('test@example.com');
            expect(oldEmail).toBeNull();
        });
    });
});
