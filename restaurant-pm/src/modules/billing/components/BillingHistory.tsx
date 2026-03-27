/**
 * Componente: BillingHistory
 * Descripción: Vista principal para el historial de facturación electrónica. 
 * Permite buscar, filtrar, autorizar, consultar estado y emitir notas de crédito.
 * Estilizado siguiendo el patrón premium de "Operaciones" del sistema POS.
 * Responsabilidad: Gestión visual de comprobantes emitidos.
 */
import React, { useState, useEffect } from 'react';
import { billingService } from '../services/BillingService';
import { Bill } from '../types/billing.types';
import { API_BASE_URL } from '../../../config/api.config';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';
import CreditNoteModal from './CreditNoteModal.tsx';
import InvoiceProcessingModal, { InvoiceProcessState } from './InvoiceProcessingModal';
import { XMLViewerModal } from './XMLViewerModal';
import { EditBillModal } from './EditBillModal';

import {
    SearchIcon,
    PrinterIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    RefreshCcwIcon,
    FileTextIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ArrowRightIcon,
    PlusIcon,
    TrashIcon,
    LayoutIcon,
    HistoryIcon,
    CalendarIcon,
    ChevronDownIcon,
    EditIcon,
    EyeIcon
} from '../../../components/ui/Icons';

const BillingHistory: React.FC = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(15);
    const [expandedBillIds, setExpandedBillIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [idSearch, setIdSearch] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedBillForCreditNote, setSelectedBillForCreditNote] = useState<Bill | null>(null);
    const { config } = useRestaurantConfig();

    // Estados para el modal de procesamiento de facturas
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
    const [processingState, setProcessingState] = useState<InvoiceProcessState>(InvoiceProcessState.IDLE);
    const [processingMessage, setProcessingMessage] = useState('');
    const [processingDetails, setProcessingDetails] = useState('');
    const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');

    // Estados para nuevos modales
    const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedBillForXml, setSelectedBillForXml] = useState<Bill | null>(null);
    const [selectedBillForEdit, setSelectedBillForEdit] = useState<Bill | null>(null);

    const fetchBills = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page,
                limit,
                sort: { createdAt: -1 }
            };

            if (selectedYear && selectedYear !== 'all') {
                params.startDate = `${selectedYear}-01-01`;
                params.endDate = `${selectedYear}-12-31`;
            }

            if (searchTerm) params.customerIdentification = searchTerm;
            if (idSearch) params.documentNumber = idSearch;

            const response = await billingService.getAll(params);

            if (response && response.data) {
                setBills(response.data);
                setTotal(response.pagination?.total || response.data.length);
            } else {
                setBills(Array.isArray(response) ? response : []);
                setTotal(Array.isArray(response) ? response.length : 0);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [page, selectedYear]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchBills();
    };

    const toggleBillExpansion = (billId: string) => {
        const newExpanded = new Set(expandedBillIds);
        if (newExpanded.has(billId)) {
            newExpanded.delete(billId);
        } else {
            newExpanded.add(billId);
        }
        setExpandedBillIds(newExpanded);
    };

    const handleAuthorize = async (bill: Bill) => {
        if (!confirm('¿Desea generar y autorizar esta factura en el SRI?')) return;

        // Abrir modal de procesamiento
        setIsProcessingModalOpen(true);

        try {
            // ETAPA 1: Validación
            setProcessingState(InvoiceProcessState.VALIDATING);
            setProcessingMessage('Validando datos');
            setProcessingDetails('Verificando información del cliente y productos...');
            await new Promise(resolve => setTimeout(resolve, 500));

            const taxRate = config.billing?.taxRate || 15;

            // Reconstruct order items with tax-inclusive prices
            const items = bill.items.map(item => ({
                id: item.name,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total
            }));

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

            const orderPayload = {
                id: bill.orderId,
                items: items
            };

            const clientPayload = {
                name: bill.customerName,
                identification: bill.customerIdentification,
                address: bill.customerAddress,
                email: bill.customerEmail,
                phone: bill.customerPhone,
                paymentMethod: bill.paymentMethod || '01'
            };

            const result = await billingService.generateXML({
                order: orderPayload,
                client: clientPayload,
                taxRate: taxRate,
                logoUrl: config.fiscalLogo || config.logo
            });

            if (result.success) {
                // ETAPA 5: Esperando autorización
                setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
                setProcessingMessage('Esperando autorización SRI');
                setProcessingDetails('El SRI está procesando la autorización...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // CORRECCIÓN: El backend devuelve la autorización en result.authorization, no en sriResponse
                const sriStatus = result.authorization?.estado || result.sriResponse?.estado;
                setGeneratedInvoiceNumber(result.invoiceId);

                if (sriStatus === 'AUTORIZADO') {
                    setProcessingState(InvoiceProcessState.AUTHORIZED);
                    setProcessingMessage('¡Factura autorizada con éxito!');
                    setProcessingDetails('La factura fue generada, recibida y autorizada por el SRI.');
                } else {
                    setProcessingState(InvoiceProcessState.PENDING);
                    setProcessingMessage('Factura generada correctamente');
                    setProcessingDetails(
                        'La factura fue creada y enviada al SRI, pero aún está EN PROCESO de autorización. ' +
                        'Puedes actualizar la página para verificar su estado.'
                    );
                }

                await fetchBills();
            } else {
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage('Error al generar la factura');
                setProcessingDetails(result.message || 'Hubo un problema al procesar la factura.');
            }
        } catch (error) {
            console.error('Error authorizing bill:', error);
            setProcessingState(InvoiceProcessState.ERROR);
            setProcessingMessage('Error en el proceso');
            const errorMessage = error instanceof Error ? error.message : 'Error al autorizar la factura.';
            setProcessingDetails(errorMessage);
        }
    };

    const handleCheckStatus = async (bill: Bill) => {
        if (!bill.accessKey) return;

        // Abrir modal de procesamiento
        setIsProcessingModalOpen(true);
        setGeneratedInvoiceNumber(bill.documentNumber || '');

        try {
            // ETAPA: Consultando estado
            setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
            setProcessingMessage('Consultando estado en SRI');
            setProcessingDetails('Verificando si la factura ya fue autorizada...');
            await new Promise(resolve => setTimeout(resolve, 800));

            const result = await billingService.checkStatus(bill.accessKey);

            // CORRECCIÓN: Agregar result.authorization?.estado que es como lo devuelve CheckInvoiceStatus
            const status = result.authorization?.estado || result.estado || result.authResult?.estado || result.sriResponse?.estado;
            const authDate = result.authorization?.fechaAutorizacion || result.fechaAutorizacion || result.authResult?.fechaAutorizacion;

            if (status === 'AUTORIZADO') {
                setProcessingState(InvoiceProcessState.AUTHORIZED);
                setProcessingMessage('¡Factura autorizada con éxito!');
                setProcessingDetails('La factura fue generada, recibida y autorizada por el SRI.');
                // Update local state is handled by fetchBills later
            } else if (status === 'DEVUELTA') {
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage('Factura DEVUELTA por SRI');
                const errores = result.mensajes?.map((m: any) => m.mensaje).join(', ') || 'Revise los datos de la factura.';
                setProcessingDetails(`Error: ${errores}`);
            } else {
                setProcessingState(InvoiceProcessState.PENDING);
                setProcessingMessage('Factura generada correctamente');
                setProcessingDetails(
                    'La factura sigue EN PROCESO de autorización en el SRI. ' +
                    'Intente verificar nuevamente en unos minutos.'
                );
            }

            await fetchBills();

        } catch (error) {
            console.error('Error checking status:', error);
            setProcessingState(InvoiceProcessState.ERROR);
            setProcessingMessage('Error al consultar SRI');
            const errorMessage = error instanceof Error ? error.message : 'No se pudo verificar el estado.';
            setProcessingDetails(errorMessage);
        }
    };

    const handleReSubmit = async (bill: Bill) => {
        setIsProcessingModalOpen(true);
        setGeneratedInvoiceNumber(bill.documentNumber || '');

        try {
            setProcessingState(InvoiceProcessState.SENDING);
            setProcessingMessage('Re-enviando al SRI');
            setProcessingDetails('Procesando datos actualizados y transmitiendo...');

            const result = await billingService.reSubmit(bill.id);

            if (result.success) {
                setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
                setProcessingMessage('Esperando autorización SRI');

                const sriStatus = result.authorization?.estado || result.sriResponse?.estado;

                if (sriStatus === 'AUTORIZADO') {
                    setProcessingState(InvoiceProcessState.AUTHORIZED);
                    setProcessingMessage('¡Factura autorizada!');
                } else {
                    setProcessingState(InvoiceProcessState.PENDING);
                }
                await fetchBills();
            } else {
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage('Error en el re-envío');
                setProcessingDetails(result.message || 'Error al procesar la solicitud.');
            }
        } catch (error) {
            console.error('Error re-submitting bill:', error);
            setProcessingState(InvoiceProcessState.ERROR);
            setProcessingMessage('Error técnico');
            setProcessingDetails(error instanceof Error ? error.message : 'Error desconocido');
        }
    };

    const handleExportCSV = async () => {
        setIsLoading(true);
        try {
            // Para la declaración anual, necesitamos TODOS los registros del periodo
            const params: any = {
                limit: 5000, // Límite máximo para exportación
                sort: { date: 1 } // Ordenar por fecha para el reporte
            };

            if (selectedYear && selectedYear !== 'all') {
                params.startDate = `${selectedYear}-01-01`;
                params.endDate = `${selectedYear}-12-31`;
            }

            const response = await billingService.getAll(params);
            const allBills = response.data || [];

            if (allBills.length === 0) {
                alert('No hay facturas en este periodo para exportar.');
                return;
            }

            const headers = ["Fecha", "Numero", "Cliente", "RUC/CI", "Subtotal", "IVA", "Total", "SRI Status", "Clave Acceso"];
            const rows = allBills.map(b => [
                b.date,
                b.documentNumber,
                b.customerName,
                b.customerIdentification,
                b.subtotal.toFixed(2),
                b.tax.toFixed(2),
                b.total.toFixed(2),
                b.sriStatus || 'PENDIENTE',
                `'${b.accessKey || ''}` // Quote to avoid scientific notation in Excel
            ]);

            const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            const yearSuffix = selectedYear === 'all' ? 'Completo' : selectedYear;
            link.setAttribute("href", url);
            link.setAttribute("download", `Facturacion_${yearSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Error al exportar los datos.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (bill: Bill) => {
        if (bill.hasCreditNote === true || bill.sriStatus === 'CANCELLED') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 uppercase tracking-tighter">
                    <AlertCircleIcon className="w-3 h-3" /> ANULADO (NC)
                </span>
            );
        }

        const s = bill.sriStatus?.toUpperCase() || 'UNKNOWN';
        if (s === 'AUTORIZADO') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg border border-green-200 dark:border-green-800/50 uppercase tracking-tighter">
                    <CheckCircleIcon className="w-3 h-3" /> AUTORIZADO
                </span>
            );
        }
        if (s === 'VALIDADO') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/50 uppercase tracking-tighter">
                    <CheckCircleIcon className="w-3 h-3" /> VALIDADO
                </span>
            );
        }
        if (s === 'BORRADOR') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 uppercase tracking-tighter">
                    <FileTextIcon className="w-3 h-3" /> BORRADOR
                </span>
            );
        }
        if (s === 'RECIBIDA' || s === 'PENDING' || s === 'SENT') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50 uppercase tracking-tighter">
                    <RefreshCcwIcon className="w-3 h-3 animate-spin" /> PROCESANDO
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[9px] font-black bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 uppercase tracking-tighter">
                <AlertCircleIcon className="w-3 h-3" /> {s}
            </span>
        );
    };

    const handleCloseProcessingModal = () => {
        setIsProcessingModalOpen(false);
        setProcessingState(InvoiceProcessState.IDLE);
        setProcessingMessage('');
        setProcessingDetails('');
        setGeneratedInvoiceNumber('');
    };

    return (
        <div className="flex flex-col h-full space-y-8">
            {/* Cabecera Estilo Operaciones */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Historial</h1>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        CONTROL DE DOCUMENTOS ELECTRÓNICOS
                    </p>
                </div>

                {/* Barra de Filtros Integrada */}
                <div className="flex flex-col md:flex-row gap-3 w-full lg:flex-1 lg:max-w-3xl">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 w-full">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar RUC / Cédula..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-700 pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="relative flex-1">
                            <FileTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Número de Factura..."
                                value={idSearch}
                                onChange={(e) => setIdSearch(e.target.value)}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-700 pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="appearance-none w-full md:w-32 rounded-2xl border border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-700 pl-11 pr-8 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="all">TODOS</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Filtrar Reporte
                        </button>
                    </form>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                    <button
                        onClick={handleExportCSV}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-green-500/20 transition-all active:scale-95"
                    >
                        <span>📊</span> Exportar CSV
                    </button>
                    <button
                        onClick={() => { setPage(1); fetchBills(); }}
                        className="p-3.5 bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-2xl text-gray-600 hover:text-blue-600 shadow-lg shadow-black/5 transition-all active:scale-90"
                    >
                        <RefreshCcwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl shadow-black/5 border border-gray-100 dark:border-dark-700 overflow-hidden animate-slide-up">
                <div className="overflow-x-auto custom-scroll">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100/50 dark:bg-dark-750 border-b border-gray-100 dark:border-dark-700">
                                <th className="px-4 py-5 w-10"></th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ambiente</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Total</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado SRI</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-700 text-sm">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No hay facturas registradas.
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <React.Fragment key={bill.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-dark-750 transition-colors">
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => toggleBillExpansion(bill.id)}
                                                    className={`p-1.5 rounded-lg transition-transform duration-200 ${expandedBillIds.has(bill.id) ? 'rotate-180 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'text-gray-400'}`}
                                                >
                                                    <ChevronDownIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-900 dark:text-gray-100">{bill.documentNumber}</div>
                                                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                    <HistoryIcon className="w-3 h-3" /> {bill.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{bill.customerName}</div>
                                                <div className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase tracking-wider">{bill.customerIdentification}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {bill.environment === '2' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 uppercase">
                                                        PRODUCCIÓN
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 uppercase">
                                                        PRUEBAS
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(() => {
                                                    const displayTotal = (bill.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
                                                    const displaySubtotal = displayTotal / 1.15;
                                                    return (
                                                        <>
                                                            <div className="font-black text-blue-600 dark:text-blue-400 text-base">${displayTotal.toFixed(2)}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">Sub: ${displaySubtotal.toFixed(2)}</div>
                                                        </>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center mb-1.5">
                                                    {getStatusBadge(bill)}
                                                </div>
                                                <div className="text-[8px] font-mono text-gray-400 bg-gray-50 dark:bg-dark-900 px-2 py-1 rounded-md border border-gray-100 dark:border-dark-700 max-w-[140px] truncate mx-auto" title={bill.accessKey}>
                                                    {bill.accessKey}
                                                </div>
                                                {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                                                    <div
                                                        onClick={() => {
                                                            setSelectedBillForXml(bill);
                                                            setIsXmlModalOpen(true);
                                                        }}
                                                        className="mt-2 text-[7px] font-bold text-gray-400 dark:text-gray-500 leading-tight max-w-[140px] mx-auto italic uppercase tracking-tighter cursor-pointer hover:text-blue-500 text-center"
                                                        title="Haz clic para ver el XML técnico"
                                                    >
                                                        {(() => {
                                                            const msg = (bill.sriMessage || '').toLowerCase();
                                                            const status = bill.sriStatus || '';

                                                            const isUser = msg.includes('identificacion') || msg.includes('ruc') || msg.includes('secuencial') || msg.includes('datos') || msg.includes('cliente') || msg.includes('razon social') || msg.includes('email') || msg.includes('estructura') || msg.includes('impuesto');
                                                            const isSRI = msg.includes('sri') || msg.includes('interno') || msg.includes('servidor') || msg.includes('mantenimiento') || msg.includes('conexion') || msg.includes('timeout') || msg.includes('500');

                                                            if (isUser) return 'FALLO: ERROR DEL USUARIO (VER XML)';
                                                            if (isSRI) return 'FALLO: ERROR DEL SRI (VER XML)';

                                                            if (status === 'DEVUELTA' || status === 'RECHAZADA') return 'FALLO: ERROR DEL USUARIO (VER XML)';
                                                            if (status === 'ERROR' || status === 'TIMEOUT' || status === 'PENDING') return 'FALLO: ERROR DEL SRI (VER XML)';

                                                            return 'FALLO: ERROR DEL SRI (VER XML)';
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {/* ── Acciones agrupadas en un solo pill ── */}
                                                <div className="flex justify-end">
                                                    <div className="inline-flex items-center gap-0.5 bg-gray-100 dark:bg-dark-700 rounded-2xl p-1 border border-gray-200 dark:border-dark-600">

                                                        {/* ── GRUPO 1: Documentos ── */}
                                                        <button
                                                            onClick={() => window.open(`${API_BASE_URL}/bills/${bill.id}/pdf`, '_blank')}
                                                            className="p-1.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600 dark:text-gray-400 transition-all"
                                                            title="Ver RIDE (PDF)"
                                                        >
                                                            <PrinterIcon className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => window.open(`${API_BASE_URL}/bills/${bill.id}/pdf?format=ticket`, '_blank')}
                                                            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-dark-600 dark:text-gray-400 transition-all"
                                                            title="Imprimir Ticket"
                                                        >
                                                            <div className="flex items-center justify-center w-3.5 h-3.5 border border-current rounded-[3px] text-[7px] font-bold leading-none">T</div>
                                                        </button>

                                                        <button
                                                            onClick={() => window.open(`${API_BASE_URL}/bills/${bill.id}/xml`, '_blank')}
                                                            disabled={!bill.accessKey}
                                                            className="p-1.5 rounded-xl text-orange-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title={bill.accessKey ? 'Descargar XML Firmado' : 'XML no disponible (factura no enviada al SRI)'}
                                                        >
                                                            <div className="flex items-center justify-center w-3.5 h-3.5 border border-current rounded-[3px] text-[6px] font-bold leading-none">XML</div>
                                                        </button>

                                                        {/* ── Divisor ── */}
                                                        <div className="w-px h-4 bg-gray-300 dark:bg-dark-500 mx-0.5" />

                                                        {/* ── GRUPO 2: Gestión ── */}

                                                        {/* Editar — solo si no está autorizado/cancelado */}
                                                        {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedBillForEdit(bill); setIsEditModalOpen(true); }}
                                                                className="p-1.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600 dark:text-gray-400 transition-all"
                                                                title="Editar datos del cliente"
                                                            >
                                                                <EditIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Reintentar / Verificar estado */}
                                                        {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!bill.accessKey || bill.sriStatus === 'BORRADOR' || bill.sriStatus === 'ERROR') {
                                                                        await handleReSubmit(bill);
                                                                    } else {
                                                                        await handleCheckStatus(bill);
                                                                    }
                                                                }}
                                                                className={`p-1.5 rounded-xl transition-all ${(!bill.accessKey || bill.sriStatus === 'BORRADOR')
                                                                    ? 'text-orange-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600'
                                                                    : 'text-blue-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600'}`}
                                                                title={(!bill.accessKey || bill.sriStatus === 'BORRADOR') ? 'Re-intentar envío SRI' : 'Verificar estado SRI'}
                                                            >
                                                                <RefreshCcwIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Nota de Crédito */}
                                                        <button
                                                            disabled={
                                                                bill.sriStatus?.trim().toUpperCase() !== 'AUTORIZADO' ||
                                                                bill.hasCreditNote ||
                                                                bill.customerIdentification?.trim() === '9999999999999'
                                                            }
                                                            onClick={(e) => { e.stopPropagation(); setSelectedBillForCreditNote(bill); }}
                                                            className={`p-1.5 rounded-xl transition-all ${bill.sriStatus?.trim().toUpperCase() === 'AUTORIZADO' && !bill.hasCreditNote && bill.customerIdentification?.trim() !== '9999999999999'
                                                                ? 'text-gray-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600 cursor-pointer'
                                                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
                                                                }`}
                                                            title={
                                                                bill.sriStatus?.trim().toUpperCase() !== 'AUTORIZADO' ? 'Solo facturas AUTORIZADAS'
                                                                    : bill.hasCreditNote ? 'Ya tiene Nota de Crédito'
                                                                        : bill.customerIdentification?.trim() === '9999999999999' ? 'No aplica para Consumidor Final'
                                                                            : 'Emitir Nota de Crédito'
                                                            }
                                                        >
                                                            <FileTextIcon className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Eliminar */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm('¿Eliminar factura?')) {
                                                                    try {
                                                                        setIsLoading(true);
                                                                        await billingService.delete(bill.id);
                                                                        await fetchBills();
                                                                    } catch (error) {
                                                                        console.error('Error:', error);
                                                                    } finally {
                                                                        setIsLoading(false);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-dark-600 transition-all"
                                                            title="Eliminar Registro"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>

                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* EXPANDED SECTION: ITEMS DETAIL */}
                                        {expandedBillIds.has(bill.id) && (
                                            <tr className="bg-gray-50/30 dark:bg-dark-900/40 animate-in slide-in-from-top-2 duration-300">
                                                <td colSpan={7} className="px-6 py-6 pb-8 border-b border-gray-100 dark:border-dark-700">
                                                    <div className="max-w-3xl mx-auto space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                                                <LayoutIcon className="w-3 h-3" /> Detalle de Productos Consumidos
                                                            </h4>
                                                        </div>
                                                        <div className="bg-white dark:bg-dark-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-dark-700 shadow-sm">
                                                            <table className="w-full text-xs border-collapse">
                                                                <thead className="bg-gray-50/50 dark:bg-dark-750 text-gray-400 font-bold uppercase tracking-widest text-[9px] border-b border-gray-100 dark:border-dark-700">
                                                                    <tr>
                                                                        <th className="px-5 py-3 text-left">Producto</th>
                                                                        <th className="px-5 py-3 text-center w-24">Cant.</th>
                                                                        <th className="px-5 py-3 text-right w-32">P. Unit.</th>
                                                                        <th className="px-5 py-3 text-right w-32">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50 dark:divide-dark-750">
                                                                    {bill.items?.map((item, idx) => (
                                                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-dark-700/50 transition-colors">
                                                                            <td className="px-5 py-4 font-bold text-gray-700 dark:text-gray-300">{item.name}</td>
                                                                            <td className="px-5 py-4 text-center font-bold text-gray-500">{item.quantity}</td>
                                                                            <td className="px-5 py-4 text-right font-medium text-gray-500">${(item.price || 0).toFixed(2)}</td>
                                                                            <td className="px-5 py-4 text-right font-black text-gray-700 dark:text-gray-300">${(item.total || 0).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot className="bg-gray-50/20 dark:bg-dark-750/30 border-t border-gray-100 dark:border-dark-700">
                                                                    {(() => {
                                                                        const displayTotal = (bill.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
                                                                        const displaySubtotal = displayTotal / 1.15;
                                                                        const displayTax = displayTotal - displaySubtotal;
                                                                        return (
                                                                            <>
                                                                                <tr>
                                                                                    <td colSpan={3} className="px-5 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Sin Impuestos</td>
                                                                                    <td className="px-5 py-3 text-right font-bold text-gray-600 dark:text-gray-400">${displaySubtotal.toFixed(2)}</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td colSpan={3} className="px-5 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">IVA (15%)</td>
                                                                                    <td className="px-5 py-3 text-right font-bold text-gray-600 dark:text-gray-400">${displayTax.toFixed(2)}</td>
                                                                                </tr>
                                                                                <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                                                                    <td colSpan={3} className="px-5 py-4 text-right text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total Factura</td>
                                                                                    <td className="px-5 py-4 text-right font-black text-blue-700 dark:text-blue-300 text-sm">${displayTotal.toFixed(2)}</td>
                                                                                </tr>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación Estilo Premium */}
                <div className="px-6 py-8 bg-gray-50/50 dark:bg-dark-750/50 border-t border-gray-100 dark:border-dark-700 flex flex-col md:flex-row items-center justify-between gap-6">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest order-2 md:order-1">
                        Mostrando {bills.length} de {total} comprobantes
                    </span>

                    <div className="flex items-center gap-4 order-1 md:order-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            aria-label="Anterior"
                            className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all shadow-xl shadow-black/5 active:scale-90"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-5 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-inner">
                                PÁGINA {page}
                            </span>
                        </div>

                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={bills.length < limit}
                            aria-label="Siguiente"
                            className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all shadow-xl shadow-black/5 active:scale-90"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden md:block w-[200px] order-3"></div>
                </div>
            </div>


            {/* Credit Note Modal */}
            {
                selectedBillForCreditNote && (
                    <CreditNoteModal
                        bill={selectedBillForCreditNote}
                        isOpen={!!selectedBillForCreditNote}
                        onClose={() => setSelectedBillForCreditNote(null)}
                        onSuccess={() => {
                            // No cerramos el modal aquí para permitir que el usuario vea el resultado "Autorizado"
                            // El cierre se maneja vía onClose o botón "Continuar" del modal interno
                            fetchBills();
                        }}
                    />
                )
            }

            <InvoiceProcessingModal
                isOpen={isProcessingModalOpen}
                currentState={processingState}
                message={processingMessage}
                details={processingDetails}
                invoiceNumber={generatedInvoiceNumber}
                onClose={handleCloseProcessingModal}
                onPrint={undefined}
                onGoToHistory={undefined}
            />

            {/* XML Viewer Modal */}
            <XMLViewerModal
                isOpen={isXmlModalOpen}
                onClose={() => setIsXmlModalOpen(false)}
                xmlContent={selectedBillForXml?.xmlContent || ''}
                documentNumber={selectedBillForXml?.documentNumber}
            />

            {/* Edit Bill Modal */}
            <EditBillModal
                isOpen={isEditModalOpen}
                bill={selectedBillForEdit}
                onClose={() => setIsEditModalOpen(false)}
                onSave={async (id, data) => {
                    await billingService.updateBill(id, data);
                    await fetchBills();
                }}
            />
        </div >
    );
};

export default BillingHistory;
