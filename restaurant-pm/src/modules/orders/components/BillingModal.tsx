import React from 'react';
import Modal from '../../../components/ui/Modal';
import { Order } from '../types/order.types';
import { RestaurantConfig } from '../../../types';
import { ClientData } from '../../billing/utils/invoiceGenerator';

interface BillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: RestaurantConfig;
    billingOrder: Order | null;
    billingData: ClientData;
    setBillingData: (data: ClientData) => void;
    searchingIdentity: boolean;
    onProcess: () => void;
    onManualComplete: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export const BillingModal: React.FC<BillingModalProps> = ({
    isOpen,
    onClose,
    config,
    billingOrder,
    billingData,
    setBillingData,
    searchingIdentity,
    onProcess,
    onManualComplete
}) => {
    if (!billingOrder) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Emitir Factura Electrónica (SRI)" maxWidth="max-w-4xl">
            <div className="flex flex-col md:flex-row gap-6 p-2">
                {/* Left Column: Invoice Preview (Visual Representation) */}
                <div className="flex-1 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 shadow-sm rounded-sm p-6 text-xs text-gray-800 dark:text-gray-300 font-mono relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[100px] text-gray-100 dark:text-dark-800 -rotate-45 pointer-events-none font-sans font-bold opacity-50">
                        VISTA PREVIA
                    </div>

                    <div className="relative mb-6 flex justify-between items-start border-b border-gray-300 dark:border-dark-600 pb-4">
                        <div>
                            {config.fiscalLogo || config.logo ? (
                                <div className="mb-6 flex justify-center">
                                    <img
                                        src={config.fiscalLogo || config.logo}
                                        alt="Logo"
                                        className="max-w-[240px] max-h-[120px] w-auto h-auto object-contain rounded-lg"
                                    />
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-gray-200 dark:bg-dark-700 rounded mb-4 flex items-center justify-center text-3xl mx-auto">🍽️</div>
                            )}
                            <h2 className="font-bold text-lg uppercase text-gray-900 dark:text-white leading-tight">{config.name || 'NOMBRE COMERCIAL'}</h2>
                            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">{config.businessName || 'CLIENTE'}</h3>
                            <p>{config.address || 'Dirección Matriz, Ciudad, Ecuador'}</p>
                            <p>RUC: {config.ruc || '9999999999001'}</p>
                            <p>{config.fiscalEmail || config.email || 'correo@ejemplo.com'}</p>
                            <p>Obligado a llevar contabilidad: {config.obligadoContabilidad ? 'SI' : 'NO'}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="font-bold text-sm">FACTURA</h3>
                            <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">No. {config.billing?.establishment || '001'}-{config.billing?.emissionPoint || '001'}-{((config.billing?.currentSequenceFactura || 0) + 1).toString().padStart(9, '0')}</p>
                            <p><span className="font-bold">FECHA EMISIÓN:</span> {new Date().toLocaleDateString('es-EC')}</p>
                        </div>
                    </div>

                    <div className="relative mb-4 border border-gray-800 dark:border-gray-500 rounded p-3 bg-transparent text-[10px]">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span className="font-bold">Cliente:</span> {billingData.name || 'ANÓNIMO'}</div>
                            <div><span className="font-bold">RUC/CI:</span> {billingData.identification || '9999999999999'}</div>
                            <div><span className="font-bold">Dirección:</span> {billingData.address || 'S/N'}</div>
                            <div><span className="font-bold">Teléfono:</span> {billingData.phone || 'S/N'}</div>
                            <div className="col-span-2"><span className="font-bold">Forma de Pago:</span> {
                                billingData.paymentMethod === '01' ? 'SIN UTILIZACION DEL SISTEMA FINANCIERO' :
                                billingData.paymentMethod === '16' ? 'TARJETA DE DEBITO' :
                                billingData.paymentMethod === '19' ? 'TARJETA DE CREDITO' :
                                billingData.paymentMethod === '20' ? 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO' : 'EFECTIVO'
                            }</div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="border border-gray-200 dark:border-dark-700 rounded-sm overflow-hidden mb-4">
                            <table className="w-full text-[10px]">
                                <thead className="bg-gray-100 dark:bg-dark-800 text-left font-bold border-b border-gray-200 dark:border-dark-700">
                                    <tr>
                                        <th className="px-2 py-1">Cant</th>
                                        <th className="px-2 py-1">Descripción</th>
                                        <th className="px-2 py-1 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
                                    {billingOrder.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-2 py-1">{item.quantity}</td>
                                            <td className="px-2 py-1">{item.name}</td>
                                            <td className="px-2 py-1 text-right">${((item.price || 0) * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end">
                            <div className="w-1/2 border border-gray-200 dark:border-dark-700 rounded-sm">
                                <table className="w-full text-[10px]">
                                    <tbody>
                                        <tr>
                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">TOTAL</td>
                                            <td className="px-2 py-1 text-right font-bold">${billingOrder.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Client Data Form */}
                <div className="md:w-1/3 space-y-4 border-l dark:border-dark-700 md:pl-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Datos del Cliente</h3>
                    <button
                        onClick={() => setBillingData({
                            identification: '9999999999999',
                            name: 'CONSUMIDOR FINAL',
                            email: 'consumidor@final.com',
                            address: 'S/N',
                            phone: '9999999999',
                            paymentMethod: '01'
                        })}
                        className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-dark-600 transition-colors"
                    >
                        Usar "Consumidor Final"
                    </button>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Identificación</label>
                            <input
                                type="text"
                                value={billingData.identification}
                                onChange={e => setBillingData({ ...billingData, identification: e.target.value })}
                                className={inputClass}
                                placeholder="RUC / Cédula"
                            />
                            {searchingIdentity && <p className="text-[10px] text-blue-500 mt-1 animate-pulse">Buscando datos...</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Nombre / Razón Social</label>
                            <input
                                type="text"
                                value={billingData.name}
                                onChange={e => setBillingData({ ...billingData, name: e.target.value.toUpperCase() })}
                                className={inputClass}
                                placeholder="Nombre del cliente"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={billingData.email}
                                onChange={e => setBillingData({ ...billingData, email: e.target.value })}
                                className={inputClass}
                                placeholder="cliente@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Teléfono</label>
                            <input
                                type="text"
                                value={billingData.phone}
                                onChange={e => setBillingData({ ...billingData, phone: e.target.value })}
                                className={inputClass}
                                placeholder="0999999999"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Dirección</label>
                            <input
                                type="text"
                                value={billingData.address}
                                onChange={e => setBillingData({ ...billingData, address: e.target.value.toUpperCase() })}
                                className={inputClass}
                                placeholder="Av. Amazonas y Colón"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Forma de Pago</label>
                            <select
                                value={billingData.paymentMethod}
                                onChange={e => setBillingData({ ...billingData, paymentMethod: e.target.value })}
                                className={inputClass}
                            >
                                <option value="01">01 - SIN UTILIZACION DEL SISTEMA FINANCIERO</option>
                                <option value="16">16 - TARJETA DE DEBITO</option>
                                <option value="19">19 - TARJETA DE CREDITO</option>
                                <option value="20">20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 space-y-2">
                        <button
                            onClick={onProcess}
                            disabled={!billingData.identification || !billingData.name}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                        >
                            Emitir Factura
                        </button>
                        <button
                            onClick={onManualComplete}
                            className="w-full py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-dark-600 transition-all border border-gray-300 dark:border-dark-600"
                        >
                            Completar sin Factura
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
