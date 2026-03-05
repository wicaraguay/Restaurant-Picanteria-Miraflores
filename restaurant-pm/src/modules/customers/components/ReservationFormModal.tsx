/**
 * @file ReservationFormModal.tsx
 * @description Modal para crear o editar reservas de clientes.
 */
import React from 'react';
import { Reservation } from '../types/customer.types';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reservation: Omit<Reservation, 'id'>) => void;
    reservation: Reservation | null;
}

export const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSave, reservation }) => {
    const isEditing = reservation !== null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const reservationData: Omit<Reservation, 'id'> = {
            name: formData.get('name') as string,
            partySize: parseInt(formData.get('partySize') as string),
            time: formData.get('time') as string,
            status: formData.get('status') as 'Confirmada' | 'Pendiente' | 'Cancelada',
        };
        onSave(reservationData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Reserva' : 'Añadir Reserva'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" defaultValue={reservation?.name || ''} required className={inputClass} placeholder="Nombre" />
                <div className="flex gap-4">
                    <div className="w-1/3">
                        <input type="number" name="partySize" defaultValue={reservation?.partySize || 1} required className={inputClass} placeholder="Pax" />
                    </div>
                    <div className="w-2/3">
                        <input type="time" name="time" defaultValue={reservation?.time || ''} required className={inputClass} />
                    </div>
                </div>
                <select name="status" defaultValue={reservation?.status || 'Pendiente'} className={inputClass}>
                    <option>Pendiente</option>
                    <option>Confirmada</option>
                    <option>Cancelada</option>
                </select>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default ReservationFormModal;
