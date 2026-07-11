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

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ViewType } from './types';
import { Customer, Reservation } from './modules/customers/types/customer.types';
import { Order } from './modules/orders/types/order.types';
import { MenuItem } from './modules/menu/types/menu.types';
import { Employee, Role } from './modules/hr/types/hr.types';
import { api } from './api'; // Import API for polling
import { orderService } from './modules/orders/services/OrderService';
import Sidebar from './components/layout/Sidebar';
import WhatsAppAlertCenter from './components/layout/WhatsAppAlertCenter';
import { SunIcon, MoonIcon } from './components/ui/Icons';
import { NAV_ITEMS } from './constants';
import { ErrorBoundary } from './components/fallback/ErrorBoundary';

// Contexts
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { AuthProvider, useAuth } from './modules/auth/contexts/AuthContext';
import { RestaurantConfigProvider } from './contexts/RestaurantConfigContext';
import { AlertProvider } from './components/ui/AlertProvider';

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
const WhatsAppManagement = lazy(() => import('./modules/whatsapp/components/WhatsAppManagement'));
const WebsiteManagement = lazy(() => import('./modules/website/components/WebsiteManagement'));
const CategoryManagement = lazy(() => import('./modules/categories/components/CategoryManagement'));

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
            if (isLoading) return;

            try {
                const response = await orderService.getAll();

                let orders: Order[] = [];
                if (Array.isArray(response)) {
                    orders = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    orders = response.data;
                } else {
                    console.warn("Polling received invalid orders format:", response);
                    return;
                }

                // Merge-guard: si un pedido se creó localmente mientras este fetch estaba
                // en vuelo, la respuesta del servidor aún no lo incluye. Sin este guard,
                // el reemplazo total del array haría "desaparecer" el pedido recién creado.
                setOrdersContext(prev => {
                    const serverIds = new Set(orders.map(o => o.id));
                    const now = Date.now();
                    const recentLocalOnly = prev.filter(o =>
                        !serverIds.has(o.id) &&
                        o.createdAt &&
                        now - new Date(o.createdAt).getTime() < 15000
                    );
                    return recentLocalOnly.length > 0 ? [...orders, ...recentLocalOnly] : orders;
                });
            } catch (error) {
                console.error("Error sincronizando pedidos:", error);
            }
        };

        const intervalId = setInterval(pollOrders, 5000);
        pollOrders();
        return () => clearInterval(intervalId);
    }, [setOrdersContext, isLoading]);

    // ✅ POLLING: Sincronización automática de clientes cada 10 seg
    // Esto asegura que clientes aprendidos por el backend (auto-learn) aparezcan en la lista
    useEffect(() => {
        const pollCustomers = async () => {
            if (isLoading) return;

            try {
                const response = await api.customers.getAll({ limit: 1000 });
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

    // Los setters del contexto ahora aceptan funciones updater de forma nativa
    // (resueltas contra el estado real, sin stale closures), así que los wrappers
    // solo delegan. Antes ejecutaban value(state.X) con un snapshot viejo del render,
    // lo que causaba que pedidos recién creados se perdieran al competir con el polling.
    const setMenuItems = setMenuItemsContext;
    const updateEmployees = setEmployeesContext;
    const updateRoles = setRolesContext;
    const updateOrders = setOrdersContext;
    const updateCustomers = setCustomersContext;
    const updateReservations = setReservationsContext;


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

                <main className="p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl mx-auto flex flex-col lg:min-h-screen">
                    <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="dashboard" element={<Dashboard orders={state.orders} reservations={state.reservations} />} />
                                {/* Redirect a /clientes: la navegación entre pestañas queda dentro
                                    de customers/:tab (cambio de param no remonta el componente) */}
                                <Route path="customers" element={<Navigate to="/admin/customers/clientes" replace />} />
                                <Route path="customers/:tab" element={
                                    <CustomerManagement
                                        customers={state.customers}
                                        setCustomers={updateCustomers}
                                        reservations={state.reservations}
                                        setReservations={updateReservations}
                                    />
                                } />
                                {/* Redirect a /tablero para que toda la navegación interna ocurra
                                    dentro de la misma ruta orders/:tab (cambio de param no remonta
                                    el componente y no se pierde el estado local, ej. editingOrder) */}
                                <Route path="orders" element={<Navigate to="/admin/orders/tablero" replace />} />
                                <Route path="orders/:tab" element={
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
                                <Route path="categories" element={<CategoryManagement />} />
                                <Route path="categories/:tab" element={<CategoryManagement />} />
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
                                <Route path="settings/:tab" element={<SettingsManagement />} />
                                <Route path="billing" element={<BillingHistory />} />
                                <Route path="billing/:tab" element={<BillingHistory />} />
                                <Route path="whatsapp" element={<WhatsAppManagement />} />
                                <Route path="whatsapp/:tab" element={<WhatsAppManagement />} />
                                <Route path="website" element={<WebsiteManagement />} />

                                <Route path="" element={<Navigate to="dashboard" replace />} />
                                <Route path="*" element={<Navigate to="dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>

                    {/* Crédito del desarrollador */}
                    <footer className="mt-auto pt-10 pb-2 text-center">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-600 tracking-wide">
                            Sistema desarrollado por{' '}
                            <a
                                href="https://willytech.dev/"
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-black"
                            >
                                WillyTech
                            </a>
                        </p>
                    </footer>
                </main>
            </div>

            <MobileBottomNav
                currentView={currentView}
                onViewChange={setCurrentView}
                navItems={navItems}
                onLogout={logout}
            />

            {/* Alertas persistentes de WhatsApp — visibles en todo el admin */}
            <WhatsAppAlertCenter />
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
            <AlertProvider>
                <RestaurantConfigProvider>
                    <AppStateProvider>
                        <AdminAppContent />
                    </AppStateProvider>
                </RestaurantConfigProvider>
            </AlertProvider>
        </AuthProvider>
    );
};

/**
 * Contenido interno que usa AuthContext
 */
const AdminAppContent: React.FC = () => {
    const { currentUser, isLoading } = useAuth();

    // PWA: el manifest se enlaza SOLO en el admin. Chrome ofrece "Instalar app"
    // a cualquier página que enlace un manifest válido (el scope no lo evita) —
    // al agregar el <link> únicamente aquí, los clientes de la web pública (/)
    // nunca ven la invitación de instalación; el personal en /admin sí.
    useEffect(() => {
        if (document.querySelector('link[rel="manifest"]')) return;
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.webmanifest';
        document.head.appendChild(link);
    }, []);

    // PWA: botón de instalación visible. Sin instalar, la app NUNCA se ve a
    // pantalla completa — el navegador solo oculta su UI en la app instalada.
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || (window.navigator as any).standalone === true; // iOS Safari

    useEffect(() => {
        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const onInstalled = () => setInstallPrompt(null);
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
    };

    const installBanner = (!isStandalone && installPrompt) ? (
        <button
            onClick={handleInstall}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
        >
            📲 Instalar App
        </button>
    ) : null;

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
                {installBanner}
            </ErrorBoundary>
        );
    }

    return (
        <>
            <AdminContent />
            {installBanner}
        </>
    );
};

export default AdminApp;
