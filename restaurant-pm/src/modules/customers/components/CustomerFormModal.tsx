/**
 * @file CustomerFormModal.tsx
 * @description Modal para crear o editar información de clientes.
 */
import React from 'react';
import { Customer } from '../types/customer.types';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id'>) => void;
    customer: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const isEditing = customer !== null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const customerData: Omit<Customer, 'id'> = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            loyaltyPoints: parseInt(formData.get('loyaltyPoints') as string) || 0,
            lastVisit: new Date().toISOString().split('T')[0],
        };
        onSave(customerData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Cliente' : 'Añadir Cliente'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" placeholder="Nombre" defaultValue={customer?.name || ''} required className={inputClass} />
                <input type="email" name="email" placeholder="Email" defaultValue={customer?.email || ''} required className={inputClass} />
                <input type="tel" name="phone" placeholder="Teléfono" defaultValue={customer?.phone || ''} required className={inputClass} />
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium dark:text-gray-300">Puntos:</label>
                    <input type="number" name="loyaltyPoints" placeholder="0" defaultValue={customer?.loyaltyPoints || 0} required className={`w-24 ${inputClass}`} />
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default CustomerFormModal;
