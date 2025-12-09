/**
 * @file EmitterInfo.tsx
 * @description Información del emisor de facturas
 * 
 * @purpose
 * Muestra datos del negocio (RUC, razón social, régimen, secuencial).
 * 
 * @connections
 * - Usado por: BillingManagement
 * - Usa: RestaurantConfigContext
 * 
 * @layer Components - UI
 */

import React from 'react';

interface EmitterInfoProps {
    businessName: string;
    ruc: string;
    regime: string;
    nextSequence: string;
}

const EmitterInfo: React.FC<EmitterInfoProps> = ({ businessName, ruc, regime, nextSequence }) => {
    return (
        <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                <span className="text-gray-500 dark:text-gray-400">Razón Social</span>
                <span className="font-medium text-right dark:text-white">{businessName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                <span className="text-gray-500 dark:text-gray-400">RUC</span>
                <span className="font-medium text-right dark:text-white">{ruc}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                <span className="text-gray-500 dark:text-gray-400">Régimen</span>
                <span className="font-medium text-right text-blue-600 dark:text-blue-400">{regime}</span>
            </div>
            <div className="flex justify-between pt-1">
                <span className="text-gray-500 dark:text-gray-400">Próx. Secuencial</span>
                <span className="font-mono bg-white border border-gray-200 px-2 py-1 rounded text-sm dark:bg-dark-800 dark:border-dark-600 dark:text-white">
                    {nextSequence}
                </span>
            </div>
        </div>
    );
};

export default EmitterInfo;
