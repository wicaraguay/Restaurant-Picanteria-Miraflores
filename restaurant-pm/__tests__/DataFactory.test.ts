/**
 * @file DataFactory.test.ts
 * @description Unit tests para DataFactory
 * 
 * @purpose
 * Verifica que DataFactory crea datos correctamente.
 * Valida estructura y tipos de datos generados.
 * 
 * @layer Tests
 */

import { DataFactory } from '../src/services/factories/DataFactory';
import { DAYS_OF_WEEK } from '../src/constants';

describe('DataFactory', () => {
    describe('createDefaultRoles', () => {
        it('should create 4 default roles', () => {
            const roles = DataFactory.createDefaultRoles();
            expect(roles).toHaveLength(4);
        });

        it('should create roles with correct structure', () => {
            const roles = DataFactory.createDefaultRoles();
            roles.forEach(role => {
                expect(role).toHaveProperty('id');
                expect(role).toHaveProperty('name');
                expect(role).toHaveProperty('permissions');
                expect(typeof role.id).toBe('string');
                expect(typeof role.name).toBe('string');
                expect(typeof role.permissions).toBe('object');
            });
        });

        it('should create admin role with all permissions', () => {
            const roles = DataFactory.createDefaultRoles();
            const adminRole = roles.find(r => r.name === 'Administrador');

            expect(adminRole).toBeDefined();
            expect(adminRole?.permissions.dashboard).toBe(true);
            expect(adminRole?.permissions.customers).toBe(true);
            expect(adminRole?.permissions.orders).toBe(true);
            expect(adminRole?.permissions.menu).toBe(true);
            expect(adminRole?.permissions.kitchen).toBe(true);
            expect(adminRole?.permissions.hr).toBe(true);
            expect(adminRole?.permissions.settings).toBe(true);
            expect(adminRole?.permissions.billing).toBe(true);
        });
    });

    describe('createDefaultEmployees', () => {
        it('should create 4 default employees', () => {
            const employees = DataFactory.createDefaultEmployees();
            expect(employees).toHaveLength(4);
        });

        it('should create employees with correct structure', () => {
            const employees = DataFactory.createDefaultEmployees();
            employees.forEach(employee => {
                expect(employee).toHaveProperty('id');
                expect(employee).toHaveProperty('name');
                expect(employee).toHaveProperty('username');
                expect(employee).toHaveProperty('roleId');
                expect(employee).toHaveProperty('shifts');
                expect(employee).toHaveProperty('equipment');
            });
        });

        it('should create shifts for all days of week', () => {
            const employees = DataFactory.createDefaultEmployees();
            employees.forEach(employee => {
                DAYS_OF_WEEK.forEach(day => {
                    expect(employee.shifts).toHaveProperty(day);
                });
            });
        });
    });

    describe('createDefaultCustomers', () => {
        it('should create customers array', () => {
            const customers = DataFactory.createDefaultCustomers();
            expect(Array.isArray(customers)).toBe(true);
            expect(customers.length).toBeGreaterThan(0);
        });

        it('should create customers with valid structure', () => {
            const customers = DataFactory.createDefaultCustomers();
            customers.forEach(customer => {
                expect(customer).toHaveProperty('id');
                expect(customer).toHaveProperty('name');
                expect(customer).toHaveProperty('email');
                expect(customer).toHaveProperty('phone');
                expect(customer).toHaveProperty('loyaltyPoints');
            });
        });
    });

    describe('createDefaultMenuItems', () => {
        it('should create menu items array', () => {
            const items = DataFactory.createDefaultMenuItems();
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);
        });

        it('should create menu items with valid structure', () => {
            const items = DataFactory.createDefaultMenuItems();
            items.forEach(item => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('name');
                expect(item).toHaveProperty('price');
                expect(item).toHaveProperty('category');
                expect(typeof item.price).toBe('number');
                expect(item.price).toBeGreaterThan(0);
            });
        });
    });

    describe('createAllDefaultData', () => {
        it('should create all data types', () => {
            const data = DataFactory.createAllDefaultData();

            expect(data).toHaveProperty('roles');
            expect(data).toHaveProperty('employees');
            expect(data).toHaveProperty('customers');
            expect(data).toHaveProperty('reservations');
            expect(data).toHaveProperty('menuItems');
            expect(data).toHaveProperty('orders');
            expect(data).toHaveProperty('bills');
        });

        it('should create non-empty arrays for all data types', () => {
            const data = DataFactory.createAllDefaultData();

            expect(data.roles.length).toBeGreaterThan(0);
            expect(data.employees.length).toBeGreaterThan(0);
            expect(data.customers.length).toBeGreaterThan(0);
            expect(data.menuItems.length).toBeGreaterThan(0);
        });
    });
});
