import React, { useState } from 'react';
import { Bill } from '../../types';
import { billingService } from '../../services/BillingService';
import { useRestaurantConfig } from '../../contexts/RestaurantConfigContext';
import { FileTextIcon, AlertCircleIcon } from '../Icons';

interface CreditNoteModalProps {
    bill: Bill;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CREDIT_NOTE_REASONS = {
    '01': 'Devolución de mercancías',
    '02': 'Descuento concedido',
    '03': 'Devolución por comprobante anulado',
    '04': 'Descuento por comprobante anulado',
    '05': 'Error en el RUC',
    '06': 'Error en descripción',
    '07': 'Corrección de precio'
};

const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
    bill,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [reason, setReason] = useState<string>('03');
    const [customDescription, setCustomDescription] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const { config } = useRestaurantConfig();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const taxRate = config.billing?.taxRate || 15;
            await billingService.generateCreditNote({
                billId: bill.id,
                reason,
                customDescription: customDescription || undefined,
                taxRate
            });

            alert('✅ Nota de crédito generada y enviada al SRI exitosamente');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error generating credit note:', err);
            setError(err.message || 'Error al generar la nota de crédito');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileTextIcon className="w-6 h-6 text-white" />
                            <h2 className="text-xl font-bold text-white">Generar Nota de Crédito</h2>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Bill Info */}
                    <div className="bg-gray-50 dark:bg-dark-750 p-4 rounded-xl border border-gray-200 dark:border-dark-700">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Factura Original</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">Número:</p>
                                <p className="font-mono font-bold text-gray-800 dark:text-gray-200">{bill.documentNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Cliente:</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{bill.customerName}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">RUC/CI:</p>
                                <p className="font-mono text-gray-800 dark:text-gray-200">{bill.customerIdentification}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Total:</p>
                                <p className="font-bold text-lg text-primary-600">${bill.total.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Reason Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Motivo de la Nota de Crédito *
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                            {Object.entries(CREDIT_NOTE_REASONS).map(([code, description]) => (
                                <option key={code} value={code}>
                                    {code} - {description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Descripción Personalizada (opcional)
                        </label>
                        <textarea
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            placeholder="Agregue detalles adicionales si es necesario..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                        <AlertCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-300">
                            <p className="font-semibold mb-1">⚠️ Importante:</p>
                            <p>Esta acción generará una Nota de Crédito que anulará la factura original. El documento será firmado y enviado al SRI automáticamente.</p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <FileTextIcon className="w-5 h-5" />
                                    Generar Nota de Crédito
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreditNoteModal;
