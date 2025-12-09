
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Order, OrderStatus, Bill, SetState, MenuItem } from '../types';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import Modal from './Modal';
import { FileTextIcon, PrinterIcon, SettingsIcon, BluetoothIcon } from './Icons';

interface BillingManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
    bills: Bill[];
    setBills: SetState<Bill[]>;
    menuItems: MenuItem[];
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

const Card = ({ title, children, actions }: { title: string, children?: React.ReactNode, actions?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 h-full">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-light-background">{title}</h2>
            {actions && <div>{actions}</div>}
        </div>
        {children}
    </div>
);

// --- SRI Validation Logic (Robust Algorithm) ---
const validateEcuadorianID = (id: string): { isValid: boolean, type: 'RUC' | 'Cédula' | 'Consumidor Final' | 'Pasaporte' | 'Desconocido' } => {
    // 1. Basic format checks
    if (!id || typeof id !== 'string') return { isValid: false, type: 'Desconocido' };

    // Consumidor Final
    if (id === '9999999999999') return { isValid: true, type: 'Consumidor Final' };

    // Pasaporte logic (Simple heuristic: letters or irregular length not 10/13)
    if (!/^\d+$/.test(id)) {
        if (id.length >= 5) return { isValid: true, type: 'Pasaporte' };
        return { isValid: false, type: 'Desconocido' };
    }

    const len = id.length;
    if (len !== 10 && len !== 13) {
        // If it's numeric but not 10 or 13, and > 5, assume passport (foreign id)
        if (len > 5 && len < 20) return { isValid: true, type: 'Pasaporte' };
        return { isValid: false, type: 'Desconocido' };
    }

    const province = parseInt(id.substring(0, 2), 10);
    const thirdDigit = parseInt(id.substring(2, 3), 10);
    const digits = id.split('').map(Number);

    // 2. Province Validation (01-24, 30 for Foreigners)
    if (!((province >= 1 && province <= 24) || province === 30)) {
        return { isValid: false, type: 'Desconocido' };
    }

    // --- ALGORITHMS ---

    // Algorithm Modulo 10 (Cedula / RUC Persona Natural)
    const checkModulo10 = (d: number[]) => {
        const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            let val = d[i] * coef[i];
            sum += val >= 10 ? val - 9 : val;
        }
        let result = sum % 10 === 0 ? 0 : 10 - (sum % 10);
        return result === d[9];
    };

    // Algorithm Modulo 11 (Sociedades)
    const checkModulo11 = (d: number[], coef: number[], checkIndex: number) => {
        let sum = 0;
        for (let i = 0; i < coef.length; i++) {
            sum += d[i] * coef[i];
        }
        let remainder = sum % 11;
        let result = remainder === 0 ? 0 : 11 - remainder;

        // If result is 10, strictly invalid in Modulo 11 for RUCs
        if (result === 10) return false;

        return result === d[checkIndex];
    };

    // 3. Classification based on 3rd Digit

    // CASO A: Persona Natural (0, 1, 2, 3, 4, 5)
    if (thirdDigit < 6) {
        if (checkModulo10(digits)) {
            // Is it Cedula or RUC?
            if (len === 10) return { isValid: true, type: 'Cédula' };
            if (len === 13) {
                // RUC Natural must end in 001 (or greater sequence)
                const establishment = parseInt(id.substring(10, 13), 10);
                if (establishment >= 1) return { isValid: true, type: 'RUC' };
            }
        }
    }
    // CASO B: Sociedad Pública (6)
    else if (thirdDigit === 6) {
        // Must be RUC (13 digits)
        if (len !== 13) return { isValid: false, type: 'Desconocido' };

        // Check Digit is at index 8 (9th digit)
        const coef = [3, 2, 7, 6, 5, 4, 3, 2];
        if (checkModulo11(digits, coef, 8)) {
            const establishment = parseInt(id.substring(9, 13), 10); // Last 4 digits
            if (establishment >= 1) return { isValid: true, type: 'RUC' };
        }
    }
    // CASO C: Sociedad Privada (9)
    else if (thirdDigit === 9) {
        // Must be RUC (13 digits)
        if (len !== 13) return { isValid: false, type: 'Desconocido' };

        // Check Digit is at index 9 (10th digit)
        const coef = [4, 3, 2, 7, 6, 5, 4, 3, 2];
        if (checkModulo11(digits, coef, 9)) {
            const establishment = parseInt(id.substring(10, 13), 10);
            if (establishment >= 1) return { isValid: true, type: 'RUC' };
        }
    }

    return { isValid: false, type: 'Desconocido' };
};

