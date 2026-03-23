import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { orderService } from '../services/OrderService';
import { billingService } from '../../billing/services/BillingService';
import { SetState } from '../../../types';
import { MenuItem } from '../../menu/types/menu.types';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import Modal from '../../../components/ui/Modal';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, MinusIcon, ClipboardListIcon, PrinterIcon, ChevronLeftIcon, LayoutIcon, MonitorIcon, ClockIcon, HistoryIcon } from '../../../components/ui/Icons';
import { OrderNumberGenerator } from '../utils/orderNumberGenerator';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';
import { generateAccessKey } from '../../billing/utils/sri';
import { generateInvoiceHtml, ClientData } from '../../billing/utils/invoiceGenerator';
import InvoiceProcessingModal, { InvoiceProcessState } from '../../billing/components/InvoiceProcessingModal';
import { useAuth } from '../../auth/contexts/AuthContext';
import { toast } from '../../../components/ui/AlertProvider';
import { notificationService } from '../../../services/NotificationService';
import ConfirmModal from '../../../components/ui/ConfirmModal';

interface OrderManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
    menuItems: MenuItem[];
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

import { OrderCard } from './OrderCard';
import { OrderFormModal } from './OrderFormModal';
import POSView from './POSView';
import { BillingModal } from './BillingModal';

