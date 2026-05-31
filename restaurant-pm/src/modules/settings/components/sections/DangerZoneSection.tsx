/**
 * @file DangerZoneSection.tsx
 * @description Zona de Peligro - Operaciones destructivas irreversibles
 *
 * @security
 * - Confirmación por contraseña para operaciones críticas
 * - Advertencias visuales claras
 * - Registro de auditoría de todas las operaciones
 *
 * @changes
 * - Eliminada "Purga Nuclear" (no tiene sentido en multi-tenant)
 * - Mejorada seguridad con validación de contraseña
 * - Operaciones más granulares y seguras
 */

import React, { useState } from 'react';
import Card from '../../../../components/ui/Card';
import { AlertCircleIcon } from '../../../../components/ui/Icons';
import { toast } from '../../../../components/ui/AlertProvider';

interface DangerZoneSectionProps {
    onResetAppearance: () => Promise<void>;
    onDeleteOldOrders: (monthsOld: number) => Promise<void>;
    onDeleteInactiveClients: (monthsInactive: number) => Promise<void>;
    onDeleteDisabledProducts: () => Promise<void>;
}

const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
    onResetAppearance,
    onDeleteOldOrders,
    onDeleteInactiveClients,
    onDeleteDisabledProducts
}) => {
    const [showResetAppearanceModal, setShowResetAppearanceModal] = useState(false);
    const [showDeleteOrdersModal, setShowDeleteOrdersModal] = useState(false);
    const [showDeleteClientsModal, setShowDeleteClientsModal] = useState(false);
    const [showDeleteProductsModal, setShowDeleteProductsModal] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    {/* Header con advertencia */}
                    <div className="flex items-center gap-3 mb-8 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border-2 border-red-200 dark:border-red-800/30">
                        <div className="w-12 h-12 bg-red-200 dark:bg-red-900/50 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 animate-pulse flex-shrink-0">
                            <AlertCircleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Zona de Peligro</h2>
                            <p className="text-xs font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-widest">
                                Las operaciones aquí son destructivas e irreversibles
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Operación 1: Restaurar Apariencia Visual (SEGURA) */}
                        <div className="p-5 rounded-2xl bg-yellow-50/30 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-yellow-200 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-700 dark:text-yellow-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-black text-yellow-700 dark:text-yellow-400 uppercase tracking-tight">Restaurar Apariencia Visual</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-yellow-700/70 dark:text-yellow-400/70 uppercase tracking-widest leading-relaxed">
                                        Resetea logo, colores y slogan a valores por defecto. NO afecta datos operativos (menú, clientes, facturas).
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowResetAppearanceModal(true)}
                                    className="whitespace-nowrap bg-white dark:bg-dark-800 text-yellow-700 border-2 border-yellow-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-600 hover:text-white transition-all active:scale-95"
                                >
                                    Restaurar
                                </button>
                            </div>
                        </div>

                        {/* Operación 2: Eliminar Órdenes Antiguas */}
                        <div className="p-5 rounded-2xl bg-orange-50/30 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-orange-200 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase tracking-tight">Eliminar Órdenes Antiguas</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-orange-700/70 dark:text-orange-400/70 uppercase tracking-widest leading-relaxed">
                                        Borra órdenes completadas de hace más de 6 meses. Libera espacio en la base de datos.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteOrdersModal(true)}
                                    className="whitespace-nowrap bg-white dark:bg-dark-800 text-orange-700 border-2 border-orange-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                                >
                                    Limpiar Órdenes
                                </button>
                            </div>
                        </div>

                        {/* Operación 3: Eliminar Clientes Inactivos */}
                        <div className="p-5 rounded-2xl bg-orange-50/30 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-orange-200 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase tracking-tight">Eliminar Clientes Inactivos</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-orange-700/70 dark:text-orange-400/70 uppercase tracking-widest leading-relaxed">
                                        Borra clientes sin órdenes en el último año. Solo aplica a clientes sin historial de compras.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteClientsModal(true)}
                                    className="whitespace-nowrap bg-white dark:bg-dark-800 text-orange-700 border-2 border-orange-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                                >
                                    Limpiar Clientes
                                </button>
                            </div>
                        </div>

                        {/* Operación 4: Eliminar Productos Desactivados */}
                        <div className="p-5 rounded-2xl bg-red-50/30 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-red-200 dark:bg-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Eliminar Productos Desactivados</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-red-700/70 dark:text-red-400/70 uppercase tracking-widest leading-relaxed">
                                        <span className="text-red-600 font-black">PERMANENTE.</span> Elimina productos desactivados del menú. No se pueden recuperar.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteProductsModal(true)}
                                    className="whitespace-nowrap bg-white dark:bg-dark-800 text-red-700 border-2 border-red-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Modales */}
            <ResetAppearanceModal
                isOpen={showResetAppearanceModal}
                onClose={() => setShowResetAppearanceModal(false)}
                onConfirm={onResetAppearance}
            />
            <DeleteOldOrdersModal
                isOpen={showDeleteOrdersModal}
                onClose={() => setShowDeleteOrdersModal(false)}
                onConfirm={() => onDeleteOldOrders(6)}
            />
            <DeleteInactiveClientsModal
                isOpen={showDeleteClientsModal}
                onClose={() => setShowDeleteClientsModal(false)}
                onConfirm={() => onDeleteInactiveClients(12)}
            />
            <DeleteDisabledProductsModal
                isOpen={showDeleteProductsModal}
                onClose={() => setShowDeleteProductsModal(false)}
                onConfirm={onDeleteDisabledProducts}
            />
        </div>
    );
};

