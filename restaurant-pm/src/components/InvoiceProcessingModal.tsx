import React from 'react';
import { CheckCircleIcon, AlertCircleIcon, RefreshCcwIcon, FileTextIcon } from './Icons';

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
    onClose: () => void;
    onPrint?: () => void;
    onGoToHistory?: () => void;
}

const InvoiceProcessingModal: React.FC<InvoiceProcessingModalProps> = ({
    isOpen,
    currentState,
    message,
    details,
    invoiceNumber,
    onClose,
    onPrint,
    onGoToHistory
}) => {
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
                return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            case InvoiceProcessState.PENDING:
                return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            default:
                return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const isProcessing = [
        InvoiceProcessState.VALIDATING,
        InvoiceProcessState.GENERATING,
        InvoiceProcessState.SIGNING,
        InvoiceProcessState.SENDING,
        InvoiceProcessState.WAITING_AUTHORIZATION
    ].includes(currentState);

    const canClose = !isProcessing;

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

                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        {message}
                    </h2>

                    {details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {details}
                        </p>
                    )}

                    {invoiceNumber && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Número de Factura
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
                    {currentState === InvoiceProcessState.AUTHORIZED && onPrint && (
                        <button
                            onClick={onPrint}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <span>🖨️</span>
                            Imprimir Comprobante (RIDE)
                        </button>
                    )}

                    {currentState === InvoiceProcessState.PENDING && onGoToHistory && (
                        <button
                            onClick={onGoToHistory}
                            className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <FileTextIcon className="w-5 h-5" />
                            Ir al Historial de Facturas
                        </button>
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
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
                            Por favor espere, procesando...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessingModal;
