/**
 * @file BackupSection.tsx
 * @description Sistema de respaldos de base de datos.
 * Permite crear backups, listar existentes, descargar y eliminar.
 * Máximo 20 backups, auto-limpieza de viejos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../api';
import { toast } from '../../../../components/ui/AlertProvider';
import Card from '../../../../components/ui/Card';

interface BackupInfo {
    id: string;
    filename: string;
    createdAt: string;
    size: number;
    collections: string[];
}

const BackupSection: React.FC = () => {
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadBackups = useCallback(async () => {
        setLoading(true);
        try {
            const backups = await api.backup.list();
            setBackups(backups || []);
        } catch (error) {
            toast.error('Error al cargar backups', 'Error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBackups();
    }, [loadBackups]);

    const createBackup = async () => {
        setCreating(true);
        try {
            await api.backup.create();
            toast.success('Backup creado exitosamente', 'Backup');
            loadBackups();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear backup', 'Error');
        } finally {
            setCreating(false);
        }
    };

    const downloadBackup = async (backup: BackupInfo) => {
        try {
            const blob = await api.backup.download(backup.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', backup.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Descarga iniciada', 'Backup');
        } catch (error) {
            toast.error('Error al descargar backup', 'Error');
        }
    };

    const deleteBackup = async (backup: BackupInfo) => {
        if (!confirm(`¿Estás seguro de eliminar el backup ${backup.filename}?`)) {
            return;
        }

        setDeletingId(backup.id);
        try {
            await api.backup.delete(backup.id);
            toast.success('Backup eliminado', 'Backup');
            loadBackups();
        } catch (error) {
            toast.error('Error al eliminar backup', 'Error');
        } finally {
            setDeletingId(null);
        }
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Respaldos de Base de Datos</h2>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                    {backups.length}/20 backups almacenados
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={createBackup}
                            disabled={creating || backups.length >= 20}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Crear Backup
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Los backups se guardan localmente y se eliminan automáticamente cuando superan los 20 más recientes.
                        Se recomienda crear un backup diario antes de realizar cambios importantes.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-12 px-6 bg-gray-50 dark:bg-dark-800 rounded-3xl border border-dashed border-gray-300 dark:border-dark-700">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Sin Backups</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                Crea tu primer backup para proteger tus datos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {backups.map((backup) => (
                                <div
                                    key={backup.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                                {formatDate(backup.createdAt)}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    {formatSize(backup.size)}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">|</span>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    {backup.collections.length} colecciones
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => downloadBackup(backup)}
                                            className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                                            title="Descargar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup)}
                                            disabled={deletingId === backup.id}
                                            className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
                                            title="Eliminar"
                                        >
                                            {deletingId === backup.id ? (
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default BackupSection;