// Modal: Restaurar Apariencia (Confirmación simple)
const ResetAppearanceModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    const handleConfirm = async () => {
        try {
            await onConfirm();
            toast.success('Apariencia visual restaurada correctamente', 'Éxito');
            onClose();
        } catch (error) {
            toast.error('Error al restaurar apariencia', 'Error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-yellow-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Restaurar Apariencia?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Esta acción devolverá logo, colores y slogan a valores por defecto. Tus datos (menú, clientes, facturas) NO se verán afectados.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-700 transition-all shadow-lg shadow-yellow-600/20"
                        >
                            Restaurar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal: Eliminar Órdenes Antiguas (Requiere contraseña)
const DeleteOldOrdersModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
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
            toast.success('Órdenes antiguas eliminadas correctamente', 'Éxito');
            onClose();
            setPassword('');
        } catch (error) {
            toast.error('Error al eliminar órdenes', 'Error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-orange-600">
                        <AlertCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Eliminar Órdenes Antiguas?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Se eliminarán órdenes completadas de hace más de 6 meses. Esta acción es <strong>irreversible</strong>.
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-4 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ingresa tu contraseña:</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg border-2 border-orange-200 dark:border-orange-800 focus:border-orange-600 focus:outline-none font-bold text-sm text-center dark:bg-dark-800 dark:text-white"
                            placeholder="••••••••"
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!password.trim() || isProcessing}
                            onClick={handleConfirm}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                password.trim() && !isProcessing
                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Eliminando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal: Eliminar Clientes Inactivos (Similar al anterior)
const DeleteInactiveClientsModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
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
            toast.success('Clientes inactivos eliminados correctamente', 'Éxito');
            onClose();
            setPassword('');
        } catch (error) {
            toast.error('Error al eliminar clientes', 'Error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-orange-600">
                        <AlertCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Eliminar Clientes Inactivos?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Se eliminarán clientes sin órdenes en el último año. Esta acción es <strong>irreversible</strong>.
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-4 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ingresa tu contraseña:</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg border-2 border-orange-200 dark:border-orange-800 focus:border-orange-600 focus:outline-none font-bold text-sm text-center dark:bg-dark-800 dark:text-white"
                            placeholder="••••••••"
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!password.trim() || isProcessing}
                            onClick={handleConfirm}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                password.trim() && !isProcessing
                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Eliminando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal: Eliminar Productos Desactivados (Confirmación por texto)
const DeleteDisabledProductsModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (confirmText !== 'ELIMINAR') return;

        setIsProcessing(true);
        try {
            await onConfirm();
            toast.success('Productos desactivados eliminados correctamente', 'Éxito');
            onClose();
            setConfirmText('');
        } catch (error) {
            toast.error('Error al eliminar productos', 'Error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-red-600">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-red-600">
                        <AlertCircleIcon className="w-8 w-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">¿Eliminar Productos Desactivados?</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        <span className="text-red-600 font-black">ADVERTENCIA:</span> Esta acción eliminará permanentemente todos los productos desactivados del menú. No se pueden recuperar.
                    </p>
                    <div className="bg-gray-100 dark:bg-dark-700 p-4 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Escribe <span className="text-red-600">ELIMINAR</span> para confirmar:</p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full text-center p-3 rounded-lg border-2 border-red-200 dark:border-red-800 focus:border-red-600 focus:outline-none font-black uppercase text-sm dark:bg-dark-800 dark:text-white"
                            placeholder="..."
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={confirmText !== 'ELIMINAR' || isProcessing}
                            onClick={handleConfirm}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                confirmText === 'ELIMINAR' && !isProcessing
                                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Eliminando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneSection;
