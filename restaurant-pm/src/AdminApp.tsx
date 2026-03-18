/**
 * Componente Administrativo de la Aplicación - REFACTORIZADO + OPTIMIZADO
 * 
 * OPTIMIZACIONES IMPLEMENTADAS:
 * - ✅ Code Splitting: Lazy loading de componentes grandes
 * - ✅ Error Boundaries: Manejo de errores en componentes
 * - ✅ Suspense: Loading states para componentes lazy
 * - ✅ Memoization: useCallback para funciones (siguiente paso)
 * 
 * REFACTORIZACIÓN PREVIA:
 * - Eliminado código duplicado de auth (usa AuthContext)
 * - Eliminado datos hardcodeados (usa DataFactory)
 * - Eliminado fetchData manual (usa useAppData hook)
 * - Eliminado manejo de tema manual (usa useTheme hook)
 * - Eliminado navegación manual (usa useNavigation hook)
 * - Reducido de 321 líneas a ~150 líneas (-53%)
 */

import React, { lazy, Suspense, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ViewType } from './types';
import { Customer, Reservation } from './modules/customers/types/customer.types';
import { Order } from './modules/orders/types/order.types';
import { MenuItem } from './modules/menu/types/menu.types';
import { Employee, Role } from './modules/hr/types/hr.types';
import { api } from './api'; // Import API for polling
import { orderService } from './modules/orders/services/OrderService';
import Sidebar from './components/layout/Sidebar';
import { SunIcon, MoonIcon } from './components/ui/Icons';
import { NAV_ITEMS } from './constants';
import { ErrorBoundary } from './components/fallback/ErrorBoundary';

// Contexts
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { AuthProvider, useAuth } from './modules/auth/contexts/AuthContext';
import { RestaurantConfigProvider } from './contexts/RestaurantConfigContext';

// Hooks
import { useAppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import { useNavigation } from './hooks/useNavigation';

// Services


// ✅ CODE SPLITTING: Lazy load de componentes grandes
const Dashboard = lazy(() => import('./components/Dashboard'));
const CustomerManagement = lazy(() => import('./modules/customers/components/CustomerManagement'));

const OrderManagement = lazy(() => import('./modules/orders/components/OrderManagement'));
const MenuManagement = lazy(() => import('./modules/menu/components/MenuManagement'));
const KitchenManagement = lazy(() => import('./modules/kitchen/components/KitchenManagement'));
const HRManagement = lazy(() => import('./modules/hr/components/HRManagement'));
const SettingsManagement = lazy(() => import('./modules/settings/components/SettingsManagement'));
const Login = lazy(() => import('./modules/auth/components/Login'));
const MobileBottomNav = lazy(() => import('./components/layout/MobileBottomNav'));
const BillingHistory = lazy(() => import('./modules/billing/components/BillingHistory'));

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
    </div>
);

/**
 * Componente de contenido administrativo
 * Usa todos los hooks y contexts para gestión de estado
 */
