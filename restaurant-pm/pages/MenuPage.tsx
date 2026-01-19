/**
 * Página Pública del Menú - Diseño Premium
 * 
 * Muestra el menú del restaurante con diseño elegante, moderno y profesional.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MenuItem } from '../types';
import { logger } from '../utils/logger';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';

const MenuPage: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { config } = useRestaurantConfig();

    const checkBusinessStatus = () => {
        const now = new Date();
        const day = now.getDay(); // 0 = Domingo, 5 = Viernes, 6 = Sábado
        const hour = now.getHours();

        const isWeekEnd = day === 0 || day === 5 || day === 6;
        const isWorkingHours = hour >= 9 && hour < 21; // 9:00 AM - 9:00 PM

        setIsOpen(isWeekEnd && isWorkingHours);
    };

    const fetchMenu = async () => {
        try {
            logger.info('Fetching menu for public page');
            const items = await api.menu.getAll();
            setMenuItems(items.filter(item => item.available));
            setLoading(false);
        } catch (error) {
            logger.error('Failed to fetch menu', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
        checkBusinessStatus();

        const intervalId = setInterval(() => {
            fetchMenu();
            checkBusinessStatus();
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>
                        <div className="absolute inset-0 inline-block animate-ping rounded-full h-20 w-20 border-4 border-white opacity-20"></div>
                    </div>
                    <p className="mt-6 text-2xl text-white font-bold animate-pulse">Preparando sabores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section - Warm & Elegant */}
            <header className="relative h-[70vh] overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/90 via-orange-600/90 to-red-600/90"></div>

                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>

                {/* Floating shapes decoration */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                {/* Contenido del Hero */}
                <div className="relative h-full flex items-center justify-center text-center px-4">
                    {/* Status Badge - Top Right */}
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
                        <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all duration-300 ${isOpen ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                            <span className={`relative flex h-3 w-3`}>
                                {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isOpen ? 'bg-white' : 'bg-red-500'}`}></span>
                            </span>
                            {isOpen ? 'ABIERTO' : 'CERRADO'}
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">

                        {/* Logo */}
                        {config.logo ? (
                            <img
                                src={config.logo}
                                alt={config.name}
                                className="mx-auto w-40 h-40 object-contain mb-4 drop-shadow-2xl"
                            />
                        ) : (
                            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm shadow-2xl mb-4 border-4 border-white/30">
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        )}

                        {/* Title */}
                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight drop-shadow-2xl animate-pop-in">
                            {config.name}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-2xl md:text-3xl text-white/95 font-light max-w-2xl mx-auto drop-shadow-lg">
                            {config.slogan || 'Descubre los sabores auténticos de nuestra cocina'}
                        </p>

                        {/* Decorative divider */}
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className="h-1 w-20 bg-white/40 rounded-full"></div>
                            <div className="w-3 h-3 rounded-full bg-white shadow-lg animate-pulse"></div>
                            <div className="h-1 w-20 bg-white/40 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Smooth wave divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="#f8fafc" />
                    </svg>
                </div>
            </header>

            {/* Menu Items - Simple & Direct */}
            <main id="menu-items" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">Nuestro Menú</h2>
                    <div className="h-1 w-32 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto"></div>
                </div>

                {/* Simple Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {menuItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            style={{
                                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                            }}
                        >
                            {/* Image */}
                            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                <img
                                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'}
                                    alt={item.name}
                                    loading="eager"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />

                                {/* Price Badge */}
                                <div className="absolute top-4 right-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white px-6 py-3 rounded-full font-bold text-2xl shadow-xl">
                                    ${item.price.toFixed(2)}
                                </div>

                                {/* Category Badge */}
                                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                                    {item.category}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                    {item.name}
                                </h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    {item.description}
                                </p>

                                {/* Simple Order Button */}
                                <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                                    Ordenar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {menuItems.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-8xl mb-6">🍽️</div>
                        <h3 className="text-3xl font-bold text-gray-800 mb-3">No hay platos disponibles</h3>
                        <p className="text-gray-500 text-lg">Vuelve pronto para ver nuestro menú</p>
                    </div>
                )}
            </main>

            {/* Footer Premium */}
            <footer className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white py-16 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                        {/* Brand */}
                        <div className="text-center md:text-left">
                            <h3 className="text-3xl font-bold mb-4 text-white drop-shadow-md">
                                {config.name}
                            </h3>
                            <p className="text-amber-50 text-lg font-medium">
                                {config.slogan || 'Sabores auténticos que deleitan tu paladar'}
                            </p>
                            <img src="/image1.png" alt="Sabor Tradicional" className="mt-4 w-60 h-auto rounded-lg shadow-lg opacity-90 hover:opacity-100 transition-opacity mx-auto md:mx-0" />
                        </div>

                        {/* Horarios */}
                        <div className="text-center">
                            <h4 className="text-xl font-bold mb-4 text-amber-100">Horarios</h4>
                            <p className="text-white/90 mb-2">Lunes - Viernes</p>
                            <p className="text-white font-bold mb-4 text-lg">11:00 AM - 10:00 PM</p>
                            <p className="text-white/90 mb-2">Sábado - Domingo</p>
                            <p className="text-white font-bold text-lg">12:00 PM - 11:00 PM</p>
                        </div>

                        {/* Contacto */}
                        <div className="text-center md:text-right">
                            <h4 className="text-xl font-bold mb-4 text-amber-100">Contacto</h4>
                            <div className="space-y-3">
                                <p className="text-white/90 flex items-center justify-center md:justify-end gap-2">
                                    <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {config.phone}
                                </p>
                                <p className="text-white/90 flex items-center justify-center md:justify-end gap-2">
                                    <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {config.email}
                                </p>
                                <p className="text-white/90 flex items-center justify-center md:justify-end gap-2">
                                    <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {config.address}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent mb-8 opacity-50"></div>

                    {/* Copyright */}
                    <div className="text-center text-amber-100/80">
                        <p>&copy; {new Date().getFullYear()} {config.name}. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 1s ease-out;
                }

                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                @keyframes popIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    70% {
                        transform: scale(1.1);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-pop-in {
                    animation: popIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
                }
            `}</style>
        </div>
    );
};

export default MenuPage;
