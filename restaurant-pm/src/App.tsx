/**
 * Punto de Entrada Principal con Routing
 * 
 * Configura las rutas de la aplicación:
 * - / : Página pública del menú
 * - /admin : Panel administrativo
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import MenuPage from './pages/MenuPage';
import AdminApp from './AdminApp';
import ForgotPassword from './modules/auth/components/ForgotPassword';
import ResetPassword from './modules/auth/components/ResetPassword';
import { RestaurantConfigProvider } from './contexts/RestaurantConfigContext';

// La app móvil nativa (Capacitor) usa un shell ENFOCADO y distinto al de la web.
// Se carga de forma perezosa para no inflar el bundle del navegador.
const MobileApp = lazy(() => import('./mobile/MobileApp'));

const App: React.FC = () => {
  // Cuando corre como app nativa (APK), mostramos la experiencia móvil enfocada
  // (Pedidos, Cocina, POS, Facturar). En navegador se sigue usando la web completa.
  if (Capacitor.isNativePlatform()) {
    return (
      <RestaurantConfigProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <MobileApp />
          </Suspense>
        </BrowserRouter>
      </RestaurantConfigProvider>
    );
  }

  return (
    <RestaurantConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RestaurantConfigProvider>
  );
};

export default App;
