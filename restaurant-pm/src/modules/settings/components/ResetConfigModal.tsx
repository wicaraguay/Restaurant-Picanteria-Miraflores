/**
 * @file ResetConfigModal.tsx
 * @description Modal de confirmación para restaurar la configuración a valores de fábrica.
 */
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export interface ResetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ResetConfigModal: React.FC<ResetConfigModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "RESTAURAR CONFIG";

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
        <Modal isOpen={isOpen} onClose={handleClose} title="ConfirmaciÃ³n de RestauraciÃ³n de ConfiguraciÃ³n">
            <div className="space-y-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                    <strong>Â¡AtenciÃ³n!</strong> Esta acciÃ³n restaurarÃ¡ toda la configuraciÃ³n del sistema a sus valores por defecto.
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Esto incluye:
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1 ml-2">
                    <li>InformaciÃ³n del negocio</li>
                    <li>Colores de marca y logo</li>
                    <li>InformaciÃ³n fiscal</li>
                    <li>ConfiguraciÃ³n regional</li>
                    <li>ConfiguraciÃ³n de facturaciÃ³n</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Para confirmar, por favor escribe <code className="font-mono bg-gray-100 dark:bg-dark-700 p-1 rounded text-orange-600 dark:text-orange-400 font-bold border border-gray-200 dark:border-dark-600">{requiredText}</code> en el campo de abajo.
                </p>
                <div>
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className={inputClass}
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
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed dark:disabled:bg-orange-900/50 font-medium transition-colors"
                    >
                        Restaurar ConfiguraciÃ³n
                    </button>
                </div>
            </div>
        </Modal>
    );
};
