import { apiService } from '../api';
import { API_ENDPOINTS } from '../config/api.config';
import { Role } from '../types';

export interface AuthenticatedUser {
    id: string;
    username: string;
    role: Role;
    name: string;
}

export class AuthService {
    private static instance: AuthService;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async login(username: string, password?: string): Promise<any> {
        const response: any = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
        if (response && response.token) {
            apiService.setToken(response.token);

            // Ensure user has role populated
            if (response.user && response.user.roleId && (!response.user.role || !response.user.role.permissions)) {
                try {
                    const role = await apiService.roles.getById(response.user.roleId);
                    if (role) {
                        response.user.role = role;
                    }
                } catch (e) {
                    console.error('Failed to fetch role on login', e);
                }
            }
        }
        return response;
    }

    public async register(data: any): Promise<any> {
        return apiService.post(API_ENDPOINTS.AUTH.REGISTER, data);
    }

    public async validate(token: string): Promise<any> {
        // Temporalmente establecer el token para la validación
        const originalToken = apiService.getToken();
        apiService.setToken(token);
        try {
            const response: any = await apiService.get(API_ENDPOINTS.AUTH.VALIDATE);
            const user = response.user;

            // Si el usuario tiene roleId pero no tiene el objeto role completo (con permisos)
            if (user && user.roleId && (!user.role || !user.role.permissions)) {
                try {
                    // Intentar obtener el rol completo
                    const role = await apiService.roles.getById(user.roleId);
                    if (role) {
                        user.role = role;
                    }
                } catch (roleError) {
                    console.error('Failed to fetch role details', roleError);
                }
            }

            return user;
        } catch (error) {
            return null;
        } finally {
            apiService.setToken(originalToken);
        }
    }

    public async logout(token: string): Promise<void> {
        const originalToken = apiService.getToken();
        if (token !== originalToken) {
            apiService.setToken(token);
        }

        try {
            await apiService.post(API_ENDPOINTS.AUTH.LOGOUT, {});
        } catch (e) {
            console.error('Logout failed', e);
        } finally {
            apiService.setToken(null);
        }
    }

    public loadSession(): { token: string | null } {
        return { token: apiService.getToken() };
    }

    public async restoreSession(): Promise<{ success: boolean; user?: AuthenticatedUser }> {
        const token = apiService.getToken();
        if (!token) {
            return { success: false };
        }

        const user = await this.validate(token);
        if (user) {
            return { success: true, user };
        }

        return { success: false };
    }
}

export const authService = AuthService.getInstance();
