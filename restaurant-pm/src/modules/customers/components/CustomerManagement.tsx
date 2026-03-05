/**
 * @file CustomerManagement.tsx
 * @description Componente principal para la gestión de clientes y reservas.
 */
import React, { useState } from 'react';
import { Customer, Reservation } from '../types/customer.types';
import { SetState } from '../../../types';
import { PlusIcon, EditIcon, TrashIcon } from '../../../components/ui/Icons';

// Componentes locales y globales
import Card from '../../../components/ui/Card';
import { CustomerFormModal } from './CustomerFormModal';
import { ReservationFormModal } from './ReservationFormModal';

interface CustomerManagementProps {
    customers: Customer[];
    setCustomers: SetState<Customer[]>;
    reservations: Reservation[];
    setReservations: SetState<Reservation[]>;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, reservations, setReservations }) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    // Customer CRUD
    const handleOpenCustomerForm = (customer: Customer | null = null) => {
        setEditingCustomer(customer);
        setIsCustomerModalOpen(true);
    };

    const handleSaveCustomer = (customerData: Omit<Customer, 'id'>) => {
        if (editingCustomer) {
            setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...customerData, id: editingCustomer.id } : c));
        } else {
            setCustomers(prev => [...prev, { ...customerData, id: Date.now().toString() }]);
        }
    };

    const handleDeleteCustomer = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este cliente?')) {
            setCustomers(prev => prev.filter(c => c.id !== id));
        }
    };

    // Reservation CRUD
    const handleOpenReservationForm = (reservation: Reservation | null = null) => {
        setEditingReservation(reservation);
        setIsReservationModalOpen(true);
    };

    const handleSaveReservation = (reservationData: Omit<Reservation, 'id'>) => {
        if (editingReservation) {
            setReservations(prev => prev.map(r => r.id === editingReservation.id ? { ...reservationData, id: editingReservation.id } : r));
        } else {
            setReservations(prev => [...prev, { ...reservationData, id: Date.now().toString() }]);
        }
    };

    const handleDeleteReservation = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar esta reserva?')) {
            setReservations(prev => prev.filter(r => r.id !== id));
        }
    };

    const renderCustomerList = () => {
        if (customers.length === 0) {
            return <p className="text-gray-500 dark:text-gray-400 text-center py-4">No se encontraron clientes.</p>
        }
        return (
            <div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-dark-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nombre</th>
                                <th scope="col" className="px-6 py-3">Puntos</th>
                                <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id} className="bg-white dark:bg-dark-800 border-b dark:border-dark-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">{c.loyaltyPoints} pts</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenCustomerForm(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><EditIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeleteCustomer(c.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden space-y-3">
                    {customers.map(c => (
                        <div key={c.id} className="bg-gray-50 dark:bg-dark-700/50 p-4 rounded-lg border border-gray-100 dark:border-dark-600">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{c.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                    {c.loyaltyPoints} pts
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-dark-600">
                                <span className="text-xs text-gray-500">{c.phone}</span>
                                <div className="flex gap-3">
                                    <button onClick={() => handleOpenCustomerForm(c)} className="text-blue-600 dark:text-blue-400 p-1"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleDeleteCustomer(c.id)} className="text-red-600 dark:text-red-400 p-1"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleSaveCustomer}
                customer={editingCustomer}
            />
            <ReservationFormModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onSave={handleSaveReservation}
                reservation={editingReservation}
            />

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background mb-6 hidden lg:block">Gestión de Clientes</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Lista de Clientes" actions={<button onClick={() => handleOpenCustomerForm(null)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg shadow-sm transition-colors"><PlusIcon className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Añadir</span></button>}>
                    {renderCustomerList()}
                </Card>
                <Card title="Reservas de Hoy" actions={<button onClick={() => handleOpenReservationForm(null)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg shadow-sm transition-colors"><PlusIcon className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Añadir</span></button>}>
                    {reservations.length === 0 ? <p className="text-gray-500 text-center py-4">No hay reservas para hoy.</p> : (
                        <ul className="space-y-3">
                            {reservations.map(r => (
                                <li key={r.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 dark:bg-dark-700/50 dark:border-dark-600">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-lg">{r.time}</p>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{r.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{r.partySize} personas</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md ${r.status === 'Confirmada' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>{r.status}</span>
                                            <div className="flex gap-2 mt-1">
                                                <button onClick={() => handleOpenReservationForm(r)} className="text-blue-600 dark:text-blue-400 p-1"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteReservation(r.id)} className="text-red-600 dark:text-red-400 p-1"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default CustomerManagement;
