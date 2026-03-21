import React, { useState, useEffect } from 'react';
import { Bill } from '../types/billing.types';
import { UserIcon, FileTextIcon, HistoryIcon, TrashIcon, PlusIcon } from '../../../components/ui/Icons';

interface EditBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: any) => Promise<void>;
    bill: Bill | null;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    bill 
}) => {
    const [formData, setFormData] = useState({
        name: '',
        identification: '',
        address: '',
        email: '',
        phone: '',
        items: [] as any[]
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (bill) {
            setFormData({
                name: bill.customerName,
                identification: bill.customerIdentification,
                address: bill.customerAddress || '',
                email: bill.customerEmail || '',
                phone: bill.customerPhone || '',
                items: bill.items.map(item => {
                    const total = item.total || ((item.quantity || 0) * (item.price || 0));
                    const price = item.quantity > 0 ? (total / item.quantity) : item.price;
                    return {
                        ...item,
                        price: price,
                        total: total
                    };
                })
            });
        }
    }, [bill]);

    if (!isOpen || !bill) return null;

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Recalculate item total locally
        if (field === 'quantity' || field === 'price') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
            const price = field === 'price' ? parseFloat(value) || 0 : newItems[index].price;
            newItems[index].total = qty * price;
        }
        
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { name: '', quantity: 1, price: 0, total: 0 }]
        });
    };

    const removeItem = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const calculateTotals = () => {
        const total = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const subtotal = total / 1.15;
        const tax = total - subtotal;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            alert('La factura debe tener al menos un ítem');
            return;
        }
        setIsSaving(true);
        try {
            await onSave(bill.id, {
                ...formData,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total
            });
            onClose();
        } catch (error) {
            console.error('Error saving bill changes:', error);
            alert('Error al guardar los cambios');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 dark:border-dark-700 animate-in zoom-in-95 duration-200 maxHeight-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Editar Factura Completa</h3>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Corrección de datos y detalles para re-envío</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-2xl font-black">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Section 1: Customer Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Datos del Cliente</h4>
                            
                            {/* Identification */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Identificación (RUC/Cédula)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <FileTextIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.identification}
                                        onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white font-bold text-sm"
                                        placeholder="Ej: 0999999999001"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Razón Social / Nombre</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white font-bold text-sm"
                                        placeholder="Ej: Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-transparent uppercase tracking-widest select-none">Extras</h4>
                            
                            {/* Email */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors font-bold flex items-center justify-center w-5 h-5 text-lg">
                                        @
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white font-bold text-sm"
                                        placeholder="ejemplo@correo.com"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dirección</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <HistoryIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white font-bold text-sm"
                                        placeholder="Calle A y Av. B"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Items Detail */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Detalle de Productos</h4>
                            <button 
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-500/20 transition-all"
                            >
                                <PlusIcon className="w-3 h-3" />
                                Añadir Item
                            </button>
                        </div>

                        <div className="border border-gray-100 dark:border-dark-700 rounded-3xl overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 dark:bg-dark-900 border-b border-gray-100 dark:border-dark-700 text-left">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Cant.</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Precio Unit.</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-28 text-right">Total</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                                    {formData.items.map((item, index) => (
                                        <tr key={index} className="bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 outline-none dark:text-white font-bold text-sm py-1"
                                                    placeholder="Nombre del producto"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 outline-none dark:text-white font-bold text-sm py-1"
                                                    step="0.1"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-400 font-bold">$</span>
                                                    <input 
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 outline-none dark:text-white font-bold text-sm py-1"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="dark:text-white font-black text-sm">${(item.total || 0).toFixed(2)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeItem(index)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {formData.items.length === 0 && (
                                <div className="py-8 text-center text-gray-400 font-bold text-sm">No hay ítems en la factura</div>
                            )}
                        </div>

                        {/* Grand Total Footer */}
                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-dark-700 gap-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subtotal</span>
                                <span className="text-xl font-bold text-gray-600 dark:text-gray-400">${totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">IVA (15%)</span>
                                <span className="text-xl font-bold text-gray-600 dark:text-gray-400">${totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-blue-600">Total Factura</span>
                                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">${totals.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 flex items-center gap-4 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-all text-[10px] uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 text-[10px] uppercase tracking-widest"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar y Re-enviar para Autorización'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
