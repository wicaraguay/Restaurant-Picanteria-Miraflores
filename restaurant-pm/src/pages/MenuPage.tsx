/**
 * Página Pública del Menú - Diseño Premium
 * 
 * Muestra el menú del restaurante con diseño elegante, moderno y profesional.
 */

import React, { useState, useEffect } from 'react';
import { menuService } from '../modules/menu/services/MenuService';
import { MenuItem } from '../modules/menu/types/menu.types';
import { logger } from '../utils/logger';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';

const MenuPage: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const { config } = useRestaurantConfig();

    const carouselSlides = [
        {
            url: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop",
            title: "Fritada Tradicional",
            subtitle: "El auténtico sabor de nuestra tierra con carne de cerdo premium y sazón artesanal."
        },
        {
            url: "https://images.unsplash.com/photo-1599481238640-4c1288750d7a?q=80&w=2070&auto=format&fit=crop",
            title: "Chicharrones Crujientes",
            subtitle: "La textura perfecta y el sabor inigualable de la mejor picantería de la ciudad."
        },
        {
            url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop",
            title: "Sancocho Especial",
            subtitle: "Un caldo sustancioso y reconfortante preparado con ingredientes frescos y seleccionados."
        },
        {
            url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2067&auto=format&fit=crop",
            title: "Poder Criollo",
            subtitle: "Donde la tradición se encuentra con la excelencia en cada bocado de nuestra cocina."
        }
    ];

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
            const items = await menuService.getAll();
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

        const menuInterval = setInterval(() => {
            fetchMenu();
            checkBusinessStatus();
        }, 30000); // Menu updates less frequently now

        const slideInterval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % carouselSlides.length);
        }, 6000); // Change image every 6 seconds

        return () => {
            clearInterval(menuInterval);
            clearInterval(slideInterval);
        };
    }, [carouselSlides.length]);

    const handleOrder = (item: MenuItem) => {
        // if (!isOpen) return; // Validación desactivada para permitir probar

        // AQUÍ SE TOMA EL NÚMERO DE WHATSAPP
        // Usando el número fijo que solicitaste
        const phoneNumber = '593967812717';

        // Construimos el mensaje con el Nombre, Precio y la FOTO (URL)
        const message = `Hola *${config.name}*, quisiera ordenar:%0A%0A` +
            `🍽️ *${item.name}* - $${item.price.toFixed(2)}%0A` +
            `📝 ${item.description || ''}%0A%0A`;

        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

        window.open(whatsappUrl, '_blank');
    };

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
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-200 selection:text-amber-900">
            {/* Elegant Navigation / Header */}
            <header className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden">
                {/* Image Carousel Background */}
                <div className="absolute inset-0 z-0">
                    {carouselSlides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img 
                                src={slide.url} 
                                alt={`Background slide ${index}`} 
                                className={`absolute inset-0 w-full h-full object-cover scale-110 blur-[1px] ${index === currentSlide ? 'animate-pulse-slow' : ''}`}
                            />
                        </div>
                    ))}
                    {/* Dark Gradient Overlay for readability with lower opacity */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/60 via-orange-900/50 to-red-950/60 z-10"></div>
                </div>

                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 p-6 z-30 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden">
                            {config.logo ? (
                                <img src={config.logo} alt={config.name} className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-white font-black text-xl">PM</span>
                            )}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-white font-bold text-lg leading-tight">{config.name}</h2>
                            <p className="text-amber-200/80 text-xs tracking-widest uppercase">{config.slogan || 'Sabor Tradicional'}</p>
                        </div>
                    </div>

                    <div className={`group relative px-5 py-2.5 rounded-2xl font-bold text-sm backdrop-blur-xl border border-white/10 flex items-center gap-3 transition-all duration-500 hover:scale-105 ${isOpen ? 'bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-red-500/20 text-red-100'}`}>
                        <span className="relative flex h-2.5 w-2.5">
                            {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        </span>
                        <span>{isOpen ? 'Abierto Ahora' : 'Cerrado Temporalmente'}</span>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="container mx-auto px-6 relative z-20 text-center space-y-6">
                    <div key={currentSlide} className="inline-block animate-fade-in-up">
                        <div className="mt-4">
                            <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold tracking-[0.2em] uppercase border border-amber-500/30 mb-6 inline-block">
                                Experiencia Gastronómica Real
                            </span>
                            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-tight mb-6 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
                                {carouselSlides[currentSlide].title.split(' ')[0]} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                    {carouselSlides[currentSlide].title.split(' ').slice(1).join(' ')}
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed mb-10 h-[3rem]">
                                {carouselSlides[currentSlide].subtitle}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            <button 
                                onClick={() => document.getElementById('menu-items')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-2xl shadow-2xl shadow-orange-600/40 hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                                Explorar la Carta
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modern Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0 z-10">
                    <svg viewBox="0 0 1440 120" className="w-full h-auto translate-y-px">
                        <path fill="#f8fafc" d="M0,96L48,85.3C96,75,192,53,288,53.3C384,53,480,75,576,85.3C672,96,768,96,864,85.3C960,75,1056,53,1152,42.7C1248,32,1344,32,1392,32L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
                    </svg>
                </div>
            </header>

            {/* Menu Section */}
            <main id="menu-items" className="container mx-auto px-6 py-24">
                <div className="flex flex-col md:flex-row items-end justify-between mb-20 space-y-6 md:space-y-0">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
                            Nuestra <span className="text-amber-600 underline decoration-amber-200 underline-offset-8">Selección</span>
                        </h2>
                        <p className="text-lg text-slate-500 font-light leading-relaxed">
                            Platos elaborados artesanalmente con ingredientes de temporada y la pasión que nos caracteriza.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest bg-slate-100 px-5 py-2.5 rounded-2xl border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {menuItems.length} Platos Disponibles
                    </div>
                </div>

                {/* Grid Layout with Modern Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {menuItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="group relative bg-white rounded-[2.5rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-3 animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Image Container */}
                            <div className="relative h-72 rounded-[2rem] overflow-hidden mb-8">
                                <img
                                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Labels */}
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <span className="px-4 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest border border-white/50 shadow-xl">
                                        {item.category}
                                    </span>
                                    <div className="bg-amber-500 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-2xl shadow-amber-500/40 group-hover:rotate-[360deg] transition-transform duration-700">
                                        ${item.price.toFixed(0)}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-4 pb-4">
                                <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-slate-500 font-light leading-relaxed mb-8 line-clamp-2 min-h-[3rem]">
                                    {item.description}
                                </p>

                                <button
                                    onClick={() => handleOrder(item)}
                                    className="w-full relative overflow-hidden group/btn bg-slate-900 text-white py-5 rounded-2xl font-bold transition-all duration-300 active:scale-95 shadow-xl hover:shadow-amber-500/20"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-3">
                                        Ordenar por WhatsApp
                                        <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766zm-3.235 3.326c.148-.28.423-.326.697-.309.28.016.398-.01.52.279.148.35.39.957.423 1.025.033.068.047.169.006.27-.043.101-.066.162-.129.227-.064.065-.133.144-.191.205-.065.068-.13.14-.055.273.076.133.334.686.711 1.026.483.435.889.57 1.017.632.128.062.204.053.28-.035.076-.088.326-.419.414-.564.088-.145.176-.119.303-.075.127.043.803.379.94.448.138.07.23.104.263.162.033.058.033.337-.113.75-.147.413-.865.811-1.187.848-.322.038-.621-.027-1.428-.35-1.012-.405-1.659-1.047-1.898-1.407-.239-.36-1.037-1.373-1.037-2.618 0-1.246.65-1.928.88-2.193.23-.266.496-.347.66-.347z" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {menuItems.length === 0 && !loading && (
                    <div className="text-center py-40 animate-fade-in">
                        <div className="text-9xl mb-10 opacity-10">🍳</div>
                        <h3 className="text-4xl font-black text-slate-900 mb-4">Cocina en Preparación</h3>
                        <p className="text-xl text-slate-400 max-w-md mx-auto font-light">Estamos actualizando nuestra carta para ofrecerte lo mejor. Vuelve muy pronto.</p>
                    </div>
                )}
            </main>

            {/* Premium Footer */}
            <footer className="relative bg-slate-900 text-white pt-32 pb-16 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
                        {/* Brand Column */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl overflow-hidden p-1 shrink-0">
                                    {config.logo ? (
                                        <img src={config.logo} alt={config.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-slate-900 font-black text-xl">PM</span>
                                    )}
                                </div>
                                <h3 className="text-3xl font-black tracking-tight leading-tight">{config.name}</h3>
                            </div>
                            <p className="text-slate-400 font-light leading-relaxed">
                                Redescubre el sabor auténtico con una experiencia diseñada para deleitar tus sentidos en cada bocado.
                            </p>
                            <div className="flex space-x-4">
                                {/* WhatsApp */}
                                <a 
                                    href="https://wa.me/593967812717" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] transition-all duration-300 group shadow-lg"
                                    title="WhatsApp"
                                >
                                    <svg className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766zm-3.235 3.326c.148-.28.423-.326.697-.309.28.016.398-.01.52.279.148.35.39.957.423 1.025.033.068.047.169.006.27-.043.101-.066.162-.129.227-.064.065-.133.144-.191.205-.065.068-.13.14-.055.273.076.133.334.686.711 1.026.483.435.889.57 1.017.632.128.062.204.053.28-.035.076-.088.326-.419.414-.564.088-.145.176-.119.303-.075.127.043.803.379.94.448.138.07.23.104.263.162.033.058.033.337-.113.75-.147.413-.865.811-1.187.848-.322.038-.621-.027-1.428-.35-1.012-.405-1.659-1.047-1.898-1.407-.239-.36-1.037-1.373-1.037-2.618 0-1.246.65-1.928.88-2.193.23-.266.496-.347.66-.347z" />
                                    </svg>
                                </a>
                                {/* Instagram */}
                                <a 
                                    href="https://www.instagram.com/picanteriamiraflores/" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:border-transparent transition-all duration-300 group shadow-lg"
                                    title="Instagram"
                                >
                                    <svg className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                                {/* Facebook */}
                                <a 
                                    href="https://www.facebook.com/PicanteriaMiraflores" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-[#1877F2] hover:border-[#1877F2] transition-all duration-300 group shadow-lg"
                                    title="Facebook"
                                >
                                    <svg className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </a>
                            </div>
                        </div>

                        {/* Fast Links */}
                        <div>
                            <h4 className="text-lg font-bold mb-8 text-amber-500 uppercase tracking-widest">Descubrir</h4>
                            <ul className="space-y-4 text-slate-400 font-medium">
                                <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Nuestra Historia
                                </li>
                                <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Platos Estrella
                                </li>
                                <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Reservaciones
                                </li>
                                <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Ubicaciones
                                </li>
                            </ul>
                        </div>

                        {/* Hours */}
                        <div>
                            <h4 className="text-lg font-bold mb-8 text-amber-500 uppercase tracking-widest">Horarios</h4>
                            <div className="space-y-6 text-slate-400">
                                <div>
                                    <p className="text-white font-bold mb-1">Viernes a Domingo</p>
                                    <p className="text-sm font-light">09:00 AM - 09:00 PM</p>
                                </div>
                                <div>
                                    <p className="text-white font-bold mb-1">Lunes a Jueves</p>
                                    <p className="text-sm font-light">Cerrado por preparación</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-lg font-bold mb-8 text-amber-500 uppercase tracking-widest">Contacto</h4>
                            <div className="space-y-6 text-slate-400">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">📍</div>
                                    <p className="text-sm font-light leading-relaxed">{config.address}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">📞</div>
                                    <p className="text-sm font-bold text-white">{config.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-slate-500 text-sm font-light">
                            &copy; {new Date().getFullYear()} {config.name}. Creado con pasión por el sabor.
                        </p>
                        <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-600">
                            <span className="hover:text-slate-400 cursor-pointer">Privacidad</span>
                            <span className="hover:text-slate-400 cursor-pointer">Términos</span>
                            <span className="hover:text-slate-400 cursor-pointer">Soporte</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating WhatsApp Button */}
            <a 
                href="https://wa.me/593967812717" 
                target="_blank" 
                rel="noreferrer"
                className="fixed bottom-8 right-8 z-50 group flex items-center gap-3"
            >
                {/* Tooltip */}
                <span className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block">
                    ¿Hacer un pedido?
                </span>
                {/* Button Icon */}
                <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 relative">
                    <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
                    <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766zm-3.235 3.326c.148-.28.423-.326.697-.309.28.016.398-.01.52.279.148.35.39.957.423 1.025.033.068.047.169.006.27-.043.101-.066.162-.129.227-.064.065-.133.144-.191.205-.065.068-.13.14-.055.273.076.133.334.686.711 1.026.483.435.889.57 1.017.632.128.062.204.053.28-.035.076-.088.326-.419.414-.564.088-.145.176-.119.303-.075.127.043.803.379.94.448.138.07.23.104.263.162.033.058.033.337-.113.75-.147.413-.865.811-1.187.848-.322.038-.621-.027-1.428-.35-1.012-.405-1.659-1.047-1.898-1.407-.239-.36-1.037-1.373-1.037-2.618 0-1.246.65-1.928.88-2.193.23-.266.496-.347.66-.347z" />
                    </svg>
                </div>
            </a>

            {/* Custom Styles for Advanced Effects */}
            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.4; transform: scale(1.1); }
                    50% { opacity: 0.6; transform: scale(1.15); }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }

                .animate-pulse-slow {
                    animation: pulse-slow 8s ease-in-out infinite;
                }

                ::selection {
                    background: #f59e0b;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default MenuPage;
