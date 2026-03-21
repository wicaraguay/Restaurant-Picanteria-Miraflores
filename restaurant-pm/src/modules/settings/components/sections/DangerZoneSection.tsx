import React, { useState } from 'react';
import Card from '../../../../components/ui/Card';
import { AlertCircleIcon } from '../../../../components/ui/Icons';

interface DangerZoneSectionProps {
    onResetConfig: () => Promise<void>;
    onResetBilling: () => Promise<void>;
    onResetFullSystem: () => Promise<void>;
}

const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({ onResetConfig, onResetBilling, onResetFullSystem }) => {
    const [showResetConfig, setShowResetConfig] = useState(false);
    const [showResetBilling, setShowResetBilling] = useState(false);
    const [showMasterReset, setShowMasterReset] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card title="Zona Crítica">
                <div className="p-2 space-y-8">
                    {/* Sección 1: Configuración */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Restaurar Configuración</h3>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed max-w-md">
                                Reestablece el nombre, logo, colores y datos de contacto a los valores por defecto. No afecta facturas ni menú.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowResetConfig(true)}
                            className="whitespace-nowrap bg-white dark:bg-dark-800 text-red-600 border-2 border-red-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                        >
                            Restaurar Todo
                        </button>
                    </div>

                    {/* Sección 2: Facturación */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Limpieza de Facturación</h3>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed max-w-md">
                                Borra históricos de facturas y reinicia secuenciales a 1. <span className="text-red-500">Irreversible.</span> Ideal para cierre de año fiscal.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowResetBilling(true)}
                            className="whitespace-nowrap bg-white dark:bg-dark-800 text-red-600 border-2 border-red-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                        >
                            Limpieza Total
                        </button>
                    </div>

                    {/* Sección 3: Nuclear (Nuevo Cliente) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-black dark:bg-red-950/20 border-2 border-red-600/50">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-white dark:text-red-400 uppercase tracking-tight flex items-center gap-2">
                                <AlertCircleIcon className="w-4 h-4 text-red-500 animate-pulse" />
                                Modo Fábrica (Nueva Venta)
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest leading-relaxed max-w-md">
                                <span className="text-red-500 font-black">NIVEL NUCLEAR.</span> Borra Menú, Clientes, Facturas, Órdenes y Personal. Deja el sistema 100% virgen para un nuevo cliente.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowMasterReset(true)}
                            className="whitespace-nowrap bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                        >
                            PURGA TOTAL
                        </button>
                    </div>
                </div>
            </Card>

            <ResetConfigModal isOpen={showResetConfig} onClose={() => setShowResetConfig(false)} onConfirm={onResetConfig} />
            <ResetBillingModal isOpen={showResetBilling} onClose={() => setShowResetBilling(false)} onConfirm={onResetBilling} />
            <MasterResetModal isOpen={showMasterReset} onClose={() => setShowMasterReset(false)} onConfirm={onResetFullSystem} />
        </div>
    );
};

// --- Modales de Confirmación ---

const ResetConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-red-600">
                        <AlertCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Restaurar configuración?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Esta acción devolverá los datos visuales (nombre, logo, colores) a los valores originales. Las facturas emitidas NO se borrarán.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">Restaurar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResetBillingModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-red-600 text-red-600">
                        <AlertCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Limpieza de facturación?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Se borrarán todas las facturas y notas de crédito de la base de datos. Los secuenciales volverán a 1. 
                        <strong> Esta acción no se puede deshacer.</strong>
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-3 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Escribe <span className="text-red-600">BORRAR</span> para confirmar:</p>
                        <input 
                            type="text" 
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full text-center p-2 rounded-lg border-2 border-red-200 focus:border-red-600 focus:outline-none font-black uppercase text-xs"
                            placeholder="..."
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button 
                            disabled={confirmText !== 'BORRAR'}
                            onClick={() => { onConfirm(); onClose(); }} 
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${confirmText === 'BORRAR' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            Confirmar Borrado
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MasterResetModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (confirmText !== 'PURGA TOTAL') return;
        setIsLoading(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-red-600 animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
                        <AlertCircleIcon className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿PURGA NUCLEAR?</h2>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Esta acción borrará <span className="text-red-600 font-black">TODO</span> el contenido operativo (Menú, Clientes, Órdenes, Empleados y Facturas). 
                        El sistema quedará 100% virgen para un nuevo restaurante.
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-4 rounded-2xl space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escribe <span className="text-red-600">PURGA TOTAL</span> para confirmar:</p>
                        <input 
                            type="text" 
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full text-center p-3 rounded-xl border-2 border-red-200 focus:border-red-600 focus:outline-none font-black uppercase text-sm tracking-widest"
                            placeholder="..."
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-dark-700 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button 
                            disabled={confirmText !== 'PURGA TOTAL' || isLoading}
                            onClick={handleConfirm} 
                            className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${confirmText === 'PURGA TOTAL' ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xl shadow-red-600/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            {isLoading ? 'Purgando...' : 'Proceder'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneSection;
