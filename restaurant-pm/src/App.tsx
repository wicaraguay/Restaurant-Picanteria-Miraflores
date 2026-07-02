/**
 * Punto de Entrada Principal con Routing
 * 
 * Configura las rutas de la aplicación:
 * - / : Página pública del menú
 * - /admin : Panel administrativo
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import AdminApp from './AdminApp';
import ForgotPassword from './modules/auth/components/ForgotPassword';
import ResetPassword from './modules/auth/components/ResetPassword';
import { RestaurantConfigProvider } from './contexts/RestaurantConfigContext';

const App: React.FC = () => {
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
