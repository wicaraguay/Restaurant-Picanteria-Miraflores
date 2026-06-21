import React, { useEffect, useState, useRef } from 'react';
import { CheckCircleIcon, AlertCircleIcon, RefreshCcwIcon, FileTextIcon, DownloadIcon, PrinterIcon } from '../../../components/ui/Icons';

// FIX M-05: Timeout configurable para el modal de procesamiento
const PROCESSING_TIMEOUT_MS = 120000; // 2 minutos

export enum InvoiceProcessState {
    IDLE = 'idle',
    VALIDATING = 'validating',
    GENERATING = 'generating',
    SIGNING = 'signing',
    SENDING = 'sending',
    WAITING_AUTHORIZATION = 'waiting_authorization',
    AUTHORIZED = 'authorized',
    PENDING = 'pending',
    ERROR = 'error'
}

interface InvoiceProcessingModalProps {
    isOpen: boolean;
    currentState: InvoiceProcessState;
    message: string;
    details?: string;
    invoiceNumber?: string;
    documentLabel?: string;
    onClose: () => void;
    onPrint?: () => void;
    onDownloadPdf?: () => void;
    onGoToHistory?: () => void;
    onTimeout?: () => void; // FIX M-05: Callback cuando se alcanza el timeout
    timeoutMs?: number; // FIX M-05: Timeout personalizable (default: 2 min)
}

const InvoiceProcessingModal: React.FC<InvoiceProcessingModalProps> = ({
    isOpen,
    currentState,
    message,
    details,
    invoiceNumber,
    documentLabel = 'Número de Factura',
    onClose,
    onPrint,
    onDownloadPdf,
    onGoToHistory,
    onTimeout,
    timeoutMs = PROCESSING_TIMEOUT_MS
}) => {
    // FIX M-05: Track timeout state
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const isProcessing = [
        InvoiceProcessState.VALIDATING,
        InvoiceProcessState.GENERATING,
        InvoiceProcessState.SIGNING,
        InvoiceProcessState.SENDING,
        InvoiceProcessState.WAITING_AUTHORIZATION
    ].includes(currentState);

    // FIX M-05: Timeout timer for processing states
    useEffect(() => {
        if (isOpen && isProcessing && !hasTimedOut) {
            // Start elapsed time counter
            setElapsedSeconds(0);
            intervalRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);

            // Set timeout
            timerRef.current = setTimeout(() => {
                setHasTimedOut(true);
                if (onTimeout) {
                    onTimeout();
                }
            }, timeoutMs);

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        } else if (!isProcessing) {
            // Reset when not processing
            setHasTimedOut(false);
            setElapsedSeconds(0);
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isOpen, isProcessing, hasTimedOut, timeoutMs, onTimeout]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    if (!isOpen) return null;

    const getStateIcon = () => {
        switch (currentState) {
            case InvoiceProcessState.AUTHORIZED:
                return <CheckCircleIcon className="w-16 h-16 text-green-500" />;
            case InvoiceProcessState.ERROR:
                return <AlertCircleIcon className="w-16 h-16 text-red-500" />;
            case InvoiceProcessState.PENDING:
                return <FileTextIcon className="w-16 h-16 text-yellow-500" />;
            case InvoiceProcessState.VALIDATING:
            case InvoiceProcessState.GENERATING:
            case InvoiceProcessState.SIGNING:
            case InvoiceProcessState.SENDING:
            case InvoiceProcessState.WAITING_AUTHORIZATION:
                return <RefreshCcwIcon className="w-16 h-16 text-blue-500 animate-spin" />;
            default:
                return <RefreshCcwIcon className="w-16 h-16 text-gray-400" />;
        }
    };

    const getStateColor = () => {
        switch (currentState) {
            case InvoiceProcessState.AUTHORIZED:
                return 'border-green-500 bg-green-50 dark:bg-green-900/20';
            case InvoiceProcessState.ERROR:
                if (details?.includes('SRI_LIMIT_REACHED')) {
                    return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
                }
                return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            case InvoiceProcessState.PENDING:
                return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            default:
                return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
        }
    };

    // FIX M-05: Allow closing when timed out
    const canClose = !isProcessing || hasTimedOut;

    // FIX M-05: Format elapsed time as mm:ss
    const formatElapsedTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm"
            onClick={canClose ? onClose : undefined}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md border-4 ${getStateColor()} transform transition-all`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header con ícono de estado */}
                <div className="p-8 text-center">
                    <div className="flex justify-center mb-4 animate-in fade-in zoom-in duration-300">
                        {getStateIcon()}
                    </div>

                    <h2 className={`text-2xl font-bold mb-2 ${details?.includes('SRI_LIMIT_REACHED') ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-white'}`}>
                        {details?.includes('SRI_LIMIT_REACHED') ? 'Límite de Intentos Alcanzado' : message}
                    </h2>

                    {details && (
                        <p className={`text-sm mb-4 ${details.includes('SRI_LIMIT_REACHED') ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {details.replace('SRI_LIMIT_REACHED: ', '')}
                        </p>
                    )}

                    {invoiceNumber && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                {documentLabel}
                            </p>
                            <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">
                                {invoiceNumber}
                            </p>
                        </div>
                    )}

                    {/* Barra de progreso animada para estados de procesamiento */}
                    {isProcessing && (
                        <div className="mt-6 w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                    )}
                </div>

                {/* Footer con acciones */}
                <div className="p-6 bg-gray-50 dark:bg-dark-900 rounded-b-2xl border-t dark:border-dark-700 space-y-3">
                    {currentState === InvoiceProcessState.AUTHORIZED && (
                        <div className="flex gap-2">
                            {onPrint && (
                                <button
                                    onClick={onPrint}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    Imprimir
                                </button>
                            )}
                            {onDownloadPdf && (
                                <button
                                    onClick={onDownloadPdf}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Descargar PDF
                                </button>
                            )}
                        </div>
                    )}

                    {currentState === InvoiceProcessState.PENDING && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                {onPrint && (
                                    <button
                                        onClick={onPrint}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <PrinterIcon className="w-5 h-5" />
                                        Imprimir
                                    </button>
                                )}
                                {onDownloadPdf && (
                                    <button
                                        onClick={onDownloadPdf}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <DownloadIcon className="w-5 h-5" />
                                        Descargar PDF
                                    </button>
                                )}
                            </div>
                            {onGoToHistory && (
                                <button
                                    onClick={onGoToHistory}
                                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <FileTextIcon className="w-5 h-5" />
                                    Ir al Historial de Facturas
                                </button>
                            )}
                        </div>
                    )}

                    {canClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium transition-all"
                        >
                            {currentState === InvoiceProcessState.ERROR ? 'Cerrar' : 'Continuar'}
                        </button>
                    )}

                    {!canClose && (
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                Por favor espere, procesando...
                            </p>
                            {/* FIX M-05: Show elapsed time */}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                                Tiempo: {formatElapsedTime(elapsedSeconds)}
                            </p>
                        </div>
                    )}

                    {/* FIX M-05: Show timeout warning and cancel button */}
                    {hasTimedOut && isProcessing && (
                        <div className="space-y-3">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
                                    El proceso está tardando más de lo esperado.
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 text-center mt-1">
                                    Puede cancelar y verificar el estado en el historial.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                Cancelar y Verificar Después
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessingModal;
