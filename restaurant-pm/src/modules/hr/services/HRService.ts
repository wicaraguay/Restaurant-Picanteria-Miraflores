import { apiService } from '../../../api';
import { Employee, Role } from '../types/hr.types';

/**
 * @file HRService.ts
 * @description Servicio para manejar empleados, roles y recursos humanos.
 */

class HRService {
    private static instance: HRService;

    public static getInstance(): HRService {
        if (!HRService.instance) {
            HRService.instance = new HRService();
        }
        return HRService.instance;
    }

    /**
     * Obtener todos los empleados
     */
    async getEmployees(): Promise<Employee[]> {
        return await apiService.get<Employee[]>('/hr/employees');
    }

    /**
     * Crear un nuevo empleado
     */
    async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
        return await apiService.post<Employee>('/hr/employees', employeeData);
    }

    /**
     * Actualizar un empleado
     */
    async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
        return await apiService.put<Employee>(`/hr/employees/${id}`, employeeData);
    }

    /**
     * Eliminar un empleado
     */
    async deleteEmployee(id: string): Promise<void> {
        return await apiService.delete(`/hr/employees/${id}`);
    }

    /**
     * Obtener todos los roles
     */
    async getRoles(): Promise<Role[]> {
        return await apiService.get<Role[]>('/hr/roles');
    }
}

export const hrService = HRService.getInstance();
