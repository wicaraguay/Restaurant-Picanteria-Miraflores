/**
 * @file CustomerManagement.tsx
 * @description Componente principal para la gestión de clientes y reservas.
 */
import React, { useState, useEffect } from 'react';
import { Customer, Reservation } from '../types/customer.types';
import { SetState } from '../../../types';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, ChevronLeftIcon, UsersIcon, ClipboardListIcon } from '../../../components/ui/Icons';

// Componentes locales y globales
import { CustomerFormModal } from './CustomerFormModal';
import { ReservationFormModal } from './ReservationFormModal';
import { dataService } from '../../../services/DataService';
import { ErrorHandler } from '../../../utils/errorHandler';

interface CustomerManagementProps {
    customers: Customer[];
    setCustomers: SetState<Customer[]>;
    reservations: Reservation[];
    setReservations: SetState<Reservation[]>;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, reservations, setReservations }) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // UI State
    const [activeTab, setActiveTab] = useState<'customers' | 'reservations'>('customers');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    // Customer CRUD
    const handleOpenCustomerForm = (customer: Customer | null = null) => {
        setEditingCustomer(customer);
        setIsCustomerModalOpen(true);
    };

    const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
        setIsSaving(true);
        try {
            if (editingCustomer) {
                const updated = await dataService.updateCustomer(editingCustomer.id, customerData);
                setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updated : c));
            } else {
                const created = await dataService.createCustomer(customerData);
                setCustomers(prev => [...prev, created]);
            }
            setIsCustomerModalOpen(false);
        } catch (error) {
            ErrorHandler.handle(error, 'Error al guardar el cliente');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este cliente?')) {
            try {
                await dataService.deleteCustomer(id);
                setCustomers(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                ErrorHandler.handle(error, 'Error al eliminar el cliente');
            }
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
        setIsReservationModalOpen(false);
    };

    const handleDeleteReservation = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar esta reserva?')) {
            setReservations(prev => prev.filter(r => r.id !== id));
        }
    };

    // Filtering logic
    const filteredCustomers = (customers || []).filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.identification && c.identification.includes(searchTerm)) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const renderCustomerList = () => {
        if (filteredCustomers.length === 0) {
            return (
                <div className="text-center py-24 bg-white dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-sm">
                    <UsersIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-tighter">No se encontraron clientes</p>
                    <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                <div className="hidden md:block overflow-hidden rounded-3xl border border-gray-100 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/50 dark:bg-dark-700/30 font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-5">Cliente / Identificación</th>
                                <th className="px-6 py-5">Contacto</th>
                                <th className="px-6 py-5">Puntos</th>
                                <th className="px-6 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                            {paginatedCustomers.map(c => (
                                <tr key={c.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">{c.name}</span>
                                            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{c.identification || 'Sin identificación'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                                            <span>{c.email || '---'}</span>
                                            <span>{c.phone || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shadow-sm">
                                            {c.loyaltyPoints} PTS
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenCustomerForm(c)} className="p-2 text-blue-600 hover:bg-white dark:text-blue-400 dark:hover:bg-dark-700 rounded-xl shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-dark-600 transition-all"><EditIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeleteCustomer(c.id)} className="p-2 text-red-600 hover:bg-white dark:text-red-400 dark:hover:bg-dark-700 rounded-xl shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-dark-600 transition-all"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                    {paginatedCustomers.map(c => (
                        <div key={c.id} className="bg-white dark:bg-dark-800 p-5 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-full -mr-12 -mt-12"></div>
                            <div className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg">{c.name}</h3>
                                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{c.identification || 'Sin identificación'}</p>
                                    </div>
                                    <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">
                                        {c.loyaltyPoints} PTS
                                    </span>
                                </div>
                                <div className="space-y-1 mb-6">
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 uppercase"><span>📧</span> {c.email || 'N/A'}</p>
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 uppercase"><span>📱</span> {c.phone || 'N/A'}</p>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-dark-700">
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => handleOpenCustomerForm(c)} className="flex-1 py-3 bg-gray-50 dark:bg-dark-700 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest"><EditIcon className="w-4 h-4" /> Editar</button>
                                        <button onClick={() => handleDeleteCustomer(c.id)} className="flex-1 py-3 bg-gray-50 dark:bg-dark-700 text-red-600 dark:text-red-400 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest"><TrashIcon className="w-4 h-4" /> Eliminar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleSaveCustomer}
                customer={editingCustomer}
                isLoading={isSaving}
            />
            <ReservationFormModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onSave={handleSaveReservation}
                reservation={editingReservation}
            />

            {/* Premium Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-8">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Gestión de Clientes</h1>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        CENTRAL DE FIDELIZACIÓN ({customers?.length || 0} REGISTROS)
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex bg-gray-100 dark:bg-dark-800 p-1 rounded-2xl shadow-inner border border-gray-200 dark:border-dark-700 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'customers' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <UsersIcon className="w-4 h-4" /> Clientes
                        </button>
                        <button
                            onClick={() => setActiveTab('reservations')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'reservations' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <ClipboardListIcon className="w-4 h-4" /> Reservas
                        </button>
                    </div>

                    <div className="h-10 w-[1px] bg-gray-200 dark:bg-dark-700 mx-2 hidden sm:block"></div>

                    {activeTab === 'customers' ? (
                        <div className="relative w-full sm:w-64">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`${inputClass} pl-12 h-12 rounded-2xl`}
                            />
                        </div>
                    ) : (
                        <div className="w-full sm:w-64"></div>
                    )}

                    <button 
                        onClick={async () => {
                            setIsSaving(true);
                            try {
                                await dataService.clearCache();
                                const fresh = await dataService.getCustomers();
                                setCustomers(fresh);
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        className="w-full sm:w-auto flex items-center justify-center bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-dark-600 transition-all active:scale-95"
                        disabled={isSaving}
                    >
                        Refrescar
                    </button>

                    <button 
                        onClick={() => activeTab === 'customers' ? handleOpenCustomerForm(null) : handleOpenReservationForm(null)} 
                        className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 group"
                    >
                        <PlusIcon className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform" /> 
                        {activeTab === 'customers' ? 'Nuevo Cliente' : 'Nueva Reserva'}
                    </button>
                </div>
            </div>

            {/* Content Rendering */}
            {activeTab === 'customers' ? (
                <>
                    {renderCustomerList()}
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12 pb-12">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm active:scale-90"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            
                            <span className="text-[11px] font-black text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 px-6 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm uppercase tracking-widest">
                                Página {currentPage} de {totalPages}
                            </span>

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm active:scale-90"
                            >
                                <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                    <div className="lg:col-span-2">
                        {reservations.length === 0 ? (
                             <div className="text-center py-24 bg-white dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-sm">
                                <ClipboardListIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-tighter">No hay reservas para hoy</p>
                                <button onClick={() => handleOpenReservationForm(null)} className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Crear primera reserva</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {reservations.map(r => (
                                    <div key={r.id} className="bg-white dark:bg-dark-800 p-8 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-sm relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">{r.time}</p>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mt-2 leading-tight">{r.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-widest">Grupo de {r.partySize} personas</p>
                                            </div>
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border ${r.status === 'Confirmada' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'}`}>
                                                {r.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenReservationForm(r)} className="flex-1 py-3 bg-gray-50 dark:bg-dark-700 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] hover:bg-white dark:hover:bg-dark-600 transition-all uppercase tracking-widest border border-transparent hover:border-blue-100 shadow-sm">Editar</button>
                                            <button onClick={() => handleDeleteReservation(r.id)} className="flex-1 py-3 bg-gray-50 dark:bg-dark-700 text-red-600 dark:text-red-400 rounded-2xl font-black text-[10px] hover:bg-white dark:hover:bg-dark-600 transition-all uppercase tracking-widest border border-transparent hover:border-red-100 shadow-sm">Eliminar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-6">
                         <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl shadow-2xl shadow-blue-500/30 text-white relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                Resumen de Hoy
                            </h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-5xl font-black tracking-tighter">{reservations.length}</p>
                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mt-1">Total reservas</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black tracking-tighter">{reservations.filter(r => r.status === 'Confirmada').length}</p>
                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mt-1">Confirmadas</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-dark-800 p-6 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Próximos Pasos</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[10px]">✅</span>
                                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Verificar horario de mayor afluencia</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px]">📅</span>
                                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Confirmar reservas pendientes de la tarde</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
