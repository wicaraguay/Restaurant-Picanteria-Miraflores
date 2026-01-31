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
import { Customer, Order, MenuItem, Bill, Reservation, Employee, Role } from '../types';
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
interface AppStateContextType {
    // Estado
    state: AppState;

    // Setters individuales
    setCustomers: (customers: Customer[]) => void;
    setOrders: (orders: Order[]) => void;
    setMenuItems: (menuItems: MenuItem[]) => void;
    setBills: (bills: Bill[]) => void;
    setReservations: (reservations: Reservation[]) => void;
    setEmployees: (employees: Employee[]) => void;
    setRoles: (roles: Role[]) => void;

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
    const defaultData = DataFactory.createAllDefaultData();
    return {
        customers: defaultData.customers,
        orders: defaultData.orders,
        menuItems: defaultData.menuItems,
        bills: defaultData.bills,
        reservations: defaultData.reservations,
        employees: defaultData.employees,
        roles: defaultData.roles
    };
};

/**
 * Provider del contexto de estado
 */
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(getInitialState());

    // Setters individuales
    const setCustomers = useCallback((customers: Customer[]) => {
        setState(prev => ({ ...prev, customers }));
    }, []);

    const setOrders = useCallback((orders: Order[]) => {
        setState(prev => ({ ...prev, orders }));
    }, []);

    const setMenuItems = useCallback((menuItems: MenuItem[]) => {
        setState(prev => ({ ...prev, menuItems }));
    }, []);

    const setBills = useCallback((bills: Bill[]) => {
        setState(prev => ({ ...prev, bills }));
    }, []);

    const setReservations = useCallback((reservations: Reservation[]) => {
        setState(prev => ({ ...prev, reservations }));
    }, []);

    const setEmployees = useCallback((employees: Employee[]) => {
        setState(prev => ({ ...prev, employees }));
    }, []);

    const setRoles = useCallback((roles: Role[]) => {
        setState(prev => ({ ...prev, roles }));
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
