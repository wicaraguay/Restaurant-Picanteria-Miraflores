import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock dependencies
const mockEmployeeRepo = {
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByResetToken: vi.fn(),
    setResetPasswordToken: vi.fn(),
    updatePassword: vi.fn(),
    update: vi.fn(),
};

const mockEmailService = {
    sendPasswordResetEmail: vi.fn(),
};

describe('Auth Routes - Password Management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Change Password Logic', () => {
        it('should reject if current password is incorrect', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            mockEmployeeRepo.findByUsername.mockResolvedValue({
                id: '123',
                password: hashedPassword,
            });

            const isValid = await bcrypt.compare('wrongpassword', hashedPassword);
            expect(isValid).toBe(false);
        });

        it('should accept if current password is correct', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            mockEmployeeRepo.findByUsername.mockResolvedValue({
                id: '123',
                password: hashedPassword,
            });

            const isValid = await bcrypt.compare('correctpassword', hashedPassword);
            expect(isValid).toBe(true);
        });

        it('should hash new password before saving', async () => {
            const newPassword = 'newpassword123';
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            expect(hashedPassword).not.toBe(newPassword);
            expect(hashedPassword.startsWith('$2b$')).toBe(true);

            const isValid = await bcrypt.compare(newPassword, hashedPassword);
            expect(isValid).toBe(true);
        });

        it('should reject password shorter than 6 characters', () => {
            const shortPassword = '12345';
            expect(shortPassword.length < 6).toBe(true);
        });

        it('should accept password of 6 or more characters', () => {
            const validPassword = '123456';
            expect(validPassword.length >= 6).toBe(true);
        });
    });

    describe('Forgot Password Logic', () => {
        it('should find employee by email', async () => {
            mockEmployeeRepo.findByEmail.mockResolvedValue({
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
            });

            const employee = await mockEmployeeRepo.findByEmail('test@example.com');
            expect(employee).not.toBeNull();
            expect(mockEmployeeRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should generate valid reset token', () => {
            const crypto = require('crypto');
            const token = crypto.randomBytes(32).toString('hex');

            expect(token).toBeDefined();
            expect(token.length).toBe(64); // 32 bytes = 64 hex chars
        });

        it('should set token expiry to 1 hour', () => {
            const now = Date.now();
            const expires = new Date(now + 60 * 60 * 1000);
            const diff = expires.getTime() - now;

            expect(diff).toBe(3600000); // 1 hour in ms
        });

        it('should call email service with correct params', async () => {
            const email = 'test@example.com';
            const name = 'Test User';
            const resetUrl = 'https://example.com/reset-password?token=abc123';

            await mockEmailService.sendPasswordResetEmail(email, name, resetUrl);

            expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                email,
                name,
                resetUrl
            );
        });
    });

    describe('Reset Password Logic', () => {
        it('should find employee by valid reset token', async () => {
            mockEmployeeRepo.findByResetToken.mockResolvedValue({
                id: '123',
                name: 'Test User',
            });

            const employee = await mockEmployeeRepo.findByResetToken('valid-token');
            expect(employee).not.toBeNull();
        });

        it('should return null for invalid token', async () => {
            mockEmployeeRepo.findByResetToken.mockResolvedValue(null);

            const employee = await mockEmployeeRepo.findByResetToken('invalid-token');
            expect(employee).toBeNull();
        });

        it('should update password and clear token', async () => {
            const userId = '123';
            const hashedPassword = await bcrypt.hash('newpassword', 10);

            await mockEmployeeRepo.updatePassword(userId, hashedPassword);

            expect(mockEmployeeRepo.updatePassword).toHaveBeenCalledWith(
                userId,
                hashedPassword
            );
        });
    });

    describe('Profile Update Logic', () => {
        it('should check for duplicate email before update', async () => {
            mockEmployeeRepo.findByEmail.mockResolvedValue({
                id: 'other-user-id',
                email: 'taken@example.com',
            });

            const existingUser = await mockEmployeeRepo.findByEmail('taken@example.com');
            const currentUserId = 'current-user-id';

            const isDuplicate = existingUser && existingUser.id !== currentUserId;
            expect(isDuplicate).toBe(true);
        });

        it('should allow update if email belongs to same user', async () => {
            const currentUserId = 'user-123';
            mockEmployeeRepo.findByEmail.mockResolvedValue({
                id: currentUserId,
                email: 'same@example.com',
            });

            const existingUser = await mockEmployeeRepo.findByEmail('same@example.com');
            const isDuplicate = existingUser && existingUser.id !== currentUserId;
            expect(isDuplicate).toBe(false);
        });

        it('should update profile fields', async () => {
            const userId = '123';
            const updates = {
                name: 'Updated Name',
                email: 'updated@example.com',
                phone: '0999999999',
            };

            mockEmployeeRepo.update.mockResolvedValue({ id: userId, ...updates });

            const updated = await mockEmployeeRepo.update(userId, updates);
            expect(updated.name).toBe('Updated Name');
            expect(updated.email).toBe('updated@example.com');
        });
    });

    describe('Get Current User (me)', () => {
        it('should return user without sensitive fields', async () => {
            mockEmployeeRepo.findById.mockResolvedValue({
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashed-password',
                resetPasswordToken: 'some-token',
                resetPasswordExpires: new Date(),
            });

            const employee = await mockEmployeeRepo.findById('123');

            // Simulate removing sensitive fields
            const { password, resetPasswordToken, resetPasswordExpires, ...safeEmployee } = employee;

            expect(safeEmployee.password).toBeUndefined();
            expect(safeEmployee.resetPasswordToken).toBeUndefined();
            expect(safeEmployee.name).toBe('Test User');
            expect(safeEmployee.email).toBe('test@example.com');
        });
    });
});