const AdminContent: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { state, updateMenuItem, setMenuItems: setMenuItemsContext, setEmployees: setEmployeesContext, setRoles: setRolesContext, setOrders: setOrdersContext, setCustomers: setCustomersContext, setReservations: setReservationsContext } = useAppState();
    const { theme, toggleTheme } = useTheme();
    const { currentView, setCurrentView, navItems, getCurrentViewLabel } = useNavigation(currentUser);

    // Cargar datos iniciales automáticamente
    const { isLoading } = useAppData();

    // ✅ POLLING: Sincronización automática de pedidos cada 5 seg
    useEffect(() => {
        const pollOrders = async () => {
            // Avoid polling if already loading
            if (isLoading) return;

            try {
                // Usamos la API directamente para no recargar toda la app
                const response = await orderService.getAll();

                // Validate response is an array
                if (Array.isArray(response)) {
                    setOrdersContext(response);
                } else if (response && response.data && Array.isArray(response.data)) {
                    // Handle potential paginated/wrapped response
                    setOrdersContext(response.data);
                } else {
                    console.warn("Polling received invalid orders format:", response);
                }
            } catch (error) {
                console.error("Error sincronizando pedidos:", error);
            }
        };

        const intervalId = setInterval(pollOrders, 5000);
        return () => clearInterval(intervalId);
    }, [setOrdersContext, isLoading]);

    // ✅ POLLING: Sincronización automática de clientes cada 10 seg
    // Esto asegura que clientes aprendidos por el backend (auto-learn) aparezcan en la lista
    useEffect(() => {
        const pollCustomers = async () => {
            if (isLoading) return;

            try {
                const response = await api.customers.getAll();
                let customers: Customer[] = [];
                
                if (response && response.data) {
                    customers = Array.isArray(response.data) ? response.data : (response.data.data || []);
                } else {
                    customers = Array.isArray(response) ? response : [];
                }
                
                setCustomersContext(customers);
            } catch (error) {
                console.error("Error sincronizando clientes:", error);
            }
        };

        const intervalId = setInterval(pollCustomers, 10000);
        return () => clearInterval(intervalId);
    }, [setCustomersContext, isLoading]);

    // Wrapper para setMenuItems que acepta funciones updater
    const setMenuItems = useCallback((value: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => {
        if (typeof value === 'function') {
            // Si es una función, la ejecutamos con el estado actual
            setMenuItemsContext(value(state.menuItems));
        } else {
            // Si es un valor directo, lo pasamos tal cual
            setMenuItemsContext(value);
        }
    }, [state.menuItems, setMenuItemsContext]);

    // Wrapper para setEmployees
    const updateEmployees = useCallback((value: Employee[] | ((prev: Employee[]) => Employee[])) => {
        if (typeof value === 'function') {
            setEmployeesContext(value(state.employees));
        } else {
            setEmployeesContext(value);
        }
    }, [state.employees, setEmployeesContext]);

    // Wrapper para setRoles
    const updateRoles = useCallback((value: Role[] | ((prev: Role[]) => Role[])) => {
        if (typeof value === 'function') {
            setRolesContext(value(state.roles));
        } else {
            setRolesContext(value);
        }
    }, [state.roles, setRolesContext]);

    // Wrapper para setOrders
    const updateOrders = useCallback((value: Order[] | ((prev: Order[]) => Order[])) => {
        if (typeof value === 'function') {
            setOrdersContext(value(state.orders));
        } else {
            setOrdersContext(value);
        }
    }, [state.orders, setOrdersContext]);

    // Wrapper para setCustomers
    const updateCustomers = useCallback((value: Customer[] | ((prev: Customer[]) => Customer[])) => {
        if (typeof value === 'function') {
            setCustomersContext(value(state.customers));
        } else {
            setCustomersContext(value);
        }
    }, [state.customers, setCustomersContext]);

    // Wrapper para setReservations
    const updateReservations = useCallback((value: Reservation[] | ((prev: Reservation[]) => Reservation[])) => {
        if (typeof value === 'function') {
            setReservationsContext(value(state.reservations));
        } else {
            setReservationsContext(value);
        }
    }, [state.reservations, setReservationsContext]);


    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors">
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                theme={theme}
                setTheme={toggleTheme}
                navItems={navItems}
                onLogout={logout}
            />

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md dark:bg-dark-800/80 border-b border-gray-200 dark:border-dark-700 px-4 py-4 lg:hidden flex justify-between items-center shadow-sm">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-light-background">
                        {getCurrentViewLabel()}
                    </h1>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
                    >
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                </header>

                <main className="p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl mx-auto">
                    <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="dashboard" element={<Dashboard orders={state.orders} reservations={state.reservations} />} />
                                <Route path="customers" element={
                                    <CustomerManagement
                                        customers={state.customers}
                                        setCustomers={updateCustomers}
                                        reservations={state.reservations}
                                        setReservations={updateReservations}
                                    />
                                } />
                                <Route path="orders" element={
                                    <OrderManagement
                                        orders={state.orders}
                                        setOrders={updateOrders}
                                        menuItems={state.menuItems}
                                    />
                                } />
                                <Route path="menu" element={
                                    <MenuManagement
                                        menuItems={state.menuItems}
                                        setMenuItems={setMenuItems}
                                    />
                                } />
                                <Route path="kitchen" element={<KitchenManagement orders={state.orders} setOrders={updateOrders} />} />
                                <Route path="hr" element={
                                    <HRManagement
                                        employees={state.employees}
                                        setEmployees={updateEmployees}
                                        roles={state.roles}
                                        setRoles={updateRoles}
                                    />
                                } />
                                <Route path="settings" element={<SettingsManagement />} />
                                <Route path="billing" element={<BillingHistory />} />

                                <Route path="" element={<Navigate to="dashboard" replace />} />
                                <Route path="*" element={<Navigate to="dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>

            <MobileBottomNav
                currentView={currentView}
                onViewChange={setCurrentView}
                navItems={navItems}
                onLogout={logout}
            />
        </div>
    );
};

/**
 * Componente principal de la aplicación administrativa
 * Envuelve todo en providers necesarios
 */
const AdminApp: React.FC = () => {
    return (
        <AuthProvider>
            <RestaurantConfigProvider>
                <AppStateProvider>
                    <AdminAppContent />
                </AppStateProvider>
            </RestaurantConfigProvider>
        </AuthProvider>
    );
};

/**
 * Contenido interno que usa AuthContext
 */
const AdminAppContent: React.FC = () => {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                    <Login />
                </Suspense>
            </ErrorBoundary>
        );
    }

    return <AdminContent />;
};

export default AdminApp;