// --- Main Order Management Component ---
const OrderManagement: React.FC<OrderManagementProps> = ({ orders, setOrders, menuItems }) => {
    const { currentUser } = useAuth();
    const { config, refreshConfig } = useRestaurantConfig();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [viewMode, setViewMode] = useState<'dashboard' | 'pos'>('dashboard');
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
    const [confirmBillingNoEmail, setConfirmBillingNoEmail] = useState<{ isOpen: boolean; order: Order | null; data: ClientData | null }>({ isOpen: false, order: null, data: null });

    const handleOpenModal = (order: Order | null) => {
        setEditingOrder(order);
        setViewMode('pos');
    };

    const handleCloseModal = () => {
        setEditingOrder(null);
        setIsModalOpen(false);
    };

    const handleSaveOrder = async (orderToSave: Order) => {
        try {
            const exists = orders.some(o => o.id === orderToSave.id);
            if (exists) {
                // Si el pedido ya existe y se está actualizando (ej. agregando más platos),
                // reseteamos el tiempo estimado para que la cocina vuelva a estimar según la nueva carga.
                const orderToUpdate = {
                    ...orderToSave,
                    estimatedMinutes: null,
                    estimateSetAt: null,
                    status: OrderStatus.New // Regresar a Nuevo para que aparezca en cocina y se pueda re-estimar
                };
                const updated = await orderService.update(orderToSave.id, orderToUpdate);
                setOrders(prevOrders => prevOrders.map(o => o.id === orderToSave.id ? updated : o));
                toast.success('Pedido actualizado y enviado a cocina', 'Éxito');
            } else {
                const orderWithNumber = {
                    ...orderToSave,
                    orderNumber: orderToSave.orderNumber || OrderNumberGenerator.getNextOrderNumber()
                };
                const created = await orderService.create(orderWithNumber);
                if (!created.orderNumber) created.orderNumber = orderWithNumber.orderNumber;
                setOrders(prevOrders => [...prevOrders, created]);
                toast.success(`Pedido #${created.orderNumber} creado`, 'Éxito');
            }
        } catch (error) {
            console.error('Failed to save order:', error);
            toast.error('Error al guardar el pedido. Intente nuevamente.', 'Error');
        }
    };

    const handleDeleteOrder = (orderId: string) => {
        setConfirmDelete({ isOpen: true, id: orderId });
    };

    const confirmDeleteOrder = async () => {
        if (!confirmDelete.id) return;
        try {
            await orderService.delete(confirmDelete.id);
            setOrders(prev => prev.filter(o => o.id !== confirmDelete.id));
            toast.success('Pedido eliminado', 'Éxito');
        } catch (error) {
            console.error('Failed to delete order:', error);
            toast.error('Error al eliminar el pedido.', 'Error');
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus, additionalData: Partial<Order> = {}) => {
        try {
            const updated = await orderService.update(orderId, { status: newStatus, ...additionalData });
            setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
            toast.info(`Pedido ${newStatus}`, 'Actualización');
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Error al actualizar el estado.', 'Error');
        }
    };

    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [billingOrder, setBillingOrder] = useState<Order | null>(null);
    const [billingData, setBillingData] = useState<ClientData>({
        identification: '',
        name: '',
        email: '',
        address: '',
        phone: '',
        paymentMethod: '01' // 01 - SIN UTILIZACION DEL SISTEMA FINANCIERO
    });

    // Estados para la búsqueda local de clientes
    const [searchingIdentity, setSearchingIdentity] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);

    // Estados para el modal de procesamiento de facturas
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
    const [processingState, setProcessingState] = useState<InvoiceProcessState>(InvoiceProcessState.IDLE);
    const [processingMessage, setProcessingMessage] = useState('');
    const [processingDetails, setProcessingDetails] = useState('');
    const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
    const [tempAccessKey, setTempAccessKey] = useState<string | undefined>();
    const [tempAuthDate, setTempAuthDate] = useState<string | undefined>();
    
    // Estados para Paginación y Filtros de Historial
    const [historySearch, setHistorySearch] = useState('');
    const [historyDate, setHistoryDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;

    const prevReadyOrdersCount = React.useRef(0);

    // Initial count to avoid notification on first load
    useEffect(() => {
        prevReadyOrdersCount.current = orders.filter(o => o.status === OrderStatus.Ready).length;
    }, []);

    // Effect to detect READY orders
    useEffect(() => {
        const currentReadyCount = orders.filter(o => o.status === OrderStatus.Ready).length;
        
        if (currentReadyCount > prevReadyOrdersCount.current) {
            notificationService.playOrderReadySound();
            toast.success('¡PEDIDO LISTO PARA SERVIR / COBRAR!', 'TERMINADO');
        }
        
        prevReadyOrdersCount.current = currentReadyCount;
    }, [orders]);

    const prevEstimatedOrders = React.useRef<Record<string, number | null>>({});

    // Effect to detect ESTIMATED time changes from kitchen
    useEffect(() => {
        orders.forEach(order => {
            const prevEstimate = prevEstimatedOrders.current[order.id];
            const currentEstimate = order.estimatedMinutes;

            // If estimate was set or changed (and it's not the initial load)
            if (currentEstimate && currentEstimate !== prevEstimate && prevEstimate !== undefined) {
                toast.info(`Pedido #${order.orderNumber || order.id.slice(-6)}: Cocina estima ${currentEstimate} min`, 'TIEMPO ESTIMADO');
            }
            
            prevEstimatedOrders.current[order.id] = currentEstimate;
        });

        // Cleanup old orders from ref
        const currentIds = new Set(orders.map(o => o.id));
        Object.keys(prevEstimatedOrders.current).forEach(id => {
            if (!currentIds.has(id)) delete prevEstimatedOrders.current[id];
        });
    }, [orders]);

    // Resetear página al cambiar filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [historySearch, historyDate, activeTab]);

    const handleOpenBilling = (order: Order) => {
        setBillingOrder(order);
        setBillingData({
            identification: '',
            name: order.customerName,
            email: '',
            address: '',
            phone: '',
            paymentMethod: '01'
        });
        setIsBillingModalOpen(true);
        setLookupError(null);
    };

    // Efecto para búsqueda automática de cliente por identificación
    useEffect(() => {
        const ident = billingData.identification;
        if (ident.length >= 10 && ident !== '9999999999999') {
            const timeoutId = setTimeout(async () => {
                setSearchingIdentity(true);
                setLookupError(null);
                try {
                    const customer = await api.customers.lookupByIdentification(ident);
                    if (customer) {
                        setBillingData(prev => ({
                            ...prev,
                            name: customer.name || prev.name,
                            email: customer.email || prev.email,
                            address: customer.address || prev.address,
                            phone: customer.phone || prev.phone
                        }));
                    }
                } catch (error: any) {
                    console.log('Customer not found in local DB or error:', error.message);
                    // Silently fail if not found, let user fill manually
                } finally {
                    setSearchingIdentity(false);
                }
            }, 600); // 600ms debounce
            return () => clearTimeout(timeoutId);
        }
    }, [billingData.identification]);

    const handleProcessBilling = async () => {
        if (!billingData.identification || !billingData.name) {
            toast.warning('Por favor complete RUC/Cédula y Nombre del cliente.', 'Datos Incompletos');
            return;
        }

        const hasValidEmail = billingData.email &&
            billingData.email.includes('@') &&
            !billingData.email.includes('noemail');

        if (!hasValidEmail && billingData.identification !== '9999999999999') {
            setConfirmBillingNoEmail({ isOpen: true, order: billingOrder, data: billingData });
            return;
        }

        executeBillingProcess(billingOrder!, billingData);
    };

    const executeBillingProcess = async (order: Order, data: ClientData) => {
        // Cerrar modal de billing y abrir modal de procesamiento
        setIsBillingModalOpen(false);
        setIsProcessingModalOpen(true);

        try {
            // ETAPA 1: Validación
            setProcessingState(InvoiceProcessState.VALIDATING);
            setProcessingMessage('Validando datos');
            setProcessingDetails('Verificando información del cliente y productos...');
            await new Promise(resolve => setTimeout(resolve, 500));

            // ETAPA 2: Generación
            setProcessingState(InvoiceProcessState.GENERATING);
            setProcessingMessage('Generando factura electrónica');
            setProcessingDetails('Creando documento XML según normativa SRI...');
            await new Promise(resolve => setTimeout(resolve, 800));

            // ETAPA 3: Firmado
            setProcessingState(InvoiceProcessState.SIGNING);
            setProcessingMessage('Firmando documento');
            setProcessingDetails('Aplicando certificado digital...');
            await new Promise(resolve => setTimeout(resolve, 600));

            // ETAPA 4: Enviando al SRI
            setProcessingState(InvoiceProcessState.SENDING);
            setProcessingMessage('Enviando al SRI');
            setProcessingDetails('Transmitiendo factura para recepción...');

            // Llamada real al backend
            console.log('Enviando a facturar:', { order, client: data });

            const result = await billingService.generateXML({
                order: order,
                client: data,
                taxRate: config.billing?.taxRate || 15,
                logoUrl: config.fiscalLogo || config.logo
            });

            if (result.success) {
                // ETAPA 5: Esperando autorización
                setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
                setProcessingMessage('Esperando autorización SRI');
                setProcessingDetails('El SRI está procesando la autorización...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                const realAccessKey = result.accessKey;
                const authDate = result.authorization?.fechaAutorizacion || result.sriResponse?.fechaAutorizacion;
                const sriStatus = result.authorization?.estado || result.sriResponse?.estado;

                setTempAccessKey(realAccessKey);
                setTempAuthDate(authDate);
                setGeneratedInvoiceNumber(result.invoiceNumber || result.invoiceId);

                if (sriStatus === 'AUTORIZADO') {
                    setProcessingState(InvoiceProcessState.AUTHORIZED);
                    setProcessingMessage('¡Factura autorizada con éxito!');
                    setProcessingDetails('La factura fue generada, recibida y autorizada por el SRI.');
                } else {
                    setProcessingState(InvoiceProcessState.PENDING);
                    setProcessingMessage('Factura generada correctamente');
                    setProcessingDetails(
                        'La factura fue creada y enviada al SRI, pero aún está EN PROCESO de autorización.'
                    );
                }

                await refreshConfig();

                const finalBillingType = data.identification === '9999999999999' ? 'Consumidor Final' : 'Factura';
                await handleStatusChange(order.id, OrderStatus.Completed, { 
                    billed: true,
                    billingType: finalBillingType
                });
            } else {
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage('Error al generar la factura');
                setProcessingDetails(result.message || 'Hubo un problema al procesar la factura.');
            }
        } catch (error) {
            console.error('Billing error', error);
            setProcessingState(InvoiceProcessState.ERROR);
            setProcessingMessage('Error en el proceso');
            const errorMessage = error instanceof Error ? error.message : 'Error al procesar la factura con el servidor.';
            setProcessingDetails(errorMessage);
        }
    };


    const handleManualComplete = async () => {
        if (!billingOrder) return;
        
        try {
            await handleStatusChange(billingOrder.id, OrderStatus.Completed, {
                billingType: 'Sin Factura'
            });
            setIsBillingModalOpen(false);
            toast.success('Venta registrada sin factura', 'Éxito');
        } catch (error) {
            console.error('Failed to complete order manually:', error);
            toast.error('Error al completar el pedido.', 'Error');
        }
    };

    const handlePrintInvoice = (accessKey?: string, authDate?: string) => {
        if (!billingOrder) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Por favor permite ventanas emergentes para imprimir.');
            return;
        }

        const html = generateInvoiceHtml(billingOrder, config, billingData, accessKey, authDate);

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleCloseProcessingModal = () => {
        setIsProcessingModalOpen(false);
        setProcessingState(InvoiceProcessState.IDLE);
        setProcessingMessage('');
        setProcessingDetails('');
        setGeneratedInvoiceNumber('');
        setTempAccessKey(undefined);
        setTempAuthDate(undefined);
    };

    const handlePrintFromProcessingModal = () => {
        handlePrintInvoice(tempAccessKey, tempAuthDate);
        handleCloseProcessingModal();
    };

    const handleGoToHistory = () => {
        // Aquí puedes agregar navegación al historial de facturas
        // Por ahora simplemente cerramos el modal y el usuario puede navegar manualmente
        handleCloseProcessingModal();
        alert('Por favor, dirígete a la sección "Historial de Facturas" para verificar el estado de la factura.');
    };

    const filteredOrders = (Array.isArray(orders) ? orders : [])
        .filter(order => {
            if (activeTab === 'active') {
                return order.status === OrderStatus.New || order.status === OrderStatus.Ready;
            } else {
                // Filtros de Historial
                const isCompleted = order.status === OrderStatus.Completed;
                if (!isCompleted) return false;

                const matchesSearch = historySearch === '' || 
                    order.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
                    (order.orderNumber && order.orderNumber.toString().includes(historySearch)) ||
                    order.id.toLowerCase().includes(historySearch.toLowerCase());
                
                const matchesDate = historyDate === '' || 
                    (order.createdAt && order.createdAt.startsWith(historyDate));

                return matchesSearch && matchesDate;
            }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginación
    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
    const paginatedOrders = activeTab === 'history' 
        ? filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
        : filteredOrders;


    return (
        <div className="flex flex-col h-full">
            {/* Common Header / Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Operaciones</h1>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        CENTRAL DE CONTROL RESTAURANTE
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:items-center gap-4 w-full sm:w-auto">
                    <div className="flex bg-gray-100 dark:bg-dark-800 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-dark-700 w-full sm:w-auto">
                        <button
                            onClick={() => { setViewMode('dashboard'); setEditingOrder(null); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <LayoutIcon className="w-3.5 h-3.5" />
                            <span>Tablero</span>
                        </button>
                        <button
                            onClick={() => setViewMode('pos')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'pos' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <MonitorIcon className="w-3.5 h-3.5" />
                            <span>Sistema POS</span>
                        </button>
                    </div>

                    {viewMode === 'dashboard' && (
                        <>
                            <div className="hidden lg:block h-8 w-[1px] bg-gray-200 dark:bg-dark-700 mx-1"></div>
                            <div className="flex bg-gray-100 dark:bg-dark-800 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-dark-700 w-full sm:w-auto">
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                >
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    <span>En Curso</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                >
                                    <HistoryIcon className="w-3.5 h-3.5" />
                                    <span>Historial</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {viewMode === 'dashboard' && activeTab === 'history' && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:flex-1 lg:max-w-xl">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text"
                                placeholder="Buscar cliente o # pedido..."
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white"
                            />
                        </div>
                        <input 
                            type="date"
                            value={historyDate}
                            onChange={e => setHistoryDate(e.target.value)}
                            className="w-full sm:w-auto rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:border-gray-700 dark:bg-dark-800 dark:text-white"
                        />
                    </div>
                )}

                {viewMode === 'dashboard' && (
                    <button 
                        onClick={() => handleOpenModal(null)} 
                        className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 group"
                    >
                        <PlusIcon className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> 
                        NUEVO PEDIDO
                    </button>
                )}
            </div>

            {/* Content Rendering */}
            {viewMode === 'pos' ? (
                <POSView 
                    menuItems={menuItems} 
                    onSave={handleSaveOrder} 
                    onCancel={() => {
                        setViewMode('dashboard');
                        setEditingOrder(null);
                    }}
                    initialOrder={editingOrder}
                />
            ) : (
                <>
            {isBillingModalOpen && billingOrder && (
                <BillingModal
                    isOpen={isBillingModalOpen}
                    onClose={() => setIsBillingModalOpen(false)}
                    config={config}
                    billingOrder={billingOrder}
                    billingData={billingData}
                    setBillingData={setBillingData}
                    searchingIdentity={searchingIdentity}
                    onProcess={handleProcessBilling}
                    onManualComplete={() => {/* Handled by ConfirmModal or separate flow if needed */}}
                    manualCompleteLabel="Registrar sin Factura"
                />
            )}
            <OrderFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveOrder} order={editingOrder} menuItems={menuItems} />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={confirmDeleteOrder}
                title="Eliminar Pedido"
                message="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                type="danger"
            />

            <ConfirmModal
                isOpen={confirmBillingNoEmail.isOpen}
                onClose={() => setConfirmBillingNoEmail({ isOpen: false, order: null, data: null })}
                onConfirm={() => {
                    if (confirmBillingNoEmail.order && confirmBillingNoEmail.data) {
                        executeBillingProcess(confirmBillingNoEmail.order, confirmBillingNoEmail.data);
                        setConfirmBillingNoEmail({ isOpen: false, order: null, data: null });
                    }
                }}
                title="Factura sin Email"
                message="No se ha ingresado un email válido. La factura se generará pero NO se enviará automáticamente. ¿Deseas continuar?"
                confirmText="Continuar sin Email"
                type="warning"
            />

            {/* Invoice Processing Modal */}
            <InvoiceProcessingModal
                isOpen={isProcessingModalOpen}
                currentState={processingState}
                message={processingMessage}
                details={processingDetails}
                invoiceNumber={generatedInvoiceNumber}
                onClose={handleCloseProcessingModal}
                onPrint={handlePrintFromProcessingModal}
                onGoToHistory={handleGoToHistory}
            />

            {/* Billing Modal Integration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
                {filteredOrders.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                        {activeTab === 'active' ? 'No hay pedidos en curso.' : 'No hay historial de pedidos completados.'}
                    </div>
                ) : (
                    paginatedOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            userRoleName={currentUser?.role.name}
                            onEdit={() => handleOpenModal(order)}
                            onDelete={() => handleDeleteOrder(order.id)}
                            onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                            onPayment={handleOpenBilling}
                            onBilling={() => handleOpenBilling(order)}
                        />
                    ))
                )}
            </div>

            {/* Pagination Controls (only for history) */}
            {viewMode === 'dashboard' && activeTab === 'history' && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12 pb-8">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2.5 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm active:scale-90"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800">
                            Página {currentPage} de {totalPages}
                        </span>
                    </div>

                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2.5 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm active:scale-90"
                    >
                        <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default OrderManagement;
