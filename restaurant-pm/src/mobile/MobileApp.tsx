/**
 * MobileApp — Shell de la app móvil nativa (Capacitor).
 *
 * Es una experiencia ENFOCADA (no toda la gestión web): Pedidos, Cocina, POS y
 * Facturación. Reutiliza los MISMOS providers, hooks y componentes del admin —
 * NO duplica lógica de negocio. Solo cambia el layout a uno móvil.
 *
 * Se monta únicamente cuando la app corre como app nativa
 * (Capacitor.isNativePlatform() en App.tsx). En navegador se sigue usando la web.
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { AuthProvider, useAuth } from '../modules/auth/contexts/AuthContext';
import { AlertProvider } from '../components/ui/AlertProvider';
import { AppStateProvider, useAppState } from '../contexts/AppStateContext';
import { useAppData } from '../hooks/useAppData';
import { orderService } from '../modules/orders/services/OrderService';
import { Order } from '../modules/orders/types/order.types';

import MobileLayout from './layout/MobileLayout';
import MobileDashboard from './screens/MobileDashboard';
import MobilePedidos from './screens/MobilePedidos';
import MobileCocina from './screens/MobileCocina';
import MobilePOS from './screens/MobilePOS';
import MobileFacturar from './screens/MobileFacturar';
import MobileMenu from './screens/MobileMenu';
import MobileConfig from './screens/MobileConfig';

const Login = lazy(() => import('../modules/auth/components/Login'));

const Spinner: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
);

/**
 * Contenido autenticado: carga datos, mantiene los pedidos en vivo (polling)
 * y enruta a las pantallas móviles dentro del layout.
 */
const MobileShell: React.FC = () => {
    const { setOrders } = useAppState();
    const { isLoading } = useAppData();

    // Polling de pedidos cada 5s (mismo criterio que el admin) para que Pedidos
    // y Cocina se mantengan al día sin recargar.
    useEffect(() => {
        if (isLoading) return;
        const poll = async () => {
            try {
                const res: any = await orderService.getAll();
                const orders: Order[] = Array.isArray(res) ? res : (res?.data ?? []);
                setOrders(() => orders);
            } catch {
                /* silencioso: un fallo de red puntual no debe romper la UI */
            }
        };
        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, [isLoading, setOrders]);

    if (isLoading) return <Spinner />;

    return (
        <Routes>
            <Route element={<MobileLayout />}>
                <Route index element={<Navigate to="inicio" replace />} />
                <Route path="inicio" element={<MobileDashboard />} />
                <Route path="pedidos" element={<MobilePedidos />} />
                <Route path="cocina" element={<MobileCocina />} />
                <Route path="pos" element={<MobilePOS />} />
                <Route path="facturar" element={<MobileFacturar />} />
                <Route path="menu" element={<MobileMenu />} />
                <Route path="config" element={<MobileConfig />} />
                <Route path="*" element={<Navigate to="pedidos" replace />} />
            </Route>
        </Routes>
    );
};

/**
 * Puerta de autenticación: reutiliza el Login del sistema.
 */
const MobileGate: React.FC = () => {
    const { currentUser, isLoading } = useAuth();
    if (isLoading) return <Spinner />;
    if (!currentUser) {
        return (
            <Suspense fallback={<Spinner />}>
                <Login />
            </Suspense>
        );
    }
    return <MobileShell />;
};

const MobileApp: React.FC = () => {
    // Pulido nativo: barra de estado azul (a juego con el header) y ocultar el splash
    // una vez que la app montó. Solo aplica cuando corre como app nativa.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        (async () => {
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#2563EB' });
            } catch {
                /* el plugin puede no estar disponible en algún entorno: no es crítico */
            }
            try {
                const { SplashScreen } = await import('@capacitor/splash-screen');
                await SplashScreen.hide();
            } catch {
                /* idem */
            }
        })();
    }, []);

    return (
        <AuthProvider>
            <AlertProvider>
                <AppStateProvider>
                    <MobileGate />
                </AppStateProvider>
            </AlertProvider>
        </AuthProvider>
    );
};

export default MobileApp;
