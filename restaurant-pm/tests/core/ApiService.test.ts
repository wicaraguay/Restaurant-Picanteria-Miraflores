import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '@/api';
import { API_ENDPOINTS } from '@/config/api.config';

describe('ApiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        apiService.setToken(null);
    });

    it('should clear token and localStorage when receiving a 401 error', async () => {
        // Setup initial token
        const mockToken = 'initial-token';
        apiService.setToken(mockToken);
        expect(localStorage.getItem('restaurant_pm_token')).toBe(mockToken);

        // Mock fetch to return 401
        const mockResponse = {
            ok: false,
            status: 401,
            url: 'http://localhost:3000/api/some-protected-endpoint',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ success: false, error: { message: 'Invalid or expired session' } })
        };
        
        global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

        // Perform request
        try {
            await apiService.get('/some-protected-endpoint');
        } catch (error) {
            // Error is expected
        }

        // Verify token is cleared
        expect(apiService.getToken()).toBeNull();
        expect(localStorage.getItem('restaurant_pm_token')).toBeNull();
    });

    it('should NOT clear token if 401 happens on login endpoint (invalid credentials)', async () => {
        // Setup initial token (e.g. from previous session)
        const mockToken = 'old-token';
        apiService.setToken(mockToken);

        // Mock fetch to return 401 for login
        const mockResponse = {
            ok: false,
            status: 401,
            url: `http://localhost:3000/api${API_ENDPOINTS.AUTH.LOGIN}`,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ success: false, error: { message: 'Invalid credentials' } })
        };
        
        global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

        // Perform login request
        try {
            await apiService.post(API_ENDPOINTS.AUTH.LOGIN, { username: 'test', password: 'wrong' });
        } catch (error) {
            // Error is expected
        }

        // Verify token is NOT cleared (it should remain as it was)
        expect(apiService.getToken()).toBe(mockToken);
    });
});
