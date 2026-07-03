/**
 * Página Pública del Menú - Diseño Animado y Acogedor
 *
 * Estilo cálido, hogareño y tradicional para picantería ecuatoriana.
 * Colores naranja vibrante (del logo), tipografía amigable y animada.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { menuService } from '../modules/menu/services/MenuService';
import { MenuItem } from '../modules/menu/types/menu.types';
import { Category } from '../modules/categories/types/category.types';
import { api } from '../api';
import { logger } from '../utils/logger';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { defaultWebsiteConfig } from '../utils/defaultConfig';

const MenuPage: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const { config, refreshConfig } = useRestaurantConfig();

    // Configuración del sitio web desde el CMS o valores por defecto
    // Deep merge para asegurar que todos los campos existan
    const websiteConfig = useMemo(() => {
        const base = defaultWebsiteConfig;
        const current = config.website;
        if (!current) return base;
        return {
            hero: {
                ...base.hero,
                ...current.hero,
                slides: current.hero?.slides?.length > 0 ? current.hero.slides : base.hero.slides,
            },
            footer: {
                ...base.footer,
                ...current.footer,
                schedules: current.footer?.schedules?.length > 0 ? current.footer.schedules : base.footer.schedules,
                socialLinks: current.footer?.socialLinks?.length > 0 ? current.footer.socialLinks : base.footer.socialLinks,
            },
            theme: {
                colors: { ...base.theme.colors, ...current.theme?.colors },
                fonts: { ...base.theme.fonts, ...current.theme?.fonts },
            },
            sections: { ...base.sections, ...current.sections },
        };
    }, [config.website]);
    const { hero, footer, theme } = websiteConfig;

    // Slides del carrusel desde config (con fallback seguro)
    const carouselSlides = useMemo(() => {
        const slides = hero.slides || defaultWebsiteConfig.hero.slides;
        return slides.map(slide => ({
            url: slide.imageUrl,
            title: slide.title,
            subtitle: slide.subtitle
        }));
    }, [hero.slides]);

    // URL de WhatsApp desde config
    const whatsappUrl = useMemo(() => {
        const links = footer.socialLinks || [];
        const whatsappLink = links.find(link => link.platform === 'whatsapp');
        return whatsappLink?.url || 'https://wa.me/593967812717';
    }, [footer.socialLinks]);

    const checkBusinessStatus = () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const isWeekEnd = day === 0 || day === 5 || day === 6;
        const isWorkingHours = hour >= 9 && hour < 21;
        setIsOpen(isWeekEnd && isWorkingHours);
    };

    const fetchMenu = async () => {
        try {
            logger.info('Fetching menu for public page');

            // Fetch categories and menu items in parallel
            const [categoriesResponse, items] = await Promise.all([
                api.categories.getAll(),
                menuService.getAll()
            ]);

            // Build a set of visible category IDs
            const visibleCategories = categoriesResponse.filter(
                (cat: Category) => cat.visibleOnWebsite && cat.available
            );
            const visibleCategoryIds = new Set(visibleCategories.map((cat: Category) => cat.id));
            const visibleCategoryNames = new Set(
                visibleCategories.map((cat: Category) => cat.name.toLowerCase())
            );

            setCategories(visibleCategories);

            // Filter items: available + category is visible on website
            const filteredItems = items.filter(item => {
                if (!item.available) return false;

                // If item has categoryId, check if it's in visible categories
                if (item.categoryId) {
                    return visibleCategoryIds.has(item.categoryId);
                }

                // Legacy fallback: check by category name (text)
                // This handles items that haven't been migrated yet
                const categoryName = item.category?.toLowerCase() || '';
                return visibleCategoryNames.has(categoryName);
            });

            // Sort by category sortOrder, then by name
            const sortedItems = filteredItems.sort((a, b) => {
                const catA = visibleCategories.find(
                    (c: Category) => c.id === a.categoryId || c.name.toLowerCase() === a.category?.toLowerCase()
                );
                const catB = visibleCategories.find(
                    (c: Category) => c.id === b.categoryId || c.name.toLowerCase() === b.category?.toLowerCase()
                );
                const orderA = catA?.sortOrder ?? 999;
                const orderB = catB?.sortOrder ?? 999;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });

            setMenuItems(sortedItems);
            setLoading(false);
        } catch (error) {
            logger.error('Failed to fetch menu', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
        checkBusinessStatus();

        // Polling para menú - cada 30 segundos (antes era 3s, causaba rate limit)
        const menuInterval = setInterval(() => {
            fetchMenu();
            checkBusinessStatus();
        }, 30000);

        // Polling para configuración del sitio web (CMS) - cada 30 segundos
        // Permite ver cambios del admin sin recargar la página
        const configInterval = setInterval(() => {
            refreshConfig();
        }, 30000);

        // Solo autoplay si está habilitado
        const slideInterval = hero.autoplay !== false ? setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % carouselSlides.length);
        }, hero.interval || 6000) : null;

        // Refrescar al volver a la pestaña (más útil que polling agresivo)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchMenu();
                checkBusinessStatus();
                refreshConfig();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(menuInterval);
            clearInterval(configInterval);
            if (slideInterval) clearInterval(slideInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [carouselSlides.length, hero.autoplay, hero.interval, refreshConfig]);

    const handleOrder = (item: MenuItem) => {
        const message = `Hola *${config.name}*, quisiera ordenar:%0A%0A` +
            `🍽️ *${item.name}* - $${item.price.toFixed(2)}%0A` +
            `📝 ${item.description || ''}%0A%0A`;
        // Agregar mensaje al URL de WhatsApp
        const orderUrl = whatsappUrl.includes('?')
            ? `${whatsappUrl}&text=${message}`
            : `${whatsappUrl}?text=${message}`;
        window.open(orderUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)' }}>
                <div className="text-center">
                    <div className="relative">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: '#FFF8E1' }}></div>
                    </div>
                    <p className="mt-6 text-2xl" style={{ color: '#FFF8E1', fontFamily: 'Fredoka, sans-serif', fontWeight: 500 }}>
                        Preparando la mesa...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FFF8E1', fontFamily: 'Nunito, sans-serif' }}>

            {/* Hero Section con estilo animado y cálido */}
            <header className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden">
                {/* Background Images */}
                <div className="absolute inset-0 z-0">
                    {carouselSlides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img
                                src={slide.url}
                                alt={`Slide ${index}`}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    {/* Overlay oscuro sutil para legibilidad */}
                    <div className="absolute inset-0 z-10" style={{
                        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.5) 100%)'
                    }}></div>
                    {/* Textura sutil */}
                    <div className="absolute inset-0 z-10 opacity-10" style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.15"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                    }}></div>
                </div>

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-6 z-30 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: '#FFF8E1', border: '3px solid #FFB74D' }}>
                            {config.logo ? (
                                <img src={config.logo} alt={config.name} className="w-full h-full object-contain p-1" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ fontFamily: 'Fredoka, sans-serif', color: '#E65100', fontWeight: 600 }}>
                                    PM
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: 'Fredoka, sans-serif', color: '#FFF8E1' }}>
                                {config.name}
                            </h2>
                            <p className="text-sm tracking-wider" style={{ color: '#FFE0B2', fontFamily: 'Nunito, sans-serif' }}>
                                {config.slogan || 'Sabor Tradicional'}
                            </p>
                        </div>
                    </div>

                    {/* Estado abierto/cerrado */}
                    <div
                        className="px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-3 shadow-lg"
                        style={{
                            backgroundColor: isOpen ? 'rgba(76, 175, 80, 0.25)' : 'rgba(198, 40, 40, 0.25)',
                            color: isOpen ? '#C8E6C9' : '#FFCDD2',
                            border: `2px solid ${isOpen ? '#66BB6A' : '#EF5350'}`,
                            backdropFilter: 'blur(8px)',
                            fontFamily: 'Fredoka, sans-serif'
                        }}
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#66BB6A' }}></span>}
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: isOpen ? '#66BB6A' : '#EF5350' }}></span>
                        </span>
                        <span>{isOpen ? 'Abierto' : 'Cerrado'}</span>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="container mx-auto px-6 relative z-20 text-center">
                    <div key={currentSlide} className="animate-fade-in">
                        {/* Badge */}
                        <span
                            className="inline-block px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 shadow-lg"
                            style={{
                                backgroundColor: 'rgba(255, 183, 77, 0.3)',
                                color: theme.colors.background,
                                border: '2px solid rgba(255, 224, 178, 0.4)',
                                fontFamily: theme.fonts?.heading || 'Fredoka, sans-serif'
                            }}
                        >
                            {hero.badge || '🍲 Tradición desde el 2000 🍲'}
                        </span>

                        {/* Título principal */}
                        <h1
                            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
                            style={{ fontFamily: 'Fredoka, sans-serif', color: '#FFF8E1', textShadow: '3px 4px 8px rgba(0,0,0,0.25)' }}
                        >
                            {(carouselSlides[currentSlide]?.title || 'Bienvenidos').split(' ')[0]}
                            <br />
                            <span style={{ color: '#FFE0B2' }}>
                                {(carouselSlides[currentSlide]?.title || '').split(' ').slice(1).join(' ')}
                            </span>
                        </h1>

                        {/* Subtítulo */}
                        <p
                            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
                            style={{ color: '#FFE0B2', fontWeight: 400, fontFamily: 'Nunito, sans-serif' }}
                        >
                            {carouselSlides[currentSlide]?.subtitle || 'El mejor sabor de nuestra tierra'}
                        </p>

                        {/* Botón CTA */}
                        <button
                            onClick={() => document.getElementById('menu-items')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-10 py-4 font-bold text-lg rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105 active:scale-95"
                            style={{
                                backgroundColor: theme.colors.background,
                                color: theme.colors.primary,
                                border: `3px solid ${theme.colors.accent}`,
                                fontFamily: theme.fonts?.heading || 'Fredoka, sans-serif'
                            }}
                        >
                            {hero.ctaText || 'Ver Nuestra Carta 🍽️'}
                        </button>
                    </div>

                    {/* Indicadores del carrusel */}
                    <div className="flex justify-center gap-3 mt-12">
                        {carouselSlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className="w-3 h-3 rounded-full transition-all duration-300"
                                style={{
                                    backgroundColor: index === currentSlide ? '#FFF8E1' : 'rgba(255, 248, 225, 0.3)',
                                    transform: index === currentSlide ? 'scale(1.4)' : 'scale(1)'
                                }}
                            />
                        ))}
                    </div>
                </div>

            </header>

            {/* Sección del Menú */}
            <main id="menu-items" className="container mx-auto px-6 py-20">
                {/* Encabezado de sección */}
                <div className="text-center mb-16">
                    <span
                        className="inline-block text-sm font-bold tracking-widest uppercase mb-4"
                        style={{ color: '#F57C00', fontFamily: 'Fredoka, sans-serif' }}
                    >
                        — Nuestra Carta —
                    </span>
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-6"
                        style={{ fontFamily: 'Fredoka, sans-serif', color: '#E65100' }}
                    >
                        Platos de la Casa
                    </h2>
                    <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5D4037', fontFamily: 'Nunito, sans-serif' }}>
                        Recetas tradicionales preparadas con ingredientes frescos y el amor de nuestra familia.
                    </p>

                </div>

                {/* Contador de platos */}
                <div className="flex justify-center mb-12">
                    <div
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-full shadow-md"
                        style={{ backgroundColor: '#FFE0B2', border: '2px solid #FFB74D', fontFamily: 'Fredoka, sans-serif' }}
                    >
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#F57C00' }}></span>
                        <span className="font-semibold" style={{ color: '#E65100' }}>
                            {menuItems.length} Platos Disponibles
                        </span>
                    </div>
                </div>

                {/* Grid de platos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {menuItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="group rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #FFE0B2',
                                animationDelay: `${index * 0.1}s`
                            }}
                        >
                            {/* Imagen del plato */}
                            <div className="relative h-56 overflow-hidden">
                                <img
                                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                                {/* Etiqueta de categoría */}
                                <span
                                    className="absolute top-4 left-4 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg"
                                    style={{ backgroundColor: '#FFF8E1', color: '#E65100', border: '2px solid #FFB74D', fontFamily: 'Fredoka, sans-serif' }}
                                >
                                    {item.category}
                                </span>

                                {/* Precio */}
                                <div
                                    className="absolute top-4 right-4 w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg"
                                    style={{ backgroundColor: '#F57C00', color: '#FFF8E1', fontFamily: 'Fredoka, sans-serif' }}
                                >
                                    ${item.price.toFixed(0)}
                                </div>
                            </div>

                            {/* Contenido */}
                            <div className="p-6">
                                <h3
                                    className="text-xl font-bold mb-3 transition-colors duration-300"
                                    style={{ fontFamily: 'Fredoka, sans-serif', color: '#E65100' }}
                                >
                                    {item.name}
                                </h3>
                                <p
                                    className="text-sm leading-relaxed mb-6 line-clamp-2 min-h-[2.5rem]"
                                    style={{ color: '#5D4037', fontFamily: 'Nunito, sans-serif' }}
                                >
                                    {item.description}
                                </p>

                                {/* Botón de ordenar */}
                                <button
                                    onClick={() => handleOrder(item)}
                                    className="w-full py-4 rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-lg active:scale-95 hover:scale-105"
                                    style={{
                                        backgroundColor: '#F57C00',
                                        color: '#FFF8E1',
                                        border: '2px solid #FFB74D',
                                        fontFamily: 'Fredoka, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#E65100';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F57C00';
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766zm-3.235 3.326c.148-.28.423-.326.697-.309.28.016.398-.01.52.279.148.35.39.957.423 1.025.033.068.047.169.006.27-.043.101-.066.162-.129.227-.064.065-.133.144-.191.205-.065.068-.13.14-.055.273.076.133.334.686.711 1.026.483.435.889.57 1.017.632.128.062.204.053.28-.035.076-.088.326-.419.414-.564.088-.145.176-.119.303-.075.127.043.803.379.94.448.138.07.23.104.263.162.033.058.033.337-.113.75-.147.413-.865.811-1.187.848-.322.038-.621-.027-1.428-.35-1.012-.405-1.659-1.047-1.898-1.407-.239-.36-1.037-1.373-1.037-2.618 0-1.246.65-1.928.88-2.193.23-.266.496-.347.66-.347z" />
                                    </svg>
                                    Ordenar por WhatsApp
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Estado vacío */}
                {menuItems.length === 0 && !loading && (
                    <div className="text-center py-32">
                        <div className="text-8xl mb-8">🍳</div>
                        <h3
                            className="text-3xl font-bold mb-4"
                            style={{ fontFamily: 'Fredoka, sans-serif', color: '#E65100' }}
                        >
                            Cocina en Preparación
                        </h3>
                        <p className="text-lg" style={{ color: '#5D4037', fontFamily: 'Nunito, sans-serif' }}>
                            Estamos preparando nuevos platos. ¡Vuelve pronto!
                        </p>
                    </div>
                )}
            </main>

            {/* Footer cálido y animado */}
            <footer className="relative pt-20 pb-12 overflow-hidden" style={{ backgroundColor: '#E65100' }}>
                {/* Borde superior decorativo */}
                <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'linear-gradient(90deg, #FFB74D 0%, #FFF8E1 50%, #FFB74D 100%)' }}></div>

                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        {/* Logo y descripción */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="flex items-center space-x-4">
                                <div
                                    className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center"
                                    style={{ backgroundColor: '#FFF8E1', border: '3px solid #FFB74D' }}
                                >
                                    {config.logo ? (
                                        <img src={config.logo} alt={config.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span style={{ fontFamily: 'Fredoka, sans-serif', color: '#E65100', fontWeight: 600, fontSize: '1.25rem' }}>PM</span>
                                    )}
                                </div>
                                <h3
                                    className="text-2xl font-bold"
                                    style={{ fontFamily: 'Fredoka, sans-serif', color: '#FFF8E1' }}
                                >
                                    {config.name}
                                </h3>
                            </div>
                            <p className="leading-relaxed" style={{ color: '#FFE0B2', fontFamily: theme.fonts?.body || 'Nunito, sans-serif' }}>
                                {footer.aboutText || 'Tradición familiar desde el 2000. Preparamos cada plato con amor y los mejores ingredientes de nuestra tierra. 🍲'}
                            </p>

                            {/* Redes sociales */}
                            <div className="flex space-x-3">
                                {footer.socialLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                        style={{ backgroundColor: theme.colors.secondary, border: `2px solid ${theme.colors.accent}` }}
                                    >
                                        {link.platform === 'whatsapp' && (
                                            <svg className="w-5 h-5" fill={theme.colors.background} viewBox="0 0 24 24">
                                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766z" />
                                            </svg>
                                        )}
                                        {link.platform === 'instagram' && (
                                            <svg className="w-5 h-5" fill={theme.colors.background} viewBox="0 0 24 24">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                            </svg>
                                        )}
                                        {link.platform === 'facebook' && (
                                            <svg className="w-5 h-5" fill={theme.colors.background} viewBox="0 0 24 24">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                        )}
                                        {link.platform === 'twitter' && (
                                            <svg className="w-5 h-5" fill={theme.colors.background} viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                            </svg>
                                        )}
                                        {link.platform === 'tiktok' && (
                                            <svg className="w-5 h-5" fill={theme.colors.background} viewBox="0 0 24 24">
                                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                            </svg>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Enlaces rápidos */}
                        <div>
                            <h4
                                className="text-lg font-bold mb-6 uppercase tracking-wider"
                                style={{ color: '#FFB74D', fontFamily: 'Fredoka, sans-serif' }}
                            >
                                Descubrir
                            </h4>
                            <ul className="space-y-3" style={{ color: '#FFE0B2', fontFamily: 'Nunito, sans-serif' }}>
                                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                                    <span style={{ color: '#FFB74D' }}>🍴</span> Nuestra Historia
                                </li>
                                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                                    <span style={{ color: '#FFB74D' }}>⭐</span> Platos Estrella
                                </li>
                                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                                    <span style={{ color: '#FFB74D' }}>📅</span> Reservaciones
                                </li>
                            </ul>
                        </div>

                        {/* Horarios */}
                        <div>
                            <h4
                                className="text-lg font-bold mb-6 uppercase tracking-wider"
                                style={{ color: theme.colors.accent, fontFamily: theme.fonts?.heading || 'Fredoka, sans-serif' }}
                            >
                                Horarios
                            </h4>
                            <div className="space-y-4">
                                {footer.schedules.map((schedule, index) => (
                                    <div key={index}>
                                        <p className="font-bold mb-1" style={{ color: theme.colors.background, fontFamily: theme.fonts?.heading || 'Fredoka, sans-serif' }}>
                                            {schedule.days}
                                        </p>
                                        <p className="text-sm" style={{ color: '#FFE0B2', fontFamily: theme.fonts?.body || 'Nunito, sans-serif' }}>
                                            {schedule.isClosed ? 'Cerrado' : schedule.hours}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contacto */}
                        <div>
                            <h4
                                className="text-lg font-bold mb-6 uppercase tracking-wider"
                                style={{ color: '#FFB74D', fontFamily: 'Fredoka, sans-serif' }}
                            >
                                Contacto
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">📍</span>
                                    <p className="text-sm" style={{ color: '#FFE0B2', fontFamily: 'Nunito, sans-serif' }}>{config.address}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📞</span>
                                    <p className="font-bold" style={{ color: '#FFF8E1', fontFamily: 'Fredoka, sans-serif' }}>{config.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div
                        className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
                        style={{ borderTop: '2px solid #F57C00' }}
                    >
                        <p className="text-sm" style={{ color: '#FFE0B2', fontFamily: 'Nunito, sans-serif' }}>
                            &copy; {new Date().getFullYear()} {config.name}. Hecho con ❤️ y sazón.
                        </p>
                        <p className="text-sm" style={{ color: '#FFE0B2', fontFamily: 'Nunito, sans-serif' }}>
                            Desarrollado por{' '}
                            <a
                                href="https://willytech.dev/"
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold hover:text-white transition-colors"
                                style={{ color: '#FFB74D', fontFamily: 'Fredoka, sans-serif' }}
                            >
                                WillyTech
                            </a>
                        </p>
                        <div className="flex gap-6 text-xs font-bold uppercase tracking-wider" style={{ color: '#FFB74D', fontFamily: 'Fredoka, sans-serif' }}>
                            <span className="hover:text-white cursor-pointer transition-colors">Privacidad</span>
                            <span className="hover:text-white cursor-pointer transition-colors">Términos</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Botón flotante de WhatsApp */}
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="fixed bottom-8 right-8 z-50 group flex items-center gap-3"
            >
                <span
                    className="px-5 py-3 rounded-full text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block"
                    style={{ backgroundColor: theme.colors.background, color: theme.colors.primary, fontFamily: theme.fonts?.heading || 'Fredoka, sans-serif' }}
                >
                    ¿Hacer un pedido? 🍽️
                </span>
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative"
                    style={{ backgroundColor: '#25D366' }}
                >
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#25D366' }}></div>
                    <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.654-.698c.991.56 2.151.761 3.238.74h.013c.092-.001.185-.005.277-.013 2.924-.265 5.09-2.736 5.09-5.65 0-3.18-2.585-5.766-5.766-5.766zm-3.235 3.326c.148-.28.423-.326.697-.309.28.016.398-.01.52.279.148.35.39.957.423 1.025.033.068.047.169.006.27-.043.101-.066.162-.129.227-.064.065-.133.144-.191.205-.065.068-.13.14-.055.273.076.133.334.686.711 1.026.483.435.889.57 1.017.632.128.062.204.053.28-.035.076-.088.326-.419.414-.564.088-.145.176-.119.303-.075.127.043.803.379.94.448.138.07.23.104.263.162.033.058.033.337-.113.75-.147.413-.865.811-1.187.848-.322.038-.621-.027-1.428-.35-1.012-.405-1.659-1.047-1.898-1.407-.239-.36-1.037-1.373-1.037-2.618 0-1.246.65-1.928.88-2.193.23-.266.496-.347.66-.347z" />
                    </svg>
                </div>
            </a>

            {/* Estilos personalizados */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.8s ease-out both;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                ::selection {
                    background: #F57C00;
                    color: #FFF8E1;
                }
            `}</style>
        </div>
    );
};

export default MenuPage;
