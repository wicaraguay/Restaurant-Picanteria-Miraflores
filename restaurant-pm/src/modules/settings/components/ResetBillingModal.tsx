/**
 * @file ResetBillingModal.tsx
 * @description Modal de seguridad extremo para reiniciar el sistema de facturación.
 */
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export interface ResetBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ResetBillingModal: React.FC<ResetBillingModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "ELIMINAR TODO";

    const handleConfirm = () => {
        onConfirm();
        setConfirmationText('');
        onClose();
    };

    const handleClose = () => {
        setConfirmationText('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="PELIGRO: Reiniciar Sistema de FacturaciÃ³n">
            <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                        âš ï¸ Â¡ACCIÃ“N DESTRUCTIVA E IRREVERSIBLE! âš ï¸
                    </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Esta acciÃ³n eliminarÃ¡ permanentemente:
                </p>
                <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1 ml-2 font-medium">
                    <li>TODAS las facturas emitidas</li>
                    <li>TODAS las notas de crÃ©dito</li>
                    <li>Historial de facturaciÃ³n completo</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    AdemÃ¡s:
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1 ml-2">
                    <li>Se reiniciarÃ¡n los contadores de secuencia a 0 (la prÃ³xima serÃ¡ 001).</li>
                    <li>Se marcarÃ¡n todas las Ã³rdenes como "No Facturadas".</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                    Para confirmar, por favor escribe <code className="font-mono bg-red-100 dark:bg-red-900/50 p-1 rounded text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">{requiredText}</code> en el campo de abajo.
                </p>
                <div>
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className={`${inputClass} border-red-300 focus:border-red-500 focus:ring-red-500/20`}
                        placeholder={requiredText}
                        autoFocus
                    />
                </div>
                <div className="flex justify-end pt-2">
                    <button type="button" onClick={handleClose} className="mr-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:bg-dark-600 dark:text-light-background dark:hover:bg-dark-500 font-medium">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirmationText !== requiredText}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed dark:disabled:bg-red-900/50 font-bold transition-colors shadow-lg shadow-red-500/30"
                    >
                        ELIMINAR TODO Y REINICIAR
                    </button>
                </div>
            </div>
        </Modal>
    );
};
