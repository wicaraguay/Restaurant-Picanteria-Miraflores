import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/modules/auth/services/AuthService';
import { apiService } from '@/api';

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        apiService.setToken(null);
    });

    it('should clear token if validate session fails', async () => {
        // Setup initial token
        const mockToken = 'invalid-token';
        apiService.setToken(mockToken);
        
        // Spy on apiService.get to simulate failure
        vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Invalid or expired session'));
        const setTokenSpy = vi.spyOn(apiService, 'setToken');

        // Execute validation
        const result = await authService.validate(mockToken);

        // Verify result is null and token was cleared
        expect(result).toBeNull();
        // The first call is to set token to validate, 
        // the second should be setToken(null) in the catch block,
        // the third is in finally to restore original (which was null before validate)
        expect(setTokenSpy).toHaveBeenCalledWith(null);
        expect(apiService.getToken()).toBeNull();
    });

    it('should correctly restore session when token is valid', async () => {
        const mockUser = { id: '1', username: 'admin', roleId: 'admin-role' };
        apiService.setToken('valid-token');
        
        vi.spyOn(apiService, 'get').mockResolvedValue({ user: mockUser });
        // Mock roles.getById to avoid further requests
        vi.spyOn(apiService.roles, 'getById').mockResolvedValue({ id: 'admin-role', permissions: [] });

        const result = await authService.restoreSession();

        expect(result.success).toBe(true);
        expect(result.user?.id).toBe(mockUser.id);
    });
});
