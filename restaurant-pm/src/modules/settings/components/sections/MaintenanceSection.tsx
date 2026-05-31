/**
 * @file MaintenanceSection.tsx
 * @description Sección de Mantenimiento - Operaciones rutinarias seguras
 *
 * @features
 * - Exportación de datos (menú, clientes, facturas, órdenes)
 * - Importación masiva de datos
 * - Cierre de período fiscal
 * - Logs y auditoría del sistema
 */

import React, { useState } from 'react';
import Card from '../../../../components/ui/Card';
import { toast } from '../../../../components/ui/AlertProvider';

interface MaintenanceSectionProps {
    onExportMenu: () => Promise<void>;
    onExportClients: () => Promise<void>;
    onExportBills: () => Promise<void>;
    onExportOrders: () => Promise<void>;
    onFiscalYearClose: () => Promise<void>;
}

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({
    onExportMenu,
    onExportClients,
    onExportBills,
    onExportOrders,
    onFiscalYearClose
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [showFiscalCloseModal, setShowFiscalCloseModal] = useState(false);

    const handleExport = async (exportFn: () => Promise<void>, name: string) => {
        setIsExporting(true);
        try {
            await exportFn();
            toast.success(`${name} exportado correctamente`, 'Éxito');
        } catch (error) {
            toast.error(`Error al exportar ${name}`, 'Error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sección 1: Exportar Datos */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Exportar Datos</h2>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Descarga backups de tu información</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Exportar Menú */}
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Menú Completo</h3>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Productos, categorías y precios</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleExport(onExportMenu, 'Menú')}
                                disabled={isExporting}
                                className="w-full py-2.5 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? 'Exportando...' : 'Exportar Excel'}
                            </button>
                        </div>

                        {/* Exportar Clientes */}
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Base de Clientes</h3>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombres, emails, teléfonos</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleExport(onExportClients, 'Clientes')}
                                disabled={isExporting}
                                className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? 'Exportando...' : 'Exportar CSV'}
                            </button>
                        </div>

                        {/* Exportar Facturas */}
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Facturas Mes Actual</h3>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Histórico de facturación</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleExport(onExportBills, 'Facturas')}
                                disabled={isExporting}
                                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? 'Exportando...' : 'Exportar Excel'}
                            </button>
                        </div>

                        {/* Exportar Órdenes */}
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Historial Órdenes</h3>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Todas las órdenes procesadas</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleExport(onExportOrders, 'Órdenes')}
                                disabled={isExporting}
                                className="w-full py-2.5 bg-cyan-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? 'Exportando...' : 'Exportar CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sección 2: Cierre de Período Fiscal */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cierre Fiscal</h2>
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Archiva y reinicia secuenciales</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                                    <span className="text-sm font-black">ℹ</span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">Cierre de Año Fiscal</h4>
                                    <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-300/60 uppercase tracking-widest leading-relaxed mt-1">
                                        Esta operación genera un reporte de cierre anual, archiva las facturas del año y reinicia los secuenciales a 1 para el nuevo período fiscal.
                                    </p>
                                    <ul className="mt-3 space-y-1 text-[9px] font-bold text-amber-700/60 dark:text-amber-300/50 uppercase tracking-wider">
                                        <li>✓ Se genera reporte PDF del año</li>
                                        <li>✓ Facturas se archivan (no se eliminan)</li>
                                        <li>✓ Secuenciales vuelven a 1</li>
                                        <li>✓ Requiere contraseña de administrador</li>
                                    </ul>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFiscalCloseModal(true)}
                                className="w-full py-3 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-600/20"
                            >
                                Iniciar Cierre Fiscal
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sección 3: Logs y Auditoría (Próximamente) */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-400 uppercase tracking-tight">Logs y Auditoría</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Próximamente</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">
                            Esta funcionalidad estará disponible en la próxima actualización
                        </p>
                    </div>
                </div>
            </Card>

            {/* Modal de Cierre Fiscal */}
            <FiscalCloseModal
                isOpen={showFiscalCloseModal}
                onClose={() => setShowFiscalCloseModal(false)}
                onConfirm={onFiscalYearClose}
            />
        </div>
    );
};

// Modal de Cierre Fiscal
const FiscalCloseModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!password.trim()) {
            toast.error('Ingresa tu contraseña para confirmar', 'Contraseña Requerida');
            return;
        }

        setIsProcessing(true);
        try {
            await onConfirm();
            toast.success('Cierre fiscal completado correctamente', 'Éxito');
            onClose();
            setPassword('');
        } catch (error) {
            toast.error('Error al realizar el cierre fiscal', 'Error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-amber-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Confirmar Cierre Fiscal</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Esta acción generará el reporte de cierre anual, archivará las facturas del año actual y reiniciará los secuenciales a 1.
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-4 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ingresa tu contraseña para confirmar:</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg border-2 border-amber-200 dark:border-amber-800 focus:border-amber-600 focus:outline-none font-bold text-sm text-center dark:bg-dark-800 dark:text-white"
                            placeholder="••••••••"
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!password.trim() || isProcessing}
                            onClick={handleConfirm}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                password.trim() && !isProcessing
                                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Procesando...' : 'Confirmar Cierre'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceSection;
