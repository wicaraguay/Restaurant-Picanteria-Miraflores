import React, { useRef } from 'react';
import Card from '../../../../components/ui/Card';

interface BrandCustomizationSectionProps {
    logo: string;
    brandColors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    isUploading: boolean;
    onLogoUpload: (file: File) => void;
    onRemoveLogo: () => void;
    onColorsChange: (colors: any) => void;
    onSaveColors: (e: React.FormEvent) => void;
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-[10px] font-black uppercase tracking-widest focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500";

const BrandCustomizationSection: React.FC<BrandCustomizationSectionProps> = ({ 
    logo, 
    brandColors, 
    isUploading, 
    onLogoUpload, 
    onRemoveLogo, 
    onColorsChange, 
    onSaveColors 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onLogoUpload(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Identidad Visual</h2>
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Logo y colores de marca</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Logo Upload */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Logo del Restaurante</label>
                            <div className="flex items-center gap-8">
                                <div className="relative group">
                                    {logo ? (
                                        <div className="relative">
                                            <div className="w-32 h-32 rounded-3xl bg-white border-2 border-gray-100 dark:border-dark-700 shadow-xl flex items-center justify-center p-4 overflow-hidden">
                                                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={onRemoveLogo}
                                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-2xl w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-90"
                                                title="Eliminar logo"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-300 dark:border-dark-700 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-dark-800">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-[10px] font-black uppercase tracking-tighter">Sin Logo</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 disabled:bg-blue-300"
                                    >
                                        {isUploading ? 'Procesando...' : logo ? 'Cambiar Logo' : 'Subir Imagen'}
                                    </button>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                                        Recomendamos archivos PNG o WEBP transparentes (200x200px o superior).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        <form onSubmit={onSaveColors} className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Esquema de Colores</label>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden shadow-inner flex-shrink-0">
                                        <input
                                            type="color"
                                            value={brandColors.primary}
                                            onChange={(e) => onColorsChange({ ...brandColors, primary: e.target.value })}
                                            className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Primario</p>
                                        <input
                                            type="text"
                                            value={brandColors.primary}
                                            onChange={(e) => onColorsChange({ ...brandColors, primary: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden shadow-inner flex-shrink-0">
                                        <input
                                            type="color"
                                            value={brandColors.secondary}
                                            onChange={(e) => onColorsChange({ ...brandColors, secondary: e.target.value })}
                                            className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Secundario</p>
                                        <input
                                            type="text"
                                            value={brandColors.secondary}
                                            onChange={(e) => onColorsChange({ ...brandColors, secondary: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden shadow-inner flex-shrink-0">
                                        <input
                                            type="color"
                                            value={brandColors.accent}
                                            onChange={(e) => onColorsChange({ ...brandColors, accent: e.target.value })}
                                            className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">Acento</p>
                                        <input
                                            type="text"
                                            value={brandColors.accent}
                                            onChange={(e) => onColorsChange({ ...brandColors, accent: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit" 
                                    className="bg-gray-900 dark:bg-dark-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-dark-600 transition-all shadow-xl shadow-black/10 active:scale-95"
                                >
                                    Guardar Colores
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="p-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Vista Previa - Modo Claro</h3>
                        <div className="p-4 rounded-3xl border border-gray-100 bg-white space-y-3">
                            <div className="h-4 w-24 rounded-full" style={{ backgroundColor: brandColors.primary }}></div>
                            <div className="h-8 w-full rounded-2xl" style={{ backgroundColor: brandColors.secondary + '20' }}></div>
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded-xl" style={{ backgroundColor: brandColors.accent }}></div>
                                <div className="h-6 w-16 rounded-xl border border-gray-200"></div>
                            </div>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Vista Previa - Modo Oscuro</h3>
                        <div className="p-4 rounded-3xl border border-dark-700 bg-dark-900 space-y-3">
                            <div className="h-4 w-24 rounded-full" style={{ backgroundColor: brandColors.primary }}></div>
                            <div className="h-8 w-full rounded-2xl" style={{ backgroundColor: brandColors.secondary + '40' }}></div>
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded-xl" style={{ backgroundColor: brandColors.accent }}></div>
                                <div className="h-6 w-16 rounded-xl border border-dark-700"></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default BrandCustomizationSection;
