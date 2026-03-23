import React from 'react';
import Modal from '../../../components/ui/Modal';
import { Order } from '../types/order.types';
import { RestaurantConfig } from '../../../types';
import { ClientData } from '../../billing/utils/invoiceGenerator';
import {
    UserIcon,
    MailIcon,
    PhoneIcon,
    MapPinIcon,
    IdentificationIcon,
    CreditCardIcon,
    FileTextIcon,
    UsersIcon,
    PrinterIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ClipboardListIcon
} from '../../../components/ui/Icons';

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
    manualCompleteLabel?: string;
}

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-dark-700 dark:bg-dark-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500";
const labelClass = "flex items-center gap-2 text-[11px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest mb-2 ml-1";

export const BillingModal: React.FC<BillingModalProps> = ({
    isOpen,
    onClose,
    config,
    billingOrder,
    billingData,
    setBillingData,
    searchingIdentity,
    onProcess,
    onManualComplete,
    manualCompleteLabel = "Cerrar sin Facturar"
}) => {
    if (!billingOrder) return null;

    const total = billingOrder.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
    const subtotal = total / 1.15;
    const iva = total - subtotal;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cobro y Facturación" maxWidth="max-w-4xl">
            <div className="bg-white dark:bg-dark-950 -m-6 flex flex-col min-h-0">

                {/* 1. TOP SUMMARY BAR */}
                <div className="bg-blue-600 p-8 pt-10 text-white rounded-b-[2rem] shadow-xl shadow-blue-500/20 z-10">
                    <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Monto de la Orden</p>
                            <h2 className="text-5xl font-black tracking-tighter">${total.toFixed(2)}</h2>
                        </div>
                        <button
                            onClick={() => setBillingData({
                                identification: '9999999999999',
                                name: 'CONSUMIDOR FINAL',
                                email: 'consumidor@final.com',
                                address: 'S/N',
                                phone: '9999999999',
                                paymentMethod: '01'
                            })}
                            className="bg-white text-blue-600 px-6 py-3 rounded-2xl transition-all active:scale-95 flex items-center gap-2 text-xs font-black uppercase shadow-lg shadow-white/10"
                        >
                            <UsersIcon className="w-5 h-5" />
                            Consumidor Final
                        </button>
                    </div>
                </div>

                {/* 2. SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto max-h-[70vh] p-6 sm:p-10 custom-scrollbar">
                    <div className="max-w-2xl mx-auto space-y-12">

                        {/* Compact Summary Info (Visual Check) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-dark-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-dark-800">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase" data-testid="preview-name">{billingData.name || 'SIN CLIENTE'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <IdentificationIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-500">{billingData.identification || '---'}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {billingData.phone && (
                                    <div className="flex items-center gap-3">
                                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500">{billingData.phone}</span>
                                    </div>
                                )}
                                {billingData.address && (
                                    <div className="flex items-center gap-3">
                                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase truncate">{billingData.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b dark:border-dark-800 pb-4">
                                <FileTextIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Completar Datos</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="sm:col-span-2">
                                    <label htmlFor="identification" className={labelClass}>RUC / Cédula / Pasaporte</label>
                                    <input
                                        id="identification"
                                        type="text"
                                        value={billingData.identification}
                                        onChange={e => setBillingData({ ...billingData, identification: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ingrese Identificación"
                                    />
                                    {searchingIdentity && <p className="text-[10px] text-blue-500 mt-2 font-black animate-pulse px-1">Consultando SRI...</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="name" className={labelClass}>Nombre completo / Razón Social</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={billingData.name}
                                        onChange={e => setBillingData({ ...billingData, name: e.target.value.toUpperCase() })}
                                        className={inputClass}
                                        placeholder="Nombre del Cliente"
                                    />
                                </div>

                                <div className="sm:col-span-1">
                                    <label htmlFor="email" className={labelClass}>Correo Electrónico</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={billingData.email}
                                        onChange={e => setBillingData({ ...billingData, email: e.target.value })}
                                        className={inputClass}
                                        placeholder="email@ejemplo.com"
                                    />
                                </div>

                                <div className="sm:col-span-1">
                                    <label htmlFor="phone" className={labelClass}>Teléfono Móvil</label>
                                    <input
                                        id="phone"
                                        type="text"
                                        value={billingData.phone}
                                        onChange={e => setBillingData({ ...billingData, phone: e.target.value })}
                                        className={inputClass}
                                        placeholder="09XXXXXXXX"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="address" className={labelClass}>Dirección de Domicilio</label>
                                    <input
                                        id="address"
                                        type="text"
                                        value={billingData.address}
                                        onChange={e => setBillingData({ ...billingData, address: e.target.value.toUpperCase() })}
                                        className={inputClass}
                                        placeholder="Dirección completa"
                                    />
                                </div>

                                <div className="sm:col-span-2 relative">
                                    <label htmlFor="paymentMethod" className={labelClass}>Método de Pago</label>
                                    <select
                                        id="paymentMethod"
                                        value={billingData.paymentMethod}
                                        onChange={e => setBillingData({ ...billingData, paymentMethod: e.target.value })}
                                        className={`${inputClass} appearance-none pr-10`}
                                    >
                                        <option value="01">EFECTIVO / SIN UTILIZACIÓN DEL SISTEMA FINANCIERO</option>
                                        <option value="16">TARJETA DE DÉBITO</option>
                                        <option value="19">TARJETA DE CRÉDITO</option>
                                        <option value="20">TRANSFERENCIA / OTROS</option>
                                    </select>
                                    <div className="absolute right-4 bottom-4 pointer-events-none text-gray-400">
                                        <ChevronDownIcon className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Details (Secondary) */}
                        <div className="space-y-4 pt-4 pb-4">
                            <div className="flex items-center gap-3 border-b dark:border-dark-800 pb-4">
                                <ClipboardListIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Detalles de Orden</h3>
                            </div>
                            <div className="space-y-2">
                                {billingOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-2 px-1 border-b border-gray-50 dark:border-dark-900">
                                        <div className="flex gap-4">
                                            <span className="font-black text-blue-500 w-4">{item.quantity}</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase">{item.name}</span>
                                        </div>
                                        <span className="font-black text-gray-900 dark:text-white">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals Breakdown Section (Added for clarity and testing) */}
                            <div className="mt-6 bg-gray-50 dark:bg-dark-900/50 p-6 rounded-3xl space-y-3 border border-gray-100 dark:border-dark-800">
                                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span>Subtotal 15%</span>
                                    <span data-testid="preview-subtotal">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span>IVA 15%</span>
                                    <span data-testid="preview-iva">${iva.toFixed(2)}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-200 dark:border-dark-700 flex justify-between items-center">
                                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Total a Pagar</span>
                                    <span className="text-xl font-black text-blue-600 dark:text-blue-400" data-testid="preview-total">${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FOOTER ACTIONS */}
                <div className="bg-gray-50 dark:bg-dark-900/50 p-6 sm:p-10 border-t dark:border-dark-800">
                    <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onProcess}
                            disabled={!billingData.identification || !billingData.name}
                            className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3 group"
                        >
                            <CheckCircleIcon className="w-6 h-6" />
                            Confirmar y Facturar
                        </button>
                        <button
                            onClick={onManualComplete}
                            className="flex-1 py-5 bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-[10px] uppercase border border-gray-200 dark:border-dark-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            {manualCompleteLabel}
                        </button>
                        <button
                            onClick={onClose}
                            className="py-5 px-6 text-gray-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>

            </div>
        </Modal>
    );
};