/**
 * @file ErrorLogPanel.tsx
 * @description Panel que muestra el historial de errores del SRI para una factura o nota de crédito.
 * Se muestra dentro de la fila expandida de BillingHistory cuando errorLog tiene entradas.
 *
 * Características:
 * - Muestra todas las entradas del errorLog en orden cronológico
 * - Clasifica el tipo de error: usuario (datos) vs SRI (servidor)
 * - Formatea el timestamp a hora de Ecuador (UTC-5)
 * - Proporciona sugerencias de corrección según el tipo de error
 */

import React, { useState } from 'react';
import { BillErrorEntry } from '../types/billing.types';

interface ErrorLogPanelProps {
    errorLog: BillErrorEntry[];
    sriMessage?: string;
    documentNumber?: string;
}

// Clasifica el error y da sugerencias accionables
function classifyError(entry: BillErrorEntry): {
    type: 'user' | 'sri' | 'timeout' | 'unknown';
    label: string;
    color: string;
    suggestion: string;
} {
    const msg = (entry.message || '').toLowerCase();
    const status = (entry.sriStatus || '').toLowerCase();

    if (msg.includes('ruc') || msg.includes('identificacion') || msg.includes('cedula') ||
        msg.includes('razon social') || msg.includes('secuencial') || msg.includes('impuesto') ||
        msg.includes('estructura') || msg.includes('clave acceso') || msg.includes('datos') ||
        status === 'devuelta' || status === 'rechazada') {
        return {
            type: 'user',
            label: 'Error de datos',
            color: 'red',
            suggestion: 'Revisa el RUC/cédula, razón social y datos del cliente. Puede editar la factura y reintentarla.'
        };
    }

    if (msg.includes('timeout') || msg.includes('time out') || msg.includes('conexion') ||
        msg.includes('connection') || msg.includes('econnrefused') || status === 'timeout') {
        return {
            type: 'timeout',
            label: 'Timeout / Conexión',
            color: 'amber',
            suggestion: 'El SRI no respondió a tiempo. Espera unos minutos y verifica el estado con el botón de reintento.'
        };
    }

    if (msg.includes('sri') || msg.includes('interno') || msg.includes('servidor') ||
        msg.includes('500') || msg.includes('mantenimiento') || status === 'error') {
        return {
            type: 'sri',
            label: 'Error del SRI',
            color: 'orange',
            suggestion: 'Problema en los servidores del SRI. Reintenta en unos minutos. Si persiste, verifica sri.gob.ec.'
        };
    }

    return {
        type: 'unknown',
        label: 'Error desconocido',
        color: 'gray',
        suggestion: 'Consulta el XML de la factura y reintenta el envío.'
    };
}

function formatTimestamp(iso: string): string {
    try {
        const d = new Date(iso);
        return new Intl.DateTimeFormat('es-EC', {
            timeZone: 'America/Guayaquil',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
        }).format(d);
    } catch {
        return iso;
    }
}

const colorMap: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    red:     { bg: 'bg-red-50 dark:bg-red-900/10',     border: 'border-red-200 dark:border-red-800/40',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',    text: 'text-red-700 dark:text-red-400' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800/40', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-400' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/40', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', text: 'text-orange-700 dark:text-orange-400' },
    gray:    { bg: 'bg-gray-50 dark:bg-gray-900/10',   border: 'border-gray-200 dark:border-gray-700',       badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',    text: 'text-gray-600 dark:text-gray-400' },
};

const ErrorLogPanel: React.FC<ErrorLogPanelProps> = ({ errorLog, sriMessage, documentNumber }) => {
    const [expanded, setExpanded] = useState(false);

    // Si no hay log Y tampoco hay sriMessage, no mostrar nada
    const hasEntries = errorLog && errorLog.length > 0;
    const hasLegacyMessage = !hasEntries && sriMessage;

    if (!hasEntries && !hasLegacyMessage) return null;

    const entries = hasEntries ? [...errorLog].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ) : [];

    const lastEntry = entries[entries.length - 1];
    const classification = lastEntry ? classifyError(lastEntry) : null;

    return (
        <div className="mt-4 border border-dashed border-red-300 dark:border-red-800/50 rounded-2xl overflow-hidden">
            {/* Header del panel — siempre visible */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    {/* Ícono de alerta */}
                    <span className="text-red-500 text-sm">⚠️</span>
                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                        Log de Errores SRI
                    </span>
                    {hasEntries && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[9px] font-black rounded-full border border-red-200 dark:border-red-800/50">
                            {entries.length} {entries.length === 1 ? 'intento' : 'intentos'}
                        </span>
                    )}
                    {classification && (
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${colorMap[classification.color].badge}`}>
                            {classification.label}
                        </span>
                    )}
                </div>
                <span className={`text-gray-400 text-xs font-bold transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* Contenido expandible */}
            {expanded && (
                <div className="px-4 py-4 space-y-3 bg-white dark:bg-dark-850">
                    {/* Sugerencia de acción */}
                    {classification && (
                        <div className={`flex items-start gap-3 p-3 rounded-xl border ${colorMap[classification.color].bg} ${colorMap[classification.color].border}`}>
                            <span className="text-base mt-0.5">
                                {classification.type === 'user' ? '🔧' : classification.type === 'timeout' ? '⏱️' : classification.type === 'sri' ? '🌐' : '❓'}
                            </span>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${colorMap[classification.color].text}`}>
                                    ¿Qué hacer?
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{classification.suggestion}</p>
                            </div>
                        </div>
                    )}

                    {/* Entradas del log */}
                    {hasEntries ? (
                        <div className="space-y-2">
                            {entries.map((entry, idx) => {
                                const c = classifyError(entry);
                                const colors = colorMap[c.color];
                                return (
                                    <div key={idx} className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                                                Intento #{entry.attempt}
                                            </span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                                                {entry.sriStatus}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono ml-auto">
                                                {formatTimestamp(entry.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                                            {entry.message || '(sin mensaje)'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Fallback: solo sriMessage sin estructura de log
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-dark-800">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Mensaje del SRI
                            </p>
                            <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-words">
                                {sriMessage}
                            </p>
                        </div>
                    )}

                    {/* Footer informativo */}
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 italic text-center pt-1">
                        Documento: {documentNumber} · Los errores se registran automáticamente y nunca se borran
                    </p>
                </div>
            )}
        </div>
    );
};

export default ErrorLogPanel;
