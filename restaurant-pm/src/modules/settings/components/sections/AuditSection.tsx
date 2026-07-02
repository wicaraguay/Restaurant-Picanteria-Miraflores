/**
 * @file AuditSection.tsx
 * @description Sección de auditoría para ver actividad de usuarios y cambios en el sistema.
 * Solo visible para administradores.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../../../api';
import { toast } from '../../../../components/ui/AlertProvider';

interface AuditLog {
    _id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';
    collection: string;
    documentId: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: Record<string, { from: any; to: any }>;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ip?: string;
    timestamp: string;
}

interface Employee {
    id: string;
    name: string;
    username: string;
}

interface AuditSectionProps {
    employees: Employee[];
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    CREATE: { label: 'Creado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    UPDATE: { label: 'Modificado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    DELETE: { label: 'Eliminado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    SOFT_DELETE: { label: 'Desactivado', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    RESTORE: { label: 'Restaurado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

const COLLECTION_LABELS: Record<string, string> = {
    Order: 'Pedido',
    Bill: 'Factura',
    CreditNote: 'Nota de Crédito',
    Customer: 'Cliente',
    Menu: 'Producto',
    Employee: 'Empleado',
    Role: 'Rol',
    RestaurantConfig: 'Configuración',
};

const AuditSection: React.FC<AuditSectionProps> = ({ employees }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'user' | 'deleted'>('user');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Cargar actividad del usuario seleccionado
    const loadUserActivity = async (userId: string) => {
        if (!userId) {
            setAuditLogs([]);
            return;
        }

        setLoading(true);
        try {
            const logs = await api.audit.getUserActivity(userId, 100);
            setAuditLogs(logs || []);
        } catch (error) {
            toast.error('Error al cargar actividad del usuario', 'Error');
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    };

    // Cargar documentos eliminados
    const loadDeletedDocuments = async () => {
        setLoading(true);
        try {
            // Últimos 7 días
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const logs = await api.audit.getDeletedDocuments(since);
            setAuditLogs(logs || []);
        } catch (error) {
            toast.error('Error al cargar documentos eliminados', 'Error');
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'deleted') {
            loadDeletedDocuments();
        } else if (selectedUserId) {
            loadUserActivity(selectedUserId);
        }
    }, [viewMode, selectedUserId]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDocumentSummary = (log: AuditLog): string => {
        if (log.action === 'DELETE' && log.before) {
            // Para eliminaciones, mostrar info del documento eliminado
            const doc = log.before;
            if (doc.documentNumber) return `#${doc.documentNumber}`;
            if (doc.orderNumber) return `Pedido #${doc.orderNumber}`;
            if (doc.name) return doc.name;
            if (doc.email) return doc.email;
        }

        if (log.after) {
            const doc = log.after;
            if (doc.documentNumber) return `#${doc.documentNumber}`;
            if (doc.orderNumber) return `Pedido #${doc.orderNumber}`;
            if (doc.name) return doc.name;
            if (doc.email) return doc.email;
        }

        return log.documentId.slice(-6);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-panel p-6">
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                    Auditoría del Sistema
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Revisa la actividad de los usuarios y los cambios realizados en el sistema.
                </p>
            </div>

            {/* Controles */}
            <div className="glass-panel p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Toggle de modo */}
                    <div className="flex bg-gray-100 dark:bg-dark-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('user')}
                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                viewMode === 'user'
                                    ? 'bg-white dark:bg-dark-700 text-blue-600 shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Por Usuario
                        </button>
                        <button
                            onClick={() => setViewMode('deleted')}
                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                viewMode === 'deleted'
                                    ? 'bg-white dark:bg-dark-700 text-red-600 shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Eliminados
                        </button>
                    </div>

                    {/* Selector de usuario */}
                    {viewMode === 'user' && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecciona un empleado...</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name} (@{emp.username})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Lista de logs */}
            <div className="glass-panel p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-bold">
                            {viewMode === 'user' && !selectedUserId
                                ? 'Selecciona un usuario para ver su actividad'
                                : 'No hay registros de auditoría'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {auditLogs.map((log) => (
                            <div
                                key={log._id}
                                onClick={() => setSelectedLog(log)}
                                className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-dark-800 hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer transition-all"
                            >
                                {/* Acción */}
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${ACTION_LABELS[log.action]?.color || 'bg-gray-100 text-gray-600'}`}>
                                    {ACTION_LABELS[log.action]?.label || log.action}
                                </span>

                                {/* Colección y documento */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {COLLECTION_LABELS[log.collection] || log.collection}: {getDocumentSummary(log)}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {log.userEmail || 'Sistema'} • {formatDate(log.timestamp)}
                                    </p>
                                </div>

                                {/* Flecha */}
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de detalle */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                        {/* Header del modal */}
                        <div className="p-4 border-b dark:border-dark-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg text-gray-900 dark:text-white">
                                    Detalle de Auditoría
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {formatDate(selectedLog.timestamp)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Contenido del modal */}
                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                            {/* Info general */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Acción:</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${ACTION_LABELS[selectedLog.action]?.color}`}>
                                        {ACTION_LABELS[selectedLog.action]?.label}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Entidad:</span>
                                    <span className="ml-2 font-bold">{COLLECTION_LABELS[selectedLog.collection] || selectedLog.collection}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Usuario:</span>
                                    <span className="ml-2 font-bold">{selectedLog.userEmail || 'Sistema'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">IP:</span>
                                    <span className="ml-2 font-mono text-xs">{selectedLog.ip || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Cambios */}
                            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Cambios realizados:</h4>
                                    <div className="space-y-2">
                                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                                            <div key={field} className="bg-gray-50 dark:bg-dark-900 rounded-lg p-3">
                                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">{field}</p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-red-500 line-through truncate max-w-[45%]">
                                                        {JSON.stringify(change.from)}
                                                    </span>
                                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                    <span className="text-green-500 truncate max-w-[45%]">
                                                        {JSON.stringify(change.to)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Documento eliminado */}
                            {selectedLog.action === 'DELETE' && selectedLog.before && (
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Documento eliminado:</h4>
                                    <pre className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-xs overflow-x-auto text-red-800 dark:text-red-300">
                                        {JSON.stringify(selectedLog.before, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditSection;
