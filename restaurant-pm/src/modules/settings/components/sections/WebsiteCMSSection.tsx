/**
 * @file WebsiteCMSSection.tsx
 * @description CMS del sitio web público, optimizado para manejarse desde el
 * celular (PWA): navegación por pestañas (Carrusel | Footer | Tema) en vez de
 * tres tarjetas apiladas, UN solo botón de guardar fijo abajo (los tres
 * formularios anteriores guardaban el MISMO objeto completo) que se activa
 * únicamente cuando hay cambios, y filas que se apilan en pantallas pequeñas.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Card from '../../../../components/ui/Card';
import { WebsiteConfig, HeroSlide, Schedule, SocialLink } from '../../../../types';
import { uploadToCloudinary } from '../../../../utils/cloudinary';
import { toast } from '../../../../components/ui/AlertProvider';

interface WebsiteCMSSectionProps {
    websiteConfig: WebsiteConfig;
    onSave: (config: Partial<WebsiteConfig>) => Promise<void>;
    isSaving: boolean;
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-[10px] font-black uppercase tracking-widest focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500";

const textareaClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-[10px] font-bold tracking-wide focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500 min-h-[100px] resize-none";

type CMSTab = 'hero' | 'footer' | 'theme';

const TABS: { key: CMSTab; label: string; emoji: string }[] = [
    { key: 'hero', label: 'Carrusel', emoji: '🖼️' },
    { key: 'footer', label: 'Footer', emoji: '🕒' },
    { key: 'theme', label: 'Tema', emoji: '🎨' },
];

const WebsiteCMSSection: React.FC<WebsiteCMSSectionProps> = ({
    websiteConfig,
    onSave,
    isSaving
}) => {
    const [activeTab, setActiveTab] = useState<CMSTab>('hero');
    const [hero, setHero] = useState(websiteConfig.hero);
    const [footer, setFooter] = useState(websiteConfig.footer);
    const [theme, setTheme] = useState(websiteConfig.theme);
    const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // Sincronizar estado local cuando la config del backend cambie
    useEffect(() => {
        setHero(websiteConfig.hero);
        setFooter(websiteConfig.footer);
        setTheme(websiteConfig.theme);
    }, [JSON.stringify(websiteConfig)]);

    // Hay cambios sin guardar en CUALQUIER pestaña
    const isDirty = useMemo(() =>
        JSON.stringify({ hero, footer, theme }) !== JSON.stringify({
            hero: websiteConfig.hero,
            footer: websiteConfig.footer,
            theme: websiteConfig.theme
        }),
        [hero, footer, theme, websiteConfig]
    );

    const handleSaveAll = async () => {
        await onSave({ hero, footer, theme });
    };

    const handleImageUpload = async (slideId: string, file: File) => {
        setUploadingSlideId(slideId);
        try {
            const imageUrl = await uploadToCloudinary(file);
            if (imageUrl) {
                handleUpdateSlide(slideId, { imageUrl });
                toast.success('Imagen subida correctamente', 'Éxito');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al subir imagen', 'Error');
        } finally {
            setUploadingSlideId(null);
        }
    };

    const handleAddSlide = () => {
        const newSlide: HeroSlide = {
            id: Date.now().toString(),
            imageUrl: '',
            title: '',
            subtitle: ''
        };
        setHero({ ...hero, slides: [...hero.slides, newSlide] });
    };

    const handleRemoveSlide = (id: string) => {
        setHero({ ...hero, slides: hero.slides.filter(slide => slide.id !== id) });
    };

    const handleUpdateSlide = (id: string, updates: Partial<HeroSlide>) => {
        setHero({
            ...hero,
            slides: hero.slides.map(slide =>
                slide.id === id ? { ...slide, ...updates } : slide
            )
        });
    };

    const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
        const newSlides = [...hero.slides];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSlides.length) return;
        [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
        setHero({ ...hero, slides: newSlides });
    };

    const handleAddSchedule = () => {
        const newSchedule: Schedule = {
            days: '',
            hours: '',
            isClosed: false
        };
        setFooter({ ...footer, schedules: [...footer.schedules, newSchedule] });
    };

    const handleRemoveSchedule = (index: number) => {
        setFooter({
            ...footer,
            schedules: footer.schedules.filter((_, i) => i !== index)
        });
    };

    const handleUpdateSchedule = (index: number, updates: Partial<Schedule>) => {
        setFooter({
            ...footer,
            schedules: footer.schedules.map((schedule, i) =>
                i === index ? { ...schedule, ...updates } : schedule
            )
        });
    };

    const handleAddSocialLink = () => {
        const newLink: SocialLink = {
            platform: 'instagram',
            url: ''
        };
        setFooter({ ...footer, socialLinks: [...footer.socialLinks, newLink] });
    };

    const handleRemoveSocialLink = (index: number) => {
        setFooter({
            ...footer,
            socialLinks: footer.socialLinks.filter((_, i) => i !== index)
        });
    };

    const handleUpdateSocialLink = (index: number, updates: Partial<SocialLink>) => {
        setFooter({
            ...footer,
            socialLinks: footer.socialLinks.map((link, i) =>
                i === index ? { ...link, ...updates } : link
            )
        });
    };

    const triggerFileInput = (slideId: string) => {
        fileInputRefs.current[slideId]?.click();
    };

    const trashIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Pestañas: una sección a la vez — clave para el celular */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-10 bg-white dark:bg-dark-900 py-2">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.key
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'}`}
                    >
                        <span>{tab.emoji}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* ==================== PESTAÑA: CARRUSEL ==================== */}
            {activeTab === 'hero' && (
                <Card>
                    <div className="p-4 md:p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Carrusel Hero</h2>
                            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Imágenes destacadas del inicio</p>
                        </div>

                        {/* Badge and CTA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Texto del Badge</label>
                                <input
                                    type="text"
                                    value={hero.badge || ''}
                                    onChange={(e) => setHero({ ...hero, badge: e.target.value })}
                                    placeholder="🍲 Tradición desde el 2000 🍲"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Texto del Botón CTA</label>
                                <input
                                    type="text"
                                    value={hero.ctaText || ''}
                                    onChange={(e) => setHero({ ...hero, ctaText: e.target.value })}
                                    placeholder="Ver Menú"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Autoplay Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50/50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                                <input
                                    type="checkbox"
                                    id="autoplay"
                                    checked={hero.autoplay}
                                    onChange={(e) => setHero({ ...hero, autoplay: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="autoplay" className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                                    Reproducción Automática
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                                    Cambio cada {((hero.interval || 5000) / 1000).toFixed(1)} segundos
                                </label>
                                <input
                                    type="range"
                                    min="2000"
                                    max="10000"
                                    step="500"
                                    value={hero.interval || 5000}
                                    onChange={(e) => setHero({ ...hero, interval: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-700"
                                />
                            </div>
                        </div>

                        {/* Slides List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Slides del Carrusel</label>
                                <button
                                    type="button"
                                    onClick={handleAddSlide}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                                >
                                    + Agregar
                                </button>
                            </div>

                            {hero.slides.map((slide, index) => (
                                <div key={slide.id} className="p-4 rounded-2xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                            Slide {index + 1}
                                        </span>
                                        <div className="flex gap-2">
                                            {index > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveSlide(index, 'up')}
                                                    className="p-2.5 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-all"
                                                    title="Mover arriba"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </button>
                                            )}
                                            {index < hero.slides.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveSlide(index, 'down')}
                                                    className="p-2.5 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-all"
                                                    title="Mover abajo"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSlide(slide.id)}
                                                className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                                                title="Eliminar slide"
                                            >
                                                {trashIcon}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Image Preview */}
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Imagen</label>
                                            <div className="relative group">
                                                {uploadingSlideId === slide.id ? (
                                                    <div className="aspect-video rounded-xl border border-purple-300 dark:border-purple-700 flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-900/20">
                                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600 mb-2"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Subiendo...</span>
                                                    </div>
                                                ) : slide.imageUrl ? (
                                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700">
                                                        <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                                                        {/* Botón siempre visible: en el celular no existe hover */}
                                                        <button
                                                            type="button"
                                                            onClick={() => triggerFileInput(slide.id)}
                                                            className="absolute bottom-2 right-2 bg-white/90 text-gray-900 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95"
                                                        >
                                                            Cambiar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => triggerFileInput(slide.id)}
                                                        className="aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-700 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-all bg-gray-50/50 dark:bg-dark-800"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subir Imagen</span>
                                                    </div>
                                                )}
                                                <input
                                                    ref={(el) => fileInputRefs.current[slide.id] = el}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleImageUpload(slide.id, file);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Text Inputs */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                                                <input
                                                    type="text"
                                                    value={slide.title}
                                                    onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                                                    placeholder="Título del slide"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                                                <input
                                                    type="text"
                                                    value={slide.subtitle}
                                                    onChange={(e) => handleUpdateSlide(slide.id, { subtitle: e.target.value })}
                                                    placeholder="Subtítulo del slide"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {hero.slides.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p className="text-[10px] font-black uppercase tracking-widest">No hay slides configurados</p>
                                    <p className="text-[8px] font-bold mt-1">Agrega tu primer slide para comenzar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* ==================== PESTAÑA: FOOTER ==================== */}
            {activeTab === 'footer' && (
                <Card>
                    <div className="p-4 md:p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Contenido del Footer</h2>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Información de contacto y horarios</p>
                        </div>

                        {/* About Text */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Descripción del Restaurante</label>
                            <textarea
                                value={footer.aboutText || ''}
                                onChange={(e) => setFooter({ ...footer, aboutText: e.target.value })}
                                placeholder="Escribe una breve descripción sobre tu restaurante..."
                                className={textareaClass}
                            />
                        </div>

                        {/* Schedules */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Horarios de Atención</label>
                                <button
                                    type="button"
                                    onClick={handleAddSchedule}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                                >
                                    + Agregar
                                </button>
                            </div>

                            {footer.schedules.map((schedule, index) => (
                                <div key={index} className="p-3 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row gap-3 sm:items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Días</label>
                                        <input
                                            type="text"
                                            value={schedule.days}
                                            onChange={(e) => handleUpdateSchedule(index, { days: e.target.value })}
                                            placeholder="Ej: Lunes a Viernes"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Horario</label>
                                        <input
                                            type="text"
                                            value={schedule.hours}
                                            onChange={(e) => handleUpdateSchedule(index, { hours: e.target.value })}
                                            placeholder="Ej: 09:00 AM - 05:00 PM"
                                            className={inputClass}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSchedule(index)}
                                        className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all shrink-0 self-end"
                                        title="Eliminar horario"
                                    >
                                        {trashIcon}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Social Links */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Redes Sociales</label>
                                <button
                                    type="button"
                                    onClick={handleAddSocialLink}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                                >
                                    + Agregar
                                </button>
                            </div>

                            {footer.socialLinks.map((link, index) => (
                                <div key={index} className="p-3 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row gap-3 sm:items-end">
                                    <div className="w-full sm:w-1/3 space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Plataforma</label>
                                        <select
                                            value={link.platform}
                                            onChange={(e) => handleUpdateSocialLink(index, { platform: e.target.value as SocialLink['platform'] })}
                                            className={inputClass}
                                        >
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="facebook">Facebook</option>
                                            <option value="twitter">Twitter</option>
                                            <option value="tiktok">TikTok</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">URL</label>
                                        <input
                                            type="url"
                                            inputMode="url"
                                            value={link.url}
                                            onChange={(e) => handleUpdateSocialLink(index, { url: e.target.value })}
                                            placeholder="https://..."
                                            className={inputClass}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSocialLink(index)}
                                        className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all shrink-0 self-end"
                                        title="Eliminar red social"
                                    >
                                        {trashIcon}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* ==================== PESTAÑA: TEMA ==================== */}
            {activeTab === 'theme' && (
                <Card>
                    <div className="p-4 md:p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Tema del Sitio Web</h2>
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Colores personalizados</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Color Pickers */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Paleta de Colores</label>

                                {([
                                    { key: 'primary', label: 'Primario', labelColor: 'text-blue-600 dark:text-blue-400' },
                                    { key: 'secondary', label: 'Secundario', labelColor: 'text-orange-600 dark:text-orange-400' },
                                    { key: 'accent', label: 'Acento', labelColor: 'text-green-600 dark:text-green-400' },
                                    { key: 'background', label: 'Fondo', labelColor: 'text-gray-600 dark:text-gray-400' },
                                    { key: 'text', label: 'Texto', labelColor: 'text-gray-600 dark:text-gray-400' },
                                ] as const).map(({ key, label, labelColor }) => (
                                    <div key={key} className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden shadow-inner flex-shrink-0">
                                            <input
                                                type="color"
                                                value={theme.colors[key]}
                                                onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                                                className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${labelColor}`}>{label}</p>
                                            <input
                                                type="text"
                                                value={theme.colors[key]}
                                                onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Live Preview */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Vista Previa</label>
                                <div
                                    className="p-8 rounded-3xl border-2 border-gray-200 dark:border-dark-700 space-y-6"
                                    style={{ backgroundColor: theme.colors.background }}
                                >
                                    <div className="space-y-3">
                                        <div
                                            className="h-8 rounded-2xl font-black text-center flex items-center justify-center text-white text-sm"
                                            style={{ backgroundColor: theme.colors.primary }}
                                        >
                                            Primario
                                        </div>
                                        <div
                                            className="h-8 rounded-2xl font-black text-center flex items-center justify-center text-white text-sm"
                                            style={{ backgroundColor: theme.colors.secondary }}
                                        >
                                            Secundario
                                        </div>
                                        <div
                                            className="h-8 rounded-2xl font-black text-center flex items-center justify-center text-white text-sm"
                                            style={{ backgroundColor: theme.colors.accent }}
                                        >
                                            Acento
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p
                                            className="text-sm font-bold"
                                            style={{ color: theme.colors.text }}
                                        >
                                            Texto de ejemplo
                                        </p>
                                        <div className="flex gap-2">
                                            <div
                                                className="flex-1 h-4 rounded-lg opacity-50"
                                                style={{ backgroundColor: theme.colors.primary }}
                                            />
                                            <div
                                                className="flex-1 h-4 rounded-lg opacity-50"
                                                style={{ backgroundColor: theme.colors.secondary }}
                                            />
                                            <div
                                                className="flex-1 h-4 rounded-lg opacity-50"
                                                style={{ backgroundColor: theme.colors.accent }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Barra de guardado fija: UN botón para todo, visible desde cualquier
                pestaña, activo solo cuando hay cambios sin guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/90 dark:bg-dark-900/90 backdrop-blur border-t border-gray-100 dark:border-dark-800 md:sticky md:rounded-2xl md:border md:mx-0">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    {isDirty && (
                        <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Sin guardar
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={isSaving || !isDirty}
                        className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${(isSaving || !isDirty)
                            ? 'bg-gray-200 dark:bg-dark-700 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-500/25'}`}
                    >
                        {isSaving ? 'Guardando…' : isDirty ? 'Guardar Cambios' : 'Todo guardado ✓'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebsiteCMSSection;