// --- ESC/POS Encoder Helper (Simplified) ---
class EscPosEncoder {
    private buffer: number[] = [];

    initialize() {
        this.buffer.push(0x1B, 0x40); // ESC @
        return this;
    }

    align(align: 'left' | 'center' | 'right') {
        this.buffer.push(0x1B, 0x61); // ESC a
        if (align === 'center') this.buffer.push(1);
        else if (align === 'right') this.buffer.push(2);
        else this.buffer.push(0);
        return this;
    }

    text(content: string) {
        // Simple ASCII encoding. 
        for (let i = 0; i < content.length; i++) {
            let code = content.charCodeAt(i);
            this.buffer.push(code > 255 ? 63 : code);
        }
        return this;
    }

    newline() {
        this.buffer.push(0x0A); // LF
        return this;
    }

    bold(enable: boolean) {
        this.buffer.push(0x1B, 0x45, enable ? 1 : 0); // ESC E n
        return this;
    }

    cut() {
        this.buffer.push(0x1D, 0x56, 66, 0); // GS V B n
        return this;
    }

    encode(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}


const BillingManagement: React.FC<BillingManagementProps> = ({ orders, setOrders, bills, setBills, menuItems }) => {
    // Usar configuración del contexto
    const { config, updateConfig } = useRestaurantConfig();
    const billingConfig = {
        establishment: config.billing.establishment,
        emissionPoint: config.billing.emissionPoint,
        currentSequenceFactura: config.billing.currentSequenceFactura,
        currentSequenceNotaVenta: config.billing.currentSequenceNotaVenta,
        myRuc: config.ruc,
        myBusinessName: config.businessName,
        myAddress: config.address,
        myRegime: config.billing.regime
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Bluetooth State
    const [btDevice, setBtDevice] = useState<any>(null);
    const [btCharacteristic, setBtCharacteristic] = useState<any>(null);
    const [isBtConnecting, setIsBtConnecting] = useState(false);
    const [btError, setBtError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<{
        identification: string;
        customerName: string;
        email: string;
        address: string;
        docType: 'Factura' | 'Nota de Venta';
        idType: string;
        isValidId: boolean;
    }>({
        identification: '',
        customerName: '',
        email: '',
        address: '',
        docType: 'Factura',
        idType: '',
        isValidId: false
    });

    // Filter orders
    const billableOrders = orders.filter(o => o.status === OrderStatus.Completed && !o.billed);

    // Effect to determine default DocType based on Config Regime
    useEffect(() => {
        if (billingConfig.myRegime === 'RIMPE - Negocio Popular') {
            setFormData(prev => ({ ...prev, docType: 'Nota de Venta' }));
        } else {
            setFormData(prev => ({ ...prev, docType: 'Factura' }));
        }
    }, [billingConfig.myRegime]);

    const openBillingModal = (order: Order) => {
        setSelectedOrder(order);
        const existingCustomer = orders.find(o => o.id === order.id)?.customerName;

        setFormData({
            identification: '9999999999999',
            customerName: existingCustomer || '',
            email: '',
            address: '',
            docType: billingConfig.myRegime === 'RIMPE - Negocio Popular' ? 'Nota de Venta' : 'Factura',
            idType: 'Consumidor Final',
            isValidId: true
        });
        setIsModalOpen(true);
    };

    const handleIdChange = (val: string) => {
        const { isValid, type } = validateEcuadorianID(val);

        let newDocType = formData.docType;
        // Auto-switch to Factura if it's a valid RUC and we are not Rimpe Popular
        if (isValid && type === 'RUC' && billingConfig.myRegime !== 'RIMPE - Negocio Popular') {
            newDocType = 'Factura';
        }

        setFormData(prev => ({
            ...prev,
            identification: val,
            isValidId: isValid,
            idType: type,
            docType: newDocType
        }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDocumentNumber = (estab: string, pto: string, seq: number) => {
        return `${estab}-${pto}-${seq.toString().padStart(9, '0')}`;
    };

    const getNextSequence = (type: 'Factura' | 'Nota de Venta') => {
        return type === 'Factura' ? billingConfig.currentSequenceFactura : billingConfig.currentSequenceNotaVenta;
    };

    // --- Bluetooth Connection Logic ---
    const connectBluetooth = async () => {
        // @ts-ignore
        if (!navigator.bluetooth) {
            setBtError("Este navegador no soporta Web Bluetooth. Usa Chrome o Edge.");
            return;
        }

        setIsBtConnecting(true);
        setBtError(null);
        try {
            // @ts-ignore
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            if (!device) throw new Error("No se seleccionó dispositivo");

            const server = await device.gatt.connect();

            let service;
            try {
                service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            } catch (e) {
                console.error("Service lookup failed", e);
                throw new Error("Conectado, pero no se encontró el servicio de impresión estándar (18f0).");
            }

            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            setBtDevice(device);
            setBtCharacteristic(characteristic);

            device.addEventListener('gattserverdisconnected', () => {
                setBtDevice(null);
                setBtCharacteristic(null);
            });

        } catch (err: any) {
            if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
                console.log("Bluetooth selection cancelled by user.");
                return;
            }

            console.error(err);
            let msg = err.message || "Error desconocido";
            setBtError("Error Bluetooth: " + msg);
        } finally {
            setIsBtConnecting(false);
        }
    };

    const sendToBluetoothPrinter = async (bill: Bill) => {
        if (!btCharacteristic) {
            alert("Impresora Bluetooth no conectada");
            return;
        }

        try {
            const encoder = new EscPosEncoder();

            encoder
                .initialize()
                .align('center')
                .bold(true)
                .text(billingConfig.myBusinessName).newline()
                .bold(false)
                .text(`RUC: ${billingConfig.myRuc}`).newline()
                .text(billingConfig.myAddress.substring(0, 30)).newline()
                .text("--------------------------------").newline()
                .bold(true).text(bill.documentType.toUpperCase()).bold(false).newline()
                .text(`No: ${bill.documentNumber}`).newline()
                .text(`Fecha: ${bill.date}`).newline()
                .text("--------------------------------").newline()
                .align('left')
                .text(`Cliente: ${bill.customerName}`).newline()
                .text(`ID: ${bill.customerIdentification}`).newline();

            bill.items.forEach(item => {
                encoder.text(`${item.quantity}x ${item.name}`).newline();
                encoder.align('right').text(`$${item.total.toFixed(2)}`).newline().align('left');
            });

            encoder.text("--------------------------------").newline()
                .align('right')
                .text(`SUBTOTAL: $${bill.subtotal.toFixed(2)}`).newline()
                .text(`IVA: $${bill.tax.toFixed(2)}`).newline()
                .bold(true).text(`TOTAL: $${bill.total.toFixed(2)}`).bold(false).newline()
                .align('center')
                .newline()
                .text("Gracias por su compra").newline()
                .newline()
                .newline()
                .newline();

            const data = encoder.encode();
            const chunkSize = 100;

            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await btCharacteristic.writeValue(chunk);
            }

        } catch (e: any) {
            alert("Error enviando datos: " + e.message);
            setBtDevice(null);
        }
    };

    const printThermalTicket = (bill: Bill) => {
        if (btDevice && btCharacteristic) {
            sendToBluetoothPrinter(bill);
            return;
        }

        const printWindow = window.open('', 'PRINT', 'height=600,width=400');
        if (!printWindow) return;

        const itemsHtml = bill.items.map(item => `
            <div class="row">
                <span>${item.quantity}x ${item.name.substring(0, 15)}</span>
                <span>$${item.total.toFixed(2)}</span>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Ticket ${bill.documentNumber}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 300px; font-size: 12px; color: black; margin: 0; padding: 10px; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h3 { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
                    .header p { margin: 2px 0; }
                    .divider { border-top: 1px dashed black; margin: 5px 0; }
                    .info p { margin: 2px 0; }
                    .row { display: flex; justify-content: space-between; margin: 2px 0; }
                    .total-section { margin-top: 10px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; }
                    .footer { margin-top: 20px; text-align: center; font-size: 10px; }
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h3>${billingConfig.myBusinessName}</h3>
                    <p>RUC: ${billingConfig.myRuc}</p>
                    <p>${billingConfig.myAddress}</p>
                    <p><strong>${bill.documentType.toUpperCase()}</strong></p>
                    <p>No. ${bill.documentNumber}</p>
                </div>
                
                <div class="divider"></div>
                
                <div class="info">
                    <p><strong>Fecha:</strong> ${bill.date}</p>
                    <p><strong>Cliente:</strong> ${bill.customerName}</p>
                    <p><strong>${bill.customerIdentification.length === 13 ? 'RUC' : 'CI'}:</strong> ${bill.customerIdentification}</p>
                    <p><strong>Dir:</strong> ${bill.customerAddress || 'S/D'}</p>
                </div>

                <div class="divider"></div>
                
                <div class="items">
                    ${itemsHtml}
                </div>

                <div class="divider"></div>

                <div class="total-section">
                    <div class="row"><span>Subtotal:</span><span>$${bill.subtotal.toFixed(2)}</span></div>
                    <div class="row"><span>IVA (15%):</span><span>$${bill.tax.toFixed(2)}</span></div>
                    <div class="total-row"><span>TOTAL:</span><span>$${bill.total.toFixed(2)}</span></div>
                </div>

                <div class="divider"></div>

                <div class="footer">
                    <p>Regimen: ${bill.regime}</p>
                    <p>Autorización SRI: PENDIENTE (Simulación)</p>
                    <p>Gracias por su compra</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleGenerateBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        if (!formData.isValidId) return alert("La identificación ingresada no es válida según el algoritmo del SRI. Verifique que el RUC/CI sea correcto.");

        const billItems = selectedOrder.items.map(item => {
            const menuItem = menuItems.find(m => m.name === item.name);
            const price = menuItem ? menuItem.price : 0;
            return {
                name: item.name,
                quantity: item.quantity,
                price: price,
                total: price * item.quantity
            };
        });

        const rawSubtotal = billItems.reduce((sum, item) => sum + item.total, 0);

        let taxRate = 0;
        if (formData.docType === 'Factura') {
            taxRate = 0.15;
        } else {
            taxRate = 0;
        }

        const tax = rawSubtotal * taxRate;
        const total = rawSubtotal + tax;

        const currentSeq = getNextSequence(formData.docType);
        const docNumber = formatDocumentNumber(billingConfig.establishment, billingConfig.emissionPoint, currentSeq);

        const newBill: Bill = {
            id: Date.now().toString(), // Will be replaced by backend ID or ignored
            documentNumber: docNumber,
            orderId: selectedOrder.id,
            date: new Date().toISOString().split('T')[0],
            documentType: formData.docType,
            customerName: formData.customerName,
            customerIdentification: formData.identification,
            customerAddress: formData.address,
            customerEmail: formData.email,
            items: billItems,
            subtotal: rawSubtotal,
            tax: tax,
            total: total,
            regime: billingConfig.myRegime
        };

        try {
            const savedBill = await api.bills.create(newBill);
            setBills(prev => [savedBill, ...prev]);

            // Mark order as billed in backend if needed (optional if backend handles it)
            // But we must update local state to remove from pending
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, billed: true } : o));

            // Actualizar secuenciales en el contexto (Backend sync handled separately via config update)
            if (formData.docType === 'Factura') {
                updateConfig({
                    billing: {
                        ...config.billing,
                        currentSequenceFactura: config.billing.currentSequenceFactura + 1
                    }
                });
            } else {
                updateConfig({
                    billing: {
                        ...config.billing,
                        currentSequenceNotaVenta: config.billing.currentSequenceNotaVenta + 1
                    }
                });
            }

            setIsModalOpen(false);
            printThermalTicket(savedBill);
        } catch (error) {
            console.error('Error generating bill:', error);
            alert('Error al emitir la factura. Intente nuevamente.');
        }
    };

    return (
        <div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Emitir Documento">
                <form onSubmit={handleGenerateBill} className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-800 dark:text-blue-200">Nº: <strong>{formatDocumentNumber(billingConfig.establishment, billingConfig.emissionPoint, getNextSequence(formData.docType))}</strong></span>
                            <span className="text-blue-800 dark:text-blue-200">Tipo: <strong>{formData.docType}</strong></span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Identificación</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="RUC / CI"
                                    value={formData.identification}
                                    onChange={e => handleIdChange(e.target.value)}
                                    required
                                    maxLength={13}
                                    className={`${inputClass} ${formData.isValidId ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20' : 'border-red-300 focus:border-red-500 focus:ring-red-500/20'}`}
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    {formData.isValidId ? (
                                        <span className="text-[10px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded-full dark:bg-green-900/40 dark:text-green-300 uppercase">{formData.idType}</span>
                                    ) : (
                                        <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full dark:bg-red-900/40 dark:text-red-300">Inválido</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Nombre Cliente</label>
                            <input
                                type="text"
                                value={formData.customerName}
                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                required
                                className={inputClass}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Email (Opcional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Dirección</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end pt-6 gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium transition-colors">Cancelar</button>
                        <button type="submit" disabled={!formData.isValidId} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-500/30">Emitir & Imprimir</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background hidden lg:block">Facturación SRI</h1>

                <button
                    onClick={connectBluetooth}
                    disabled={isBtConnecting}
                    className={`w-full sm:w-auto flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm
                        ${btDevice
                            ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-dark-800 dark:text-white dark:border-dark-600'}`}
                >
                    <BluetoothIcon className="w-5 h-5 mr-2" />
                    {isBtConnecting ? 'Conectando...' : btDevice ? `Conectado: ${btDevice.name || 'Impresora'}` : 'Conectar Impresora'}
                </button>
            </div>

            {btError && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50 flex justify-between items-center">
                    <span>{btError}</span>
                    <button onClick={() => setBtError(null)} className="ml-2 font-bold p-1">&times;</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card title="Pedidos Pendientes">
                    {billableOrders.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No hay pedidos por facturar.</p>
                    ) : (
                        <div className="space-y-3">
                            {billableOrders.map(order => (
                                <div key={order.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors dark:border-dark-700 dark:bg-dark-700/30 dark:hover:bg-dark-700">
                                    <div className="mb-3 sm:mb-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white">#{order.id.slice(-6)}</span>
                                            <span className="text-gray-500">- {order.customerName}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                            {formatCurrency(order.items.reduce((acc, i) => acc + (menuItems.find(m => m.name === i.name)?.price || 0) * i.quantity, 0))}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openBillingModal(order)}
                                        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center shadow-sm"
                                    >
                                        <FileTextIcon className="w-4 h-4 mr-2" /> Emitir Factura
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Datos del Emisor">
                    <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                            <span className="text-gray-500 dark:text-gray-400">Razón Social</span>
                            <span className="font-medium text-right dark:text-white">{billingConfig.myBusinessName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                            <span className="text-gray-500 dark:text-gray-400">RUC</span>
                            <span className="font-medium text-right dark:text-white">{billingConfig.myRuc}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-dark-600">
                            <span className="text-gray-500 dark:text-gray-400">Régimen</span>
                            <span className="font-medium text-right text-blue-600 dark:text-blue-400">{billingConfig.myRegime}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="text-gray-500 dark:text-gray-400">Próx. Secuencial</span>
                            <span className="font-mono bg-white border border-gray-200 px-2 py-1 rounded text-sm dark:bg-dark-800 dark:border-dark-600 dark:text-white">
                                {billingConfig.myRegime === 'RIMPE - Negocio Popular'
                                    ? formatDocumentNumber(billingConfig.establishment, billingConfig.emissionPoint, billingConfig.currentSequenceNotaVenta)
                                    : formatDocumentNumber(billingConfig.establishment, billingConfig.emissionPoint, billingConfig.currentSequenceFactura)
                                }
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="Historial de Documentos">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-dark-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">No. Documento</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-4">No se han emitido documentos aún.</td></tr>
                            ) : (
                                bills.map(bill => (
                                    <tr key={bill.id} className="bg-white border-b dark:bg-dark-800 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                                        <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{bill.documentNumber}</td>
                                        <td className="px-6 py-4">{bill.date}</td>
                                        <td className="px-6 py-4">{bill.customerName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${bill.documentType === 'Factura' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                                                {bill.documentType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">{formatCurrency(bill.total)}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => printThermalTicket(bill)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                                title="Reimprimir Ticket"
                                            >
                                                <PrinterIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards for History */}
                <div className="lg:hidden space-y-4">
                    {bills.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay historial.</p>
                    ) : (
                        bills.map(bill => (
                            <div key={bill.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 dark:bg-dark-700/30 dark:border-dark-600 relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{bill.documentNumber}</p>
                                        <p className="text-xs text-gray-500">{bill.date}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${bill.documentType === 'Factura' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                                        {bill.documentType}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <p className="text-sm font-medium text-gray-800 dark:text-light-background">{bill.customerName}</p>
                                    <p className="text-xs text-gray-500">{bill.customerIdentification}</p>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-dark-600">
                                    <span className="font-bold text-green-600 dark:text-green-400 text-lg">{formatCurrency(bill.total)}</span>
                                    <button
                                        onClick={() => printThermalTicket(bill)}
                                        className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                        <PrinterIcon className="w-4 h-4 mr-1" /> Imprimir
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};

export default BillingManagement;
