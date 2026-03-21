import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Card from '../../../../components/ui/Card';

interface BusinessInfoSectionProps {
    businessInfo: {
        name: string;
        slogan: string;
        phone: string;
        email: string;
        address: string;
        website: string;
    };
    onInfoChange: (info: any) => void;
    onSave: (e: React.FormEvent) => void;
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500";

const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({ businessInfo, onInfoChange, onSave }) => {
    const handleDownloadQR = () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `menu-qr-${businessInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Información del Negocio</h2>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Datos principales del restaurante</p>
                        </div>
                    </div>

                    <form onSubmit={onSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre del Restaurante *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={businessInfo.name}
                                    onChange={(e) => onInfoChange({ ...businessInfo, name: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="slogan" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Slogan</label>
                                <input
                                    type="text"
                                    id="slogan"
                                    value={businessInfo.slogan}
                                    onChange={(e) => onInfoChange({ ...businessInfo, slogan: e.target.value })}
                                    className={inputClass}
                                    placeholder="Sabor Tradicional"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Teléfono *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={businessInfo.phone}
                                    onChange={(e) => onInfoChange({ ...businessInfo, phone: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={businessInfo.email}
                                    onChange={(e) => onInfoChange({ ...businessInfo, email: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Dirección *</label>
                                <input
                                    type="text"
                                    id="address"
                                    value={businessInfo.address}
                                    onChange={(e) => onInfoChange({ ...businessInfo, address: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label htmlFor="website" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Sitio Web (Para Menú Digital)</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">https://</div>
                                    <input
                                        type="text"
                                        id="website"
                                        value={businessInfo.website.replace(/^https?:\/\//, '')}
                                        onChange={(e) => onInfoChange({ ...businessInfo, website: 'https://' + e.target.value.replace(/^https?:\/\//, '') })}
                                        className={`${inputClass} pl-16`}
                                        placeholder="mirestaurante.com"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button 
                                type="submit" 
                                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95"
                            >
                                Guardar Información
                            </button>
                        </div>
                    </form>
                </div>
            </Card>

            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Menú Digital QR</h2>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Generado automáticamente</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-6">
                        {businessInfo.website ? (
                            <>
                                <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-dark-700">
                                    <QRCodeCanvas
                                        id="qr-code-canvas"
                                        value={businessInfo.website}
                                        size={220}
                                        level={"H"}
                                        includeMargin={false}
                                    />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Escanea para ver el menú en:</p>
                                    <a href={businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-blue-600 dark:text-blue-400 hover:underline break-all">
                                        {businessInfo.website}
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadQR}
                                    className="flex items-center gap-2 bg-gray-900 dark:bg-dark-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-dark-600 transition-all shadow-xl shadow-black/10 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Descargar Código QR
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-12 px-6 bg-gray-50 dark:bg-dark-800 rounded-3xl border border-dashed border-gray-300 dark:border-dark-700 max-w-sm w-full">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">URL no configurada</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                    Establece la URL de tu sitio web arriba para generar el código QR de tu menú.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BusinessInfoSection;
