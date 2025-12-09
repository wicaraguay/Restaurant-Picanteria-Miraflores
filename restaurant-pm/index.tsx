/**
 * @file index.tsx
 * @description Punto de entrada principal de la aplicación React
 * 
 * @purpose
 * Inicializa la aplicación React montando el componente App en el DOM.
 * Configura React.StrictMode para detectar problemas potenciales.
 * 
 * @connections
 * - Usa: App.tsx (componente principal)
 * - Monta en: #root element en index.html
 * 
 * @layer Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
