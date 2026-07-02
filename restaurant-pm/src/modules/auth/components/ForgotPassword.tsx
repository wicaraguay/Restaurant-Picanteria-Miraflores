/**
 * @file ForgotPassword.tsx
 * @description Página para solicitar recuperación de contraseña
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';
import { api } from '../../../api';

const ForgotPassword: React.FC = () => {
    const { config } = useRestaurantConfig();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const inputClasses = "block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ease-in-out dark:bg-dark-700 dark:border-dark-600 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-dark-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.auth.forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')" }}>
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px]"></div>

            <div className="relative w-full max-w-md p-8 mx-4 space-y-8 bg-white/95 rounded-2xl shadow-2xl backdrop-blur-md dark:bg-dark-800/95 border border-white/20 dark:border-dark-600/50">
                <div className="text-center">
                    {config.logo ? (
                        <img src={config.logo} alt={config.name} className="mx-auto w-16 h-16 object-contain mb-4" />
                    ) : (
                        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 transform rotate-3">
                            <svg className="w-9 h-9 text-white transform -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Recuperar Contrasena
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Ingresa tu email y te enviaremos instrucciones
                    </p>
                </div>

                {success ? (
                    <div className="space-y-6">
                        <div className="flex items-center p-4 text-sm text-green-700 bg-green-50 rounded-lg dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800/50">
                            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-medium">Correo enviado</p>
                                <p className="text-xs mt-1 opacity-80">Si el email existe en nuestro sistema, recibiras instrucciones para restablecer tu contrasena.</p>
                            </div>
                        </div>
                        <Link
                            to="/login"
                            className="block w-full text-center py-3 px-4 border border-gray-200 text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 dark:bg-dark-700 dark:text-gray-200 dark:border-dark-600 dark:hover:bg-dark-600 transition-all"
                        >
                            Volver al inicio de sesion
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="relative group">
                            <label htmlFor="email" className="sr-only">Email</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className={inputClasses}
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800/50">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                'Enviar instrucciones'
                            )}
                        </button>

                        <div className="text-center">
                            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                Volver al inicio de sesion
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
