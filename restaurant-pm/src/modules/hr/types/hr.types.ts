/**
 * @file hr.types.ts
 * @description Tipos e interfaces para el módulo de Recursos Humanos.
 */

import { ViewType } from '../../../types';

export interface Employee {
    id: string;
    name: string;
    identification: string; // Cédula o RUC
    username: string;
    password?: string;
    roleId: string;
    phone: string;
    shifts: { [key: string]: string }; // Day: 'AM', 'PM', 'Libre'
    salary: number;
    equipment: { uniform: boolean; epp: boolean };
}

export interface Role {
    id: string;
    name: string;
    permissions: {
        [key in ViewType]?: boolean;
    };
}

export interface Training {
    id: string;
    employeeId: string;
    course: string;
    status: 'Pendiente' | 'En Progreso' | 'Completado';
    completionDate?: string;
}
