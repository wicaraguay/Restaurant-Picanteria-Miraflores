import React, { useRef } from 'react';
import Card from '../../../../components/ui/Card';

interface BillingSRISectionProps {
    fiscalInfo: {
        ruc: string;
        businessName: string;
        fiscalEmail?: string;
        fiscalLogo?: string;
        fiscalAddress?: string;
        obligadoContabilidad?: boolean;
        contribuyenteEspecial?: string;
    };
    billingConfig: {
        establishment: string;
        emissionPoint: string;
        regime: 'General' | 'RIMPE - Negocio Popular' | 'RIMPE - Emprendedor';
        taxRate?: number;
        currentSequenceFactura: number;
        currentSequenceNotaCredito: number;
        currentSequenceNotaVenta: number;
    };
    isUploading: boolean;
    onFiscalInfoChange: (info: any) => void;
    onBillingConfigChange: (config: any) => void;
    onFiscalLogoUpload: (file: File) => void;
    onRemoveFiscalLogo: () => void;
    onSave: (e: React.FormEvent) => void;
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500";
const monoInputClass = "w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-gray-900 text-sm font-mono tracking-widest text-center focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white";

const BillingSRISection: React.FC<BillingSRISectionProps> = ({ 
    fiscalInfo, 
    billingConfig, 
    isUploading, 
    onFiscalInfoChange, 
    onBillingConfigChange, 
    onFiscalLogoUpload, 
    onRemoveFiscalLogo, 
    onSave 
}) => {
    const fiscalLogoInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFiscalLogoUpload(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Facturación Electrónica</h2>
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Configuración fiscal y SRI</p>
                        </div>
                    </div>

                    <form onSubmit={onSave} className="space-y-8">
                        {/* Información Fiscal Main */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Información del RUC</h3>
                            
                            <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row items-center gap-6">
                                <div className="relative group">
                                    {fiscalInfo.fiscalLogo ? (
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center p-2 overflow-hidden">
                                                <img src={fiscalInfo.fiscalLogo} alt="Fiscal Logo" className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={onRemoveFiscalLogo}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-xl w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-700 flex items-center justify-center text-gray-400">
                                            <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Logo para Facturas</h4>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Si está vacío, se usará el logo principal del negocio.</p>
                                    <input
                                        ref={fiscalLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fiscalLogoInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="mt-3 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                    >
                                        {isUploading ? 'Subiendo...' : fiscalInfo.fiscalLogo ? 'Cambiar Logo Fiscal' : 'Subir Logo Fiscal'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label htmlFor="ruc" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">RUC *</label>
                                    <input
                                        type="text"
                                        id="ruc"
                                        value={fiscalInfo.ruc}
                                        onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, ruc: e.target.value })}
                                        className={inputClass}
                                        required
                                        maxLength={13}
                                        placeholder="0999999999001"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Razón Social *</label>
                                    <input
                                        type="text"
                                        id="businessName"
                                        value={fiscalInfo.businessName}
                                        onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, businessName: e.target.value })}
                                        className={inputClass}
                                        required
                                        placeholder="Nombre Legal Completo"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label htmlFor="fiscalEmail" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Fiscal (Para el SRI)</label>
                                    <input
                                        type="email"
                                        id="fiscalEmail"
                                        value={fiscalInfo.fiscalEmail || ''}
                                        onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, fiscalEmail: e.target.value })}
                                        className={inputClass}
                                        placeholder="ejemplo@sri.com"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label htmlFor="fiscalAddress" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Dirección Fiscal (Aparece en la Factura)</label>
                                    <input
                                        type="text"
                                        id="fiscalAddress"
                                        value={fiscalInfo.fiscalAddress || ''}
                                        onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, fiscalAddress: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej: Av. Eugenio Espejo S/N, Miraflores, Loja"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label htmlFor="contribuyenteEspecial" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nro. de Resolución de Contribuyente Especial</label>
                                    <input
                                        type="text"
                                        id="contribuyenteEspecial"
                                        value={fiscalInfo.contribuyenteEspecial || ''}
                                        onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, contribuyenteEspecial: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej: 5368 (Dejar vacío si no aplica)"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center p-4 bg-gray-50/50 dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 cursor-pointer group transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                id="obligadoContabilidad"
                                                checked={fiscalInfo.obligadoContabilidad || false}
                                                onChange={(e) => onFiscalInfoChange({ ...fiscalInfo, obligadoContabilidad: e.target.checked })}
                                                className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                                            Obligado a llevar contabilidad
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Puntos de Emisión, Régimen e IVA */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Puntos de Emisión, Régimen e IVA</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label htmlFor="establishment" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Establecimiento</label>
                                    <input
                                        type="text"
                                        id="establishment"
                                        value={billingConfig.establishment}
                                        onChange={(e) => onBillingConfigChange({ ...billingConfig, establishment: e.target.value })}
                                        className={monoInputClass}
                                        maxLength={3}
                                        placeholder="001"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="emissionPoint" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Punto de Emisión</label>
                                    <input
                                        type="text"
                                        id="emissionPoint"
                                        value={billingConfig.emissionPoint}
                                        onChange={(e) => onBillingConfigChange({ ...billingConfig, emissionPoint: e.target.value })}
                                        className={monoInputClass}
                                        maxLength={3}
                                        placeholder="001"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="regime" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Régimen Tributario</label>
                                    <select
                                        id="regime"
                                        value={billingConfig.regime}
                                        onChange={(e) => onBillingConfigChange({ ...billingConfig, regime: e.target.value as any })}
                                        className={`${inputClass} appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundSize: '1em' }}
                                    >
                                        <option value="General">General</option>
                                        <option value="RIMPE - Negocio Popular">RIMPE - Negocio Popular</option>
                                        <option value="RIMPE - Emprendedor">RIMPE - Emprendedor</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tarifa IVA — campo crítico con advertencia */}
                            <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400">Tarifa IVA (%)</h4>
                                        <p className="text-[10px] font-bold text-blue-700/70 dark:text-blue-300/60 uppercase tracking-widest mt-1 leading-relaxed">
                                            Cámbialo solo si el SRI decreta un nuevo porcentaje. Afecta todas las facturas y notas de crédito futuras.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-40">
                                        <input
                                            type="number"
                                            id="taxRate"
                                            value={billingConfig.taxRate ?? 15}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val) && val >= 0 && val <= 100) {
                                                    onBillingConfigChange({ ...billingConfig, taxRate: val });
                                                }
                                            }}
                                            className={`${monoInputClass} pr-8`}
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            placeholder="15"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">%</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[0, 5, 8, 12, 15].map(rate => (
                                            <button
                                                key={rate}
                                                type="button"
                                                onClick={() => onBillingConfigChange({ ...billingConfig, taxRate: rate })}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                    (billingConfig.taxRate ?? 15) === rate
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25'
                                                        : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-700 hover:border-blue-400 hover:text-blue-600'
                                                }`}
                                            >
                                                {rate}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secuenciales */}
                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800/30 space-y-6">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-orange-200 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400 flex-shrink-0">
                                    <span className="text-sm font-black">!</span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">Control de Secuenciales (Avanzado)</h4>
                                    <p className="text-[10px] font-bold text-orange-700/70 dark:text-orange-300/60 uppercase tracking-widest mt-1 leading-relaxed">
                                        Modifica estos valores solo si necesitas sincronizar con facturas anteriores. Se emitirá el número ingresado + 1.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label htmlFor="seqFactura" className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Última Factura Emitida</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-[10px] tracking-widest border-r border-gray-200 pr-3 mr-3 h-4 flex items-center dark:border-dark-700">
                                                {billingConfig.establishment}-{billingConfig.emissionPoint}
                                            </div>
                                            <input
                                                type="number"
                                                id="seqFactura"
                                                value={billingConfig.currentSequenceFactura}
                                                onChange={(e) => onBillingConfigChange({ ...billingConfig, currentSequenceFactura: parseInt(e.target.value) || 0 })}
                                                className={`${inputClass} pl-28 font-mono text-right`}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-center text-orange-600 dark:text-orange-400 uppercase tracking-tighter">
                                        Siguiente: {(billingConfig.currentSequenceFactura || 0) + 1}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="seqNC" className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Última Nota de Crédito</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-[8px] tracking-widest border-r border-gray-200 pr-3 mr-3 h-4 flex items-center dark:border-dark-700">
                                                {billingConfig.establishment}-{billingConfig.emissionPoint}
                                            </div>
                                            <input
                                                type="number"
                                                id="seqNC"
                                                value={billingConfig.currentSequenceNotaCredito || 0}
                                                onChange={(e) => onBillingConfigChange({ ...billingConfig, currentSequenceNotaCredito: parseInt(e.target.value) || 0 })}
                                                className={`${inputClass} pl-28 font-mono text-right`}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-center text-orange-600 dark:text-orange-400 uppercase tracking-tighter">
                                        Siguiente: {(billingConfig.currentSequenceNotaCredito || 0) + 1}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                type="submit" 
                                className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-500/25 active:scale-95"
                            >
                                Guardar Datos de Facturación
                            </button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default BillingSRISection;
