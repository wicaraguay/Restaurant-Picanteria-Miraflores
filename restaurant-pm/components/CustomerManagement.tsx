import React, { useState } from 'react';
import { Customer, Reservation, Feedback, SetState } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon } from './Icons';

interface CustomerManagementProps {
    customers: Customer[];
    setCustomers: SetState<Customer[]>;
    reservations: Reservation[];
    setReservations: SetState<Reservation[]>;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

const Card = ({ title, children, actions }: { title: string, children?: React.ReactNode, actions?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 h-full">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-light-background flex items-center gap-2">
                {title}
            </h2>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
    </div>
);

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, reservations, setReservations }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [modalTitle, setModalTitle] = useState('');

    // Customer CRUD
    const openCustomerForm = (customer: Partial<Customer> | null) => {
        const isEditing = customer && customer.id;
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

            if (isEditing) {
                setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, ...customerData, id: c.id } : c));
            } else {
                setCustomers(prev => [...prev, { ...customerData, id: Date.now().toString() }]);
            }
            setIsModalOpen(false);
        };

        setModalTitle(isEditing ? 'Editar Cliente' : 'Añadir Cliente');
        setModalContent(
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" placeholder="Nombre" defaultValue={customer?.name || ''} required className={inputClass}/>
                <input type="email" name="email" placeholder="Email" defaultValue={customer?.email || ''} required className={inputClass}/>
                <input type="tel" name="phone" placeholder="Teléfono" defaultValue={customer?.phone || ''} required className={inputClass}/>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium dark:text-gray-300">Puntos:</label>
                    <input type="number" name="loyaltyPoints" placeholder="0" defaultValue={customer?.loyaltyPoints || 0} required className={`w-24 ${inputClass}`}/>
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        );
        setIsModalOpen(true);
    };

    const deleteCustomer = (id: string) => {
        if(window.confirm('¿Seguro que quieres eliminar este cliente?')) {
            setCustomers(prev => prev.filter(c => c.id !== id));
        }
    };
    
    // Reservation CRUD
    const openReservationForm = (reservation: Partial<Reservation> | null) => {
        const isEditing = reservation && reservation.id;
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const reservationData: Omit<Reservation, 'id'> = {
                name: formData.get('name') as string,
                partySize: parseInt(formData.get('partySize') as string),
                time: formData.get('time') as string,
                status: formData.get('status') as 'Confirmada' | 'Pendiente' | 'Cancelada',
            };

            if (isEditing) {
                setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, ...reservationData, id: r.id } : r));
            } else {
                setReservations(prev => [...prev, { ...reservationData, id: Date.now().toString() }]);
            }
            setIsModalOpen(false);
        };

        setModalTitle(isEditing ? 'Editar Reserva' : 'Añadir Reserva');
        setModalContent(
             <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" defaultValue={reservation?.name || ''} required className={inputClass} placeholder="Nombre"/>
                <div className="flex gap-4">
                    <div className="w-1/3">
                         <input type="number" name="partySize" defaultValue={reservation?.partySize || 1} required className={inputClass} placeholder="Pax"/>
                    </div>
                    <div className="w-2/3">
                         <input type="time" name="time" defaultValue={reservation?.time || ''} required className={inputClass}/>
                    </div>
                </div>
                <select name="status" defaultValue={reservation?.status || 'Pendiente'} className={inputClass}>
                    <option>Pendiente</option><option>Confirmada</option><option>Cancelada</option>
                </select>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        );
        setIsModalOpen(true);
    };

    const deleteReservation = (id: string) => {
        if(window.confirm('¿Seguro que quieres eliminar esta reserva?')) {
            setReservations(prev => prev.filter(r => r.id !== id));
        }
    };

    const renderCustomerList = () => {
         if (customers.length === 0) {
            return <p className="text-gray-500 dark:text-gray-400 text-center py-4">No se encontraron clientes.</p>
        }
        return (
            <div>
                {/* Desktop Table */}
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
                                            <button onClick={() => openCustomerForm(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => deleteCustomer(c.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
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
                                    <button onClick={() => openCustomerForm(c)} className="text-blue-600 dark:text-blue-400 p-1"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => deleteCustomer(c.id)} className="text-red-600 dark:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
                {modalContent}
            </Modal>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background mb-6 hidden lg:block">Gestión de Clientes</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Lista de Clientes" actions={<button onClick={() => openCustomerForm(null)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg shadow-sm transition-colors"><PlusIcon className="w-4 h-4 mr-1"/> <span className="hidden sm:inline">Añadir</span></button>}>
                    {renderCustomerList()}
                </Card>
                 <Card title="Reservas de Hoy" actions={<button onClick={() => openReservationForm(null)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg shadow-sm transition-colors"><PlusIcon className="w-4 h-4 mr-1"/> <span className="hidden sm:inline">Añadir</span></button>}>
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
                                                <button onClick={() => openReservationForm(r)} className="text-blue-600 dark:text-blue-400 p-1"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => deleteReservation(r.id)} className="text-red-600 dark:text-red-400 p-1"><TrashIcon className="w-4 h-4"/></button>
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