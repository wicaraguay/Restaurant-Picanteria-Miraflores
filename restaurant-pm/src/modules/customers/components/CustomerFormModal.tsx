/**
 * @file CustomerFormModal.tsx
 * @description Modal para crear o editar información de clientes.
 */
import React from 'react';
import { Customer } from '../types/customer.types';
import Modal from '../../../components/ui/Modal';
import { Validators } from '../../../utils/validators';
import { useState, useEffect } from 'react';

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/10";

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id'>) => void;
    customer: Customer | null;
    isLoading?: boolean;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer, isLoading }) => {
    const isEditing = customer !== null;
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset errors when modal opens/closes
    useEffect(() => {
        if (!isOpen) setErrors({});
    }, [isOpen]);

    const validate = (formData: FormData): boolean => {
        const newErrors: Record<string, string> = {};
        
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const identification = formData.get('identification') as string;

        const nameVal = Validators.required(name, 'Nombre');
        if (!nameVal.valid) newErrors.name = nameVal.error!;

        const emailVal = Validators.email(email);
        if (!emailVal.valid) newErrors.email = emailVal.error!;

        if (phone) {
            const phoneVal = Validators.phone(phone);
            if (!phoneVal.valid) newErrors.phone = phoneVal.error!;
        }

        if (identification) {
            // Si tiene 10 dígitos es CI, si tiene 13 es RUC
            if (identification.length === 10) {
                const ciVal = Validators.cedula(identification);
                if (!ciVal.valid) newErrors.identification = ciVal.error!;
            } else if (identification.length === 13) {
                const rucVal = Validators.ruc(identification);
                if (!rucVal.valid) newErrors.identification = rucVal.error!;
            } else {
                newErrors.identification = 'Identificación debe tener 10 (Cédula) o 13 (RUC) dígitos';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        if (!validate(formData)) return;

        const customerData: Omit<Customer, 'id'> = {
            name: (formData.get('name') as string).toUpperCase(),
            email: formData.get('email') as string,
            phone: formData.get('phone') as string || '',
            identification: formData.get('identification') as string || '',
            address: formData.get('address') as string || '',
            loyaltyPoints: parseInt(formData.get('loyaltyPoints') as string) || 0,
            lastVisit: new Date().toISOString(),
        };
        onSave(customerData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Perfil de Cliente' : 'Nuevo Registro de Cliente'}>
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo / Razón Social</label>
                        <input type="text" name="name" placeholder="Ej. JUAN PÉREZ" defaultValue={customer?.name || ''} required className={`${inputClass} ${errors.name ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} disabled={isLoading} />
                        {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.name}</p>}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Identificación (RUC/CI)</label>
                            <input type="text" name="identification" placeholder="0999999999001" defaultValue={customer?.identification || ''} className={`${inputClass} ${errors.identification ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} disabled={isLoading} />
                            {errors.identification && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.identification}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Teléfono</label>
                            <input type="tel" name="phone" placeholder="0999999999" defaultValue={customer?.phone || ''} className={`${inputClass} ${errors.phone ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} disabled={isLoading} />
                            {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.phone}</p>}
                        </div>
                    </div>
 
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                        <input type="email" name="email" placeholder="cliente@ejemplo.com" defaultValue={customer?.email || ''} required className={`${inputClass} ${errors.email ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} disabled={isLoading} />
                        {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.email}</p>}
                    </div>
 
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dirección Domiciliaria</label>
                        <input type="text" name="address" placeholder="Calle principal y secundaria" defaultValue={customer?.address || ''} className={inputClass} disabled={isLoading} />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Puntos acumulados</label>
                        <input type="number" name="loyaltyPoints" placeholder="0" defaultValue={customer?.loyaltyPoints || 0} required className={`w-32 ${inputClass}`} disabled={isLoading} />
                    </div>
                </div>

                <div className="flex justify-end pt-6 gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-dark-700 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest transition-all"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className={`px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Procesando...
                            </>
                        ) : (
                            isEditing ? 'Guardar Cambios' : 'Registrar Cliente'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CustomerFormModal;
