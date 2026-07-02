/**
 * @file AppStateContext.tsx
 * @description Context global para estado de la aplicación (Observer Pattern)
 * 
 * @purpose
 * Centraliza el estado global de la aplicación (customers, orders, menu, bills).
 * Implementa Observer Pattern vía React Context.
 * Elimina props drilling y consolida múltiples useState.
 * 
 * @connections
 * - Usa: types.ts (Customer, Order, MenuItem, Bill, etc.)
 * - Usa: DataService (para cargar datos)
 * - Usado por: Componentes de la aplicación
 * 
 * @layer Contexts - State Management (Observer Pattern)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Customer, Reservation } from '../modules/customers';
import { Bill } from '../modules/billing';
import { Order } from '../modules/orders';
import { MenuItem } from '../modules/menu';
import { Employee, Role } from '../modules/hr';
import { DataFactory } from '../services/factories/DataFactory';

/**
 * Tipo del estado de la aplicación
 */
interface AppState {
    customers: Customer[];
    orders: Order[];
    menuItems: MenuItem[];
    bills: Bill[];
    reservations: Reservation[];
    employees: Employee[];
    roles: Role[];
}

/**
 * Tipo del contexto
 */
type Updater<T> = T | ((prev: T) => T);

interface AppStateContextType {
    // Estado
    state: AppState;

    // Setters individuales (aceptan valor directo o función updater para evitar stale closures)
    setCustomers: (customers: Updater<Customer[]>) => void;
    setOrders: (orders: Updater<Order[]>) => void;
    setMenuItems: (menuItems: Updater<MenuItem[]>) => void;
    setBills: (bills: Updater<Bill[]>) => void;
    setReservations: (reservations: Updater<Reservation[]>) => void;
    setEmployees: (employees: Updater<Employee[]>) => void;
    setRoles: (roles: Updater<Role[]>) => void;

    // Helpers
    addCustomer: (customer: Customer) => void;
    updateCustomer: (id: string, updates: Partial<Customer>) => void;
    deleteCustomer: (id: string) => void;

    addOrder: (order: Order) => void;
    updateOrder: (id: string, updates: Partial<Order>) => void;
    deleteOrder: (id: string) => void;

    addMenuItem: (item: MenuItem) => void;
    updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
    deleteMenuItem: (id: string) => void;

    addBill: (bill: Bill) => void;

    // Reset
    resetState: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

/**
 * Estado inicial usando DataFactory
 */
const getInitialState = (): AppState => {
    return {
        customers: [],
        orders: [],
        menuItems: [],
        bills: [],
        reservations: [],
        employees: [],
        roles: []
    };
};

/**
 * Provider del contexto de estado
 */
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(getInitialState());

    // Resuelve un Updater<T> (valor directo o función) contra el estado previo REAL.
    // Esto evita stale closures: la función updater siempre recibe el estado más reciente.
    const resolve = <T,>(value: Updater<T>, prev: T): T =>
        typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

    // Setters individuales
    const setCustomers = useCallback((customers: Updater<Customer[]>) => {
        setState(prev => ({ ...prev, customers: resolve(customers, prev.customers) }));
    }, []);

    const setOrders = useCallback((orders: Updater<Order[]>) => {
        setState(prev => ({ ...prev, orders: resolve(orders, prev.orders) }));
    }, []);

    const setMenuItems = useCallback((menuItems: Updater<MenuItem[]>) => {
        setState(prev => ({ ...prev, menuItems: resolve(menuItems, prev.menuItems) }));
    }, []);

    const setBills = useCallback((bills: Updater<Bill[]>) => {
        setState(prev => ({ ...prev, bills: resolve(bills, prev.bills) }));
    }, []);

    const setReservations = useCallback((reservations: Updater<Reservation[]>) => {
        setState(prev => ({ ...prev, reservations: resolve(reservations, prev.reservations) }));
    }, []);

    const setEmployees = useCallback((employees: Updater<Employee[]>) => {
        setState(prev => ({ ...prev, employees: resolve(employees, prev.employees) }));
    }, []);

    const setRoles = useCallback((roles: Updater<Role[]>) => {
        setState(prev => ({ ...prev, roles: resolve(roles, prev.roles) }));
    }, []);

    // Helpers para customers
    const addCustomer = useCallback((customer: Customer) => {
        setState(prev => ({
            ...prev,
            customers: [...prev.customers, customer]
        }));
    }, []);

    const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
        setState(prev => ({
            ...prev,
            customers: prev.customers.map(c =>
                c.id === id ? { ...c, ...updates } : c
            )
        }));
    }, []);

    const deleteCustomer = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            customers: prev.customers.filter(c => c.id !== id)
        }));
    }, []);

    // Helpers para orders
    const addOrder = useCallback((order: Order) => {
        setState(prev => ({
            ...prev,
            orders: [...prev.orders, order]
        }));
    }, []);

    const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
        setState(prev => ({
            ...prev,
            orders: prev.orders.map(o =>
                o.id === id ? { ...o, ...updates } : o
            )
        }));
    }, []);

    const deleteOrder = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            orders: prev.orders.filter(o => o.id !== id)
        }));
    }, []);

    // Helpers para menu items
    const addMenuItem = useCallback((item: MenuItem) => {
        setState(prev => ({
            ...prev,
            menuItems: [...prev.menuItems, item]
        }));
    }, []);

    const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
        setState(prev => ({
            ...prev,
            menuItems: prev.menuItems.map(m =>
                m.id === id ? { ...m, ...updates } : m
            )
        }));
    }, []);

    const deleteMenuItem = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            menuItems: prev.menuItems.filter(m => m.id !== id)
        }));
    }, []);

    // Helpers para bills
    const addBill = useCallback((bill: Bill) => {
        setState(prev => ({
            ...prev,
            bills: [...prev.bills, bill]
        }));
    }, []);

    // Reset
    const resetState = useCallback(() => {
        setState(getInitialState());
    }, []);

    const value: AppStateContextType = {
        state,
        setCustomers,
        setOrders,
        setMenuItems,
        setBills,
        setReservations,
        setEmployees,
        setRoles,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addOrder,
        updateOrder,
        deleteOrder,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addBill,
        resetState
    };

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    );
};

/**
 * Hook para usar el contexto de estado
 */
export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
};
