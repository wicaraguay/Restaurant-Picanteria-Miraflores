/**
 * @file Login.tsx
 * @description Componente de inicio de sesión - REFACTORIZADO
 * 
 * @purpose
 * Formulario de login integrado con AuthContext.
 * AHORA USA useAuth() hook en lugar de props.
 * 
 * @layer Components - UI
 */

import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, UserIcon, LockIcon } from './Icons';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { config } = useRestaurantConfig();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (!success) {
        setError('Credenciales incorrectas. Intenta de nuevo.');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ease-in-out dark:bg-dark-700 dark:border-dark-600 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-dark-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px]"></div>

      <div className="relative w-full max-w-md p-8 mx-4 space-y-8 bg-white/95 rounded-2xl shadow-2xl backdrop-blur-md dark:bg-dark-800/95 border border-white/20 dark:border-dark-600/50">
        <div className="text-center">
          {config.logo ? (
            <img src={config.logo} alt={config.name} className="mx-auto w-16 h-16 object-contain mb-4" />
          ) : (
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 transform rotate-3">
              <svg className="w-9 h-9 text-white transform -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{config.name}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            {config.slogan || 'Sistema de Gestión Gastronómica'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
              <label htmlFor="username" className="sr-only">Nombre de Usuario</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200">
                <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={inputClasses}
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative group">
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200">
                <LockIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className={`${inputClasses} pr-10`}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800/50 animate-pulse">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-[1.01]"
            >
              Iniciar Sesión
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} {config.name}. Todos los derechos reservados.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;