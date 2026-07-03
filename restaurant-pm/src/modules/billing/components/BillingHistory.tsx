/**
 * Componente: BillingHistory
 * Descripción: Vista principal para el historial de facturación electrónica.
 * Permite buscar, filtrar, autorizar, consultar estado y emitir notas de crédito.
 * Organizado en pestañas: Facturas y Notas de Crédito.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billingService } from '../services/BillingService';
import { orderService } from '../../orders/services/OrderService';
import { OrderStatus } from '../../orders/types/order.types';
import { Bill, CreditNote } from '../types/billing.types';
import { API_BASE_URL } from '../../../config/api.config';
import CreditNoteModal from './CreditNoteModal.tsx';
import InvoiceProcessingModal, { InvoiceProcessState } from './InvoiceProcessingModal';
import { XMLViewerModal } from './XMLViewerModal';
import { EditBillModal } from './EditBillModal';
import ErrorLogPanel from './ErrorLogPanel';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useAuth } from '../../auth';
import { toast } from '../../../components/ui/AlertProvider';

import {
    SearchIcon,
    PrinterIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    RefreshCcwIcon,
    FileTextIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    TrashIcon,
    LayoutIcon,
    HistoryIcon,
    CalendarIcon,
    ChevronDownIcon,
    EditIcon,
} from '../../../components/ui/Icons';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'invoices' | 'creditNotes' | 'noInvoiceSales';

// Mapeo entre slugs de URL y pestañas internas.
// URLs: /admin/billing/facturas | /admin/billing/notas-credito | /admin/billing/ventas-sin-factura
const TAB_BY_SLUG: Record<string, TabType> = {
    'facturas': 'invoices',
    'notas-credito': 'creditNotes',
    'ventas-sin-factura': 'noInvoiceSales',
};
const SLUG_BY_TAB: Record<TabType, string> = {
    invoices: 'facturas',
    creditNotes: 'notas-credito',
    noInvoiceSales: 'ventas-sin-factura',
};

// FIX M-06: Generate valid year options dynamically with range validation
const BILLING_START_YEAR = 2024; // First year the system was in use
const generateYearOptions = (): string[] => {
    const currentYear = new Date().getFullYear();
    // Validate range: from start year to current year + 1 (allow next year for planning)
    const endYear = Math.min(currentYear + 1, 2099); // Cap at reasonable future
    const startYear = Math.max(BILLING_START_YEAR, 2000); // Cap at reasonable past
    const years: string[] = [];
    for (let year = endYear; year >= startYear; year--) {
        years.push(year.toString());
    }
    return years;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

const BillingHistory: React.FC = () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Autenticación
    // ─────────────────────────────────────────────────────────────────────────
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role?.name === 'Administrador';

    // ─────────────────────────────────────────────────────────────────────────
    // Estado para pestañas — derivado de la URL (/admin/billing/:tab)
    // Permite compartir enlaces directos a cada sección y usar el botón atrás.
    // ─────────────────────────────────────────────────────────────────────────
    const { tab: tabSlug } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const activeTab: TabType = TAB_BY_SLUG[tabSlug ?? ''] ?? 'invoices';
    const setActiveTab = (tab: TabType) => navigate(`/admin/billing/${SLUG_BY_TAB[tab]}`);

    // Normalizar slugs inválidos (ej. /admin/billing/xyz) a la pestaña de facturas
    useEffect(() => {
        if (tabSlug && !TAB_BY_SLUG[tabSlug]) {
            navigate(`/admin/billing/${SLUG_BY_TAB.invoices}`, { replace: true });
        }
    }, [tabSlug, navigate]);

    // ─────────────────────────────────────────────────────────────────────────
    // Estado para Facturas
    // ─────────────────────────────────────────────────────────────────────────
    const [bills, setBills] = useState<Bill[]>([]);
    const [billsLoading, setBillsLoading] = useState(true);
    const [billsPage, setBillsPage] = useState(1);
    const [billsTotal, setBillsTotal] = useState(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Estado para Notas de Crédito
    // ─────────────────────────────────────────────────────────────────────────
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [creditNotesLoading, setCreditNotesLoading] = useState(true);
    const [creditNotesPage, setCreditNotesPage] = useState(1);
    const [creditNotesTotal, setCreditNotesTotal] = useState(0);

    // Estado para Ventas Sin Factura
    const [manualSales, setManualSales] = useState<any[]>([]);
    const [manualSalesLoading, setManualSalesLoading] = useState(false);
    const [manualSalesPage, setManualSalesPage] = useState(1);
    const [manualSalesTotal, setManualSalesTotal] = useState(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Estado compartido
    // ─────────────────────────────────────────────────────────────────────────
    const [limit] = useState(15);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [idSearch, setIdSearch] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedBillForCreditNote, setSelectedBillForCreditNote] = useState<Bill | null>(null);

    // Estados para el modal de procesamiento
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
    const [processingState, setProcessingState] = useState<InvoiceProcessState>(InvoiceProcessState.IDLE);
    const [processingMessage, setProcessingMessage] = useState('');
    const [processingDetails, setProcessingDetails] = useState('');
    const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
    // FIX I-05: Track which document is being checked to prevent duplicate requests
    const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

    // Estados para modales
    const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedBillForXml, setSelectedBillForXml] = useState<Bill | null>(null);
    const [selectedBillForEdit, setSelectedBillForEdit] = useState<Bill | null>(null);

    // Estados para modales de confirmación
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
        isOpen: boolean;
        type: 'bill' | 'creditNote' | 'manualSale';
        id: string;
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'bill',
        id: '',
        title: '',
        message: ''
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIONES DE ELIMINACIÓN CON MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    const openDeleteModal = (type: 'bill' | 'creditNote' | 'manualSale', id: string) => {
        const titles = {
            bill: 'Eliminar Factura',
            creditNote: 'Eliminar Nota de Crédito',
            manualSale: 'Eliminar Registro de Venta'
        };
        const messages = {
            bill: '¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.',
            creditNote: '¿Estás seguro de que deseas eliminar esta nota de crédito? Esta acción no se puede deshacer.',
            manualSale: '¿Estás seguro de que deseas eliminar este registro de venta? Esta acción no se puede deshacer.'
        };
        setDeleteConfirmModal({
            isOpen: true,
            type,
            id,
            title: titles[type],
            message: messages[type]
        });
    };

    const handleDeleteConfirm = async () => {
        const { type, id } = deleteConfirmModal;
        try {
            if (type === 'bill') {
                setBillsLoading(true);
                await billingService.delete(id);
                await fetchBills();
                toast.success('Factura eliminada correctamente', 'Éxito');
            } else if (type === 'creditNote') {
                setCreditNotesLoading(true);
                await billingService.deleteCreditNote(id);
                await fetchCreditNotes();
                await fetchBills();
                toast.success('Nota de crédito eliminada correctamente', 'Éxito');
            } else if (type === 'manualSale') {
                setManualSalesLoading(true);
                await orderService.delete(id);
                await fetchManualSales();
                toast.success('Registro de venta eliminado correctamente', 'Éxito');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al eliminar el registro', 'Error');
        } finally {
            setBillsLoading(false);
            setCreditNotesLoading(false);
            setManualSalesLoading(false);
            setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIONES DE CARGA DE DATOS
    // ═══════════════════════════════════════════════════════════════════════════

    const fetchBills = async () => {
        setBillsLoading(true);
        try {
            const params: any = {
                page: billsPage,
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
                setBillsTotal(response.pagination?.total || response.data.length);
            } else {
                setBills(Array.isArray(response) ? response : []);
                setBillsTotal(Array.isArray(response) ? response.length : 0);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setBillsLoading(false);
        }
    };

    const fetchCreditNotes = async () => {
        setCreditNotesLoading(true);
        try {
            const params: any = {
                page: creditNotesPage,
                limit,
                sort: { createdAt: -1 }
            };

            if (searchTerm) params.customerIdentification = searchTerm;

            const response = await billingService.getCreditNotes(params);

            if (response && response.data) {
                setCreditNotes(response.data);
                setCreditNotesTotal(response.pagination?.total || response.data.length);
            } else {
                setCreditNotes(Array.isArray(response) ? response : []);
                setCreditNotesTotal(Array.isArray(response) ? response.length : 0);
            }
        } catch (error) {
            console.error('Error fetching credit notes:', error);
        } finally {
            setCreditNotesLoading(false);
        }
    };

    const fetchManualSales = async () => {
        setManualSalesLoading(true);
        try {
            const params: any = {
                page: manualSalesPage,
                limit,
                status: OrderStatus.Completed,
                billingType: 'Sin Factura',
                sort: { createdAt: -1 }
            };

            if (searchTerm) {
                params.customerName = searchTerm;
            }

            const response = await orderService.getAll(params);

            if (response) {
                let salesList: any[] = [];
                let totalCount: number = 0;

                if (response.data) {
                    if (Array.isArray(response.data)) {
                        salesList = response.data;
                        totalCount = response.data.length;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        salesList = response.data.data;
                        totalCount = response.data.pagination?.total || response.data.data.length;
                    }
                } else if (Array.isArray(response)) {
                    salesList = response;
                    totalCount = response.length;
                }

                setManualSales(salesList);
                setManualSalesTotal(totalCount);
            }
        } catch (error) {
            console.error('Error fetching manual sales:', error);
            setManualSales([]);
            setManualSalesTotal(0);
        } finally {
            setManualSalesLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // EFECTOS
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (activeTab === 'invoices') {
            fetchBills();
        }
    }, [billsPage, activeTab]);

    useEffect(() => {
        if (activeTab === 'creditNotes') {
            fetchCreditNotes();
        }
    }, [creditNotesPage, activeTab]);

    useEffect(() => {
        if (activeTab === 'noInvoiceSales') {
            fetchManualSales();
        }
    }, [manualSalesPage, activeTab]);

    // FIX M-08: Reset page to 1 when filter criteria changes (year)
    // This prevents showing an empty page when filters reduce total results
    useEffect(() => {
        if (activeTab === 'invoices' && billsPage !== 1) {
            setBillsPage(1);
        } else if (activeTab === 'invoices') {
            fetchBills();
        }
    }, [selectedYear]);

    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'invoices') {
            setBillsPage(1);
            fetchBills();
        } else if (activeTab === 'creditNotes') {
            setCreditNotesPage(1);
            fetchCreditNotes();
        } else {
            setManualSalesPage(1);
            fetchManualSales();
        }
    };

    const toggleExpansion = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const handleCheckStatus = async (bill: Bill) => {
        if (!bill.accessKey) return;
        // FIX I-05: Prevent duplicate requests
        if (checkingStatusId === bill.id) return;

        setCheckingStatusId(bill.id);
        setIsProcessingModalOpen(true);
        setGeneratedInvoiceNumber(bill.documentNumber || '');

        try {
            setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
            setProcessingMessage('Consultando estado en SRI');
            setProcessingDetails('Verificando si la factura ya fue autorizada...');
            await new Promise(resolve => setTimeout(resolve, 800));

            const result = await billingService.checkStatus(bill.accessKey);

            const status = result.authorization?.estado || result.estado || result.authResult?.estado || result.sriResponse?.estado;

            if (status === 'AUTORIZADO') {
                setProcessingState(InvoiceProcessState.AUTHORIZED);
                setProcessingMessage('¡Factura autorizada con éxito!');
                setProcessingDetails('La factura fue generada, recibida y autorizada por el SRI.');
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
        } finally {
            // FIX I-05: Clear checking state when done
            setCheckingStatusId(null);
        }
    };

    const handleCheckCreditNoteStatus = async (creditNote: CreditNote) => {
        if (!creditNote.accessKey) return;
        // FIX I-05: Prevent duplicate requests
        if (checkingStatusId === creditNote.id) return;

        setCheckingStatusId(creditNote.id);
        setIsProcessingModalOpen(true);
        setGeneratedInvoiceNumber(creditNote.documentNumber || '');

        try {
            setProcessingState(InvoiceProcessState.WAITING_AUTHORIZATION);
            setProcessingMessage('Consultando estado en SRI');
            setProcessingDetails('Verificando si la nota de crédito fue autorizada...');
            await new Promise(resolve => setTimeout(resolve, 800));

            const result = await billingService.checkCreditNoteStatus(creditNote.accessKey);

            const status = result.authorization?.estado || result.status || result.estado;

            if (result.success === false && result.error) {
                // El backend informa el motivo (ej. límite diario de envíos al SRI alcanzado)
                const isLimit = result.error.startsWith('SRI_LIMIT_REACHED');
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage(isLimit ? 'Límite diario de envíos alcanzado' : 'No se pudo verificar');
                setProcessingDetails(result.error.replace('SRI_LIMIT_REACHED: ', ''));
            } else if (status === 'AUTORIZADO') {
                setProcessingState(InvoiceProcessState.AUTHORIZED);
                setProcessingMessage('¡Nota de Crédito autorizada!');
                setProcessingDetails('La nota de crédito fue autorizada por el SRI.');
            } else if (status === 'DEVUELTA') {
                setProcessingState(InvoiceProcessState.ERROR);
                setProcessingMessage('Nota de Crédito DEVUELTA');
                setProcessingDetails('El SRI rechazó la nota de crédito.');
            } else {
                setProcessingState(InvoiceProcessState.PENDING);
                setProcessingMessage('En proceso');
                setProcessingDetails('La nota de crédito sigue en proceso de autorización.');
            }

            await fetchCreditNotes();

        } catch (error) {
            console.error('Error checking credit note status:', error);
            setProcessingState(InvoiceProcessState.ERROR);
            setProcessingMessage('Error al consultar SRI');
            setProcessingDetails(error instanceof Error ? error.message : 'Error desconocido');
        } finally {
            // FIX I-05: Clear checking state when done
            setCheckingStatusId(null);
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
        setBillsLoading(true);
        try {
            const params: any = {
                limit: 5000,
                sort: { date: 1 }
            };

            if (selectedYear && selectedYear !== 'all') {
                params.startDate = `${selectedYear}-01-01`;
                params.endDate = `${selectedYear}-12-31`;
            }

            const response = await billingService.getAll(params);
            const allBills = response.data || [];

            if (allBills.length === 0) {
                toast.warning('No hay facturas en este periodo para exportar.', 'Sin Datos');
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
                `'${b.accessKey || ''}`
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
            toast.error('Error al exportar los datos. Intenta de nuevo.', 'Error');
        } finally {
            setBillsLoading(false);
        }
    };

    const handleCloseProcessingModal = () => {
        setIsProcessingModalOpen(false);
        setProcessingState(InvoiceProcessState.IDLE);
        setProcessingMessage('');
        setProcessingDetails('');
        setGeneratedInvoiceNumber('');
    };

    const calculateOrderTotals = (items: any[]) => {
        let subtotal0 = 0;
        let subtotal15 = 0;
        let iva15 = 0;
        let total = 0;
        let totalInclusive15 = 0;

        items.forEach((item: any) => {
            const itemTotal = (item.price || 0) * (item.quantity || 0);
            total += itemTotal;

            const itemTaxRate = item.taxRate !== undefined ? item.taxRate : 15;
            if (itemTaxRate > 0) {
                // Redondear cada item a 2 decimales (igual que el backend)
                const base = parseFloat((itemTotal / (1 + (itemTaxRate / 100))).toFixed(2));
                const iva = parseFloat((itemTotal - base).toFixed(2));
                subtotal15 += base;
                iva15 += iva;
                totalInclusive15 += itemTotal;
            } else {
                subtotal0 += itemTotal;
            }
        });

        // Penny adjustment para IVA 15% (igual que el backend)
        if (totalInclusive15 > 0) {
            const targetSubtotal15 = parseFloat((totalInclusive15 / 1.15).toFixed(2));
            const difference = parseFloat((targetSubtotal15 - subtotal15).toFixed(2));
            if (Math.abs(difference) > 0 && Math.abs(difference) < 0.10) {
                subtotal15 = targetSubtotal15;
                iva15 = parseFloat((totalInclusive15 - subtotal15).toFixed(2));
            }
        }

        return {
            subtotal0: parseFloat(subtotal0.toFixed(2)),
            subtotal15: parseFloat(subtotal15.toFixed(2)),
            iva15: parseFloat(iva15.toFixed(2)),
            total: parseFloat(total.toFixed(2))
        };
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS DE RENDERIZADO
    // ═══════════════════════════════════════════════════════════════════════════

    const getStatusBadge = (status: string | undefined, hasCreditNote?: boolean) => {
        if (hasCreditNote === true || status === 'CANCELLED') {
            return (
                <span className="flex items-center gap-1 text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 uppercase tracking-tighter">
                    <AlertCircleIcon className="w-3 h-3" /> ANULADO (NC)
                </span>
            );
        }

        const s = status?.toUpperCase() || 'UNKNOWN';
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

    const isLoading = activeTab === 'invoices'
        ? billsLoading
        : activeTab === 'creditNotes'
            ? creditNotesLoading
            : manualSalesLoading;

    // ─────────────────────────────────────────────────────────────────────────
    // Acciones compartidas entre la tabla (desktop) y las tarjetas (móvil)
    // ─────────────────────────────────────────────────────────────────────────
    const renderBillActions = (bill: Bill) => (
        <div className="inline-flex items-center gap-0.5 bg-gray-100 dark:bg-dark-700 rounded-2xl p-1 border border-gray-200 dark:border-dark-600">
            {/* Documentos */}
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
                title={bill.accessKey ? 'Descargar XML Firmado' : 'XML no disponible'}
            >
                <div className="flex items-center justify-center w-3.5 h-3.5 border border-current rounded-[3px] text-[6px] font-bold leading-none">XML</div>
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-dark-500 mx-0.5" />

            {/* Gestión */}
            {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedBillForEdit(bill); setIsEditModalOpen(true); }}
                    className="p-1.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600 dark:text-gray-400 transition-all"
                    title="Editar datos del cliente"
                >
                    <EditIcon className="w-3.5 h-3.5" />
                </button>
            )}

            {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                <button
                    disabled={checkingStatusId === bill.id}
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (!bill.accessKey || bill.sriStatus === 'BORRADOR' || bill.sriStatus === 'ERROR') {
                            await handleReSubmit(bill);
                        } else {
                            await handleCheckStatus(bill);
                        }
                    }}
                    className={`p-1.5 rounded-xl transition-all ${checkingStatusId === bill.id ? 'opacity-50 cursor-not-allowed' : ''} ${(!bill.accessKey || bill.sriStatus === 'BORRADOR')
                        ? 'text-orange-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600'
                        : 'text-blue-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600'}`}
                    title={checkingStatusId === bill.id ? 'Verificando...' : ((!bill.accessKey || bill.sriStatus === 'BORRADOR') ? 'Re-intentar envío SRI' : 'Verificar estado SRI')}
                >
                    <RefreshCcwIcon className={`w-3.5 h-3.5 ${checkingStatusId === bill.id ? 'animate-spin' : ''}`} />
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
                onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal('bill', bill.id);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-dark-600 transition-all"
                title="Eliminar Registro"
            >
                <TrashIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );

    const renderCreditNoteActions = (cn: CreditNote) => (
        <div className="inline-flex items-center gap-0.5 bg-gray-100 dark:bg-dark-700 rounded-2xl p-1 border border-gray-200 dark:border-dark-600">
            {/* PDF */}
            <button
                onClick={() => window.open(`${API_BASE_URL}/credit-notes/${cn.id}/pdf`, '_blank')}
                className="p-1.5 rounded-xl text-gray-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600 dark:text-gray-400 transition-all"
                title="Ver PDF"
            >
                <PrinterIcon className="w-3.5 h-3.5" />
            </button>

            {/* XML */}
            <button
                onClick={() => window.open(`${API_BASE_URL}/credit-notes/${cn.id}/xml`, '_blank')}
                disabled={!cn.accessKey}
                className="p-1.5 rounded-xl text-orange-500 hover:text-orange-600 hover:bg-white dark:hover:bg-dark-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={cn.accessKey ? 'Descargar XML' : 'XML no disponible'}
            >
                <div className="flex items-center justify-center w-3.5 h-3.5 border border-current rounded-[3px] text-[6px] font-bold leading-none">XML</div>
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-dark-500 mx-0.5" />

            {/* Verificar Estado */}
            {cn.sriStatus !== 'AUTORIZADO' && (
                <button
                    disabled={checkingStatusId === cn.id}
                    onClick={() => handleCheckCreditNoteStatus(cn)}
                    className={`p-1.5 rounded-xl text-blue-500 hover:text-blue-600 hover:bg-white dark:hover:bg-dark-600 transition-all ${checkingStatusId === cn.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={checkingStatusId === cn.id ? 'Verificando...' : 'Verificar estado SRI'}
                >
                    <RefreshCcwIcon className={`w-3.5 h-3.5 ${checkingStatusId === cn.id ? 'animate-spin' : ''}`} />
                </button>
            )}

            {/* Eliminar (Solo Admin) */}
            {isAdmin && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal('creditNote', cn.id);
                    }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-dark-600 transition-all"
                    title="Eliminar Nota de Crédito"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    const printSaleTicket = (sale: any) => {
        const totals = calculateOrderTotals(sale.items || []);
        const saleId = sale.id || sale._id;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
            <head>
                <title>Ticket de Venta</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 5px; font-size: 12px; line-height: 1.4; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="center bold" style="font-size: 16px;">PICANTERÍA MIRAFLORES</div>
                <div class="center">COMPROBANTE DE VENTA INTERNA</div>
                <div class="divider"></div>
                <div><b>Pedido:</b> ${sale.orderNumber || saleId}</div>
                <div><b>Fecha:</b> ${new Date(sale.createdAt).toLocaleString()}</div>
                <div><b>Cliente:</b> ${sale.customerName || 'Consumidor Final'}</div>
                <div class="divider"></div>
                <table>
                    <thead>
                        <tr class="bold">
                            <td>Cant</td>
                            <td>Detalle</td>
                            <td class="text-right">Total</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${(sale.items || []).map((item: any) => `
                            <tr>
                                <td>${item.quantity}</td>
                                <td>${item.name}</td>
                                <td class="text-right">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="text-right">Subtotal 15%: $${totals.subtotal15.toFixed(2)}</div>
                <div class="text-right">IVA 15%: $${totals.iva15.toFixed(2)}</div>
                <div class="text-right">Subtotal 0%: $${totals.subtotal0.toFixed(2)}</div>
                <div class="text-right bold" style="font-size: 14px;">TOTAL: $${totals.total.toFixed(2)}</div>
                <div class="divider"></div>
                <div class="center bold">¡GRACIAS POR SU VISITA!</div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* ═══════════════════════════════════════════════════════════════════
                CABECERA
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        Facturación
                    </h1>
                    <p className="text-[9px] md:text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        GESTIÓN DE DOCUMENTOS ELECTRÓNICOS
                    </p>
                </div>

                {/* Barra de Filtros */}
                <div className="flex flex-col md:flex-row gap-3 w-full lg:flex-1 lg:max-w-3xl">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 w-full">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={activeTab === 'noInvoiceSales' ? "Buscar Cliente..." : "Buscar RUC / Cédula..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-700 pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                            />
                        </div>
                        {activeTab === 'invoices' && (
                            <>
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
                                    {/* FIX M-06: Dynamic year options with validation */}
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="appearance-none w-full md:w-32 rounded-2xl border border-gray-200 bg-gray-50 dark:bg-dark-800 dark:border-dark-700 pl-11 pr-8 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                                    >
                                        {generateYearOptions().map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                        <option value="all">TODOS</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                </div>
                            </>
                        )}
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Buscar
                        </button>
                    </form>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                    {activeTab === 'invoices' && (
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-green-500/20 transition-all active:scale-95"
                        >
                            <span>📊</span> Exportar CSV
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (activeTab === 'invoices') {
                                setBillsPage(1);
                                fetchBills();
                            } else if (activeTab === 'creditNotes') {
                                setCreditNotesPage(1);
                                fetchCreditNotes();
                            } else {
                                setManualSalesPage(1);
                                fetchManualSales();
                            }
                        }}
                        className="p-3.5 bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-2xl text-gray-600 hover:text-blue-600 shadow-lg shadow-black/5 transition-all active:scale-90"
                    >
                        <RefreshCcwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                PESTAÑAS DE NAVEGACIÓN
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex gap-1 sm:gap-2 bg-gray-100 dark:bg-dark-800 p-1 sm:p-1.5 rounded-2xl w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        activeTab === 'invoices'
                            ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <FileTextIcon className="w-4 h-4 hidden sm:block" />
                    Facturas
                    <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                        activeTab === 'invoices'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-200 text-gray-500 dark:bg-dark-600 dark:text-gray-400'
                    }`}>
                        {billsTotal}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('creditNotes')}
                    className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        activeTab === 'creditNotes'
                            ? 'bg-white dark:bg-dark-700 text-orange-600 dark:text-orange-400 shadow-lg'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <AlertCircleIcon className="w-4 h-4 hidden sm:block" />
                    <span className="hidden sm:inline">Notas de Crédito</span>
                    <span className="sm:hidden">N. Crédito</span>
                    <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                        activeTab === 'creditNotes'
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-gray-200 text-gray-500 dark:bg-dark-600 dark:text-gray-400'
                    }`}>
                        {creditNotesTotal}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('noInvoiceSales')}
                    className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        activeTab === 'noInvoiceSales'
                            ? 'bg-white dark:bg-dark-700 text-purple-600 dark:text-purple-400 shadow-lg'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <CheckCircleIcon className="w-4 h-4 hidden sm:block" />
                    <span className="hidden sm:inline">Ventas Sin Factura</span>
                    <span className="sm:hidden">Sin Factura</span>
                    <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full ${
                        activeTab === 'noInvoiceSales'
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-gray-200 text-gray-500 dark:bg-dark-600 dark:text-gray-400'
                    }`}>
                        {manualSalesTotal}
                    </span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                CONTENIDO DE PESTAÑAS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl shadow-black/5 border border-gray-100 dark:border-dark-700 overflow-hidden animate-slide-up">
                <div className="overflow-x-auto custom-scroll">
                    {/* ─────────────────────────────────────────────────────────────
                        FACTURAS — Tarjetas (móvil)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'invoices' && (
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-700">
                            {billsLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-2/3"></div>
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-1/3"></div>
                                    </div>
                                ))
                            ) : bills.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">No hay facturas registradas.</div>
                            ) : (
                                bills.map((bill) => {
                                    const totals = calculateOrderTotals(bill.items || []);
                                    return (
                                        <div key={bill.id} className="p-4 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">{bill.documentNumber}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <HistoryIcon className="w-3 h-3" /> {bill.date}
                                                    </div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1.5 truncate">{bill.customerName}</div>
                                                    <div className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase tracking-wider">{bill.customerIdentification}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <div className="font-black text-blue-600 dark:text-blue-400 text-base">${totals.total.toFixed(2)}</div>
                                                    {getStatusBadge(bill.sriStatus, bill.hasCreditNote)}
                                                    <span className={`text-[8px] font-black uppercase ${bill.environment === '2' ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                        {bill.environment === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <button
                                                    onClick={() => toggleExpansion(bill.id)}
                                                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${expandedIds.has(bill.id) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'}`}
                                                >
                                                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(bill.id) ? 'rotate-180' : ''}`} />
                                                    Detalle
                                                </button>
                                                {renderBillActions(bill)}
                                            </div>
                                            {expandedIds.has(bill.id) && (
                                                <div className="bg-gray-50 dark:bg-dark-900/40 rounded-2xl p-4 space-y-2 animate-slide-down">
                                                    {bill.items?.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between gap-2 text-xs">
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">{item.quantity}× {item.name}</span>
                                                            <span className="font-black text-gray-700 dark:text-gray-300 flex-shrink-0">${(item.total || 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="border-t border-gray-200 dark:border-dark-700 pt-2 mt-2 space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                                            <span>Subtotal</span><span>${(totals.subtotal0 + totals.subtotal15).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                                            <span>IVA (15%)</span><span>${totals.iva15.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-black text-blue-600 dark:text-blue-400 uppercase">
                                                            <span>Total</span><span>${totals.total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                                                        <button
                                                            onClick={() => { setSelectedBillForXml(bill); setIsXmlModalOpen(true); }}
                                                            className="w-full text-center text-[9px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-wider pt-1"
                                                        >
                                                            Ver XML técnico
                                                        </button>
                                                    )}
                                                    <ErrorLogPanel
                                                        errorLog={bill.errorLog || []}
                                                        sriMessage={bill.sriMessage}
                                                        documentNumber={bill.documentNumber}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        TABLA DE FACTURAS (desktop / tablet)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'invoices' && (
                        <table className="w-full text-left border-collapse hidden md:table">
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
                                {billsLoading ? (
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
                                                        onClick={() => toggleExpansion(bill.id)}
                                                        className={`p-1.5 rounded-lg transition-transform duration-200 ${expandedIds.has(bill.id) ? 'rotate-180 bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'text-gray-400'}`}
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
                                                        const totals = calculateOrderTotals(bill.items || []);
                                                        return (
                                                            <>
                                                                <div className="font-black text-blue-600 dark:text-blue-400 text-base">${totals.total.toFixed(2)}</div>
                                                                <div className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">Sub: ${(totals.subtotal0 + totals.subtotal15).toFixed(2)}</div>
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center mb-1.5">
                                                        {getStatusBadge(bill.sriStatus, bill.hasCreditNote)}
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
                                                            VER DETALLES
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end">
                                                        {renderBillActions(bill)}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Section */}
                                            {expandedIds.has(bill.id) && (
                                                <tr className="bg-gray-50/30 dark:bg-dark-900/40 animate-in slide-in-from-top-2 duration-300">
                                                    <td colSpan={7} className="px-6 py-6 pb-8 border-b border-gray-100 dark:border-dark-700">
                                                        <div className="max-w-3xl mx-auto space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <LayoutIcon className="w-3 h-3" /> Detalle de Productos
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
                                                                            const totals = calculateOrderTotals(bill.items || []);
                                                                            const displaySubtotal = totals.subtotal0 + totals.subtotal15;
                                                                            return (
                                                                                <>
                                                                                    <tr>
                                                                                        <td colSpan={3} className="px-5 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Sin Impuestos</td>
                                                                                        <td className="px-5 py-3 text-right font-bold text-gray-600 dark:text-gray-400">${displaySubtotal.toFixed(2)}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td colSpan={3} className="px-5 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">IVA (15%)</td>
                                                                                        <td className="px-5 py-3 text-right font-bold text-gray-600 dark:text-gray-400">${totals.iva15.toFixed(2)}</td>
                                                                                    </tr>
                                                                                    <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                                                                        <td colSpan={3} className="px-5 py-4 text-right text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total Factura</td>
                                                                                        <td className="px-5 py-4 text-right font-black text-blue-700 dark:text-blue-300 text-sm">${totals.total.toFixed(2)}</td>
                                                                                    </tr>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        <ErrorLogPanel
                                                            errorLog={bill.errorLog || []}
                                                            sriMessage={bill.sriMessage}
                                                            documentNumber={bill.documentNumber}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        NOTAS DE CRÉDITO — Tarjetas (móvil)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'creditNotes' && (
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-700">
                            {creditNotesLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-2/3"></div>
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-1/3"></div>
                                    </div>
                                ))
                            ) : creditNotes.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircleIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                        <p>No hay notas de crédito registradas.</p>
                                        <p className="text-xs text-gray-400">Las notas de crédito se generan desde facturas autorizadas.</p>
                                    </div>
                                </div>
                            ) : (
                                creditNotes.map((cn) => (
                                    <div key={cn.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <div className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">{cn.documentNumber}</div>
                                                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                    <HistoryIcon className="w-3 h-3" /> {cn.date}
                                                </div>
                                                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1.5 truncate">{cn.customerName}</div>
                                                <div className="text-[10px] font-bold text-orange-600/60 dark:text-orange-400/60 uppercase tracking-wider">{cn.customerIdentification}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                <div className="font-black text-orange-600 dark:text-orange-400 text-base">-${cn.total.toFixed(2)}</div>
                                                {getStatusBadge(cn.sriStatus)}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl px-3 py-2">
                                            <span className="text-[9px] font-black text-orange-600/70 uppercase tracking-wider block">Motivo</span>
                                            {cn.reasonDescription || cn.reason}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <button
                                                onClick={() => toggleExpansion(cn.id)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${expandedIds.has(cn.id) ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'}`}
                                            >
                                                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(cn.id) ? 'rotate-180' : ''}`} />
                                                Detalle
                                            </button>
                                            {renderCreditNoteActions(cn)}
                                        </div>
                                        {expandedIds.has(cn.id) && (
                                            <div className="bg-gray-50 dark:bg-dark-900/40 rounded-2xl p-4 space-y-2 text-xs animate-slide-down">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-400 uppercase text-[10px]">Factura asociada</span>
                                                    <span className={cn.billDocumentNumber ? 'font-black text-gray-800 dark:text-gray-200' : 'font-mono text-gray-600 dark:text-gray-400'}>
                                                        {cn.billDocumentNumber || (cn.billId ? `REF: ${cn.billId.slice(-8)}` : 'N/A')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-400 uppercase text-[10px]">Subtotal</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">${cn.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-400 uppercase text-[10px]">IVA</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">${cn.tax.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-400 uppercase text-[10px]">Fecha Autorización</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{cn.authorizationDate || 'Pendiente'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-400 uppercase text-[10px] block">Clave de Acceso</span>
                                                    <span className="font-mono text-[10px] text-gray-500 break-all">{cn.accessKey || 'No generada'}</span>
                                                </div>
                                                {cn.errorLog && cn.errorLog.length > 0 && (
                                                    <ErrorLogPanel
                                                        errorLog={cn.errorLog}
                                                        sriMessage={cn.sriMessage}
                                                        documentNumber={cn.documentNumber}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        TABLA DE NOTAS DE CRÉDITO (desktop / tablet)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'creditNotes' && (
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-orange-50/50 dark:bg-dark-750 border-b border-gray-100 dark:border-dark-700">
                                    <th className="px-4 py-5 w-10"></th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nota de Crédito</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Factura Asociada</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado SRI</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-700 text-sm">
                                {creditNotesLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={8} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : creditNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <AlertCircleIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                                <p>No hay notas de crédito registradas.</p>
                                                <p className="text-xs text-gray-400">Las notas de crédito se generan desde facturas autorizadas.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    creditNotes.map((cn) => (
                                        <React.Fragment key={cn.id}>
                                            <tr className="hover:bg-orange-50/30 dark:hover:bg-dark-750 transition-colors">
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleExpansion(cn.id)}
                                                        className={`p-1.5 rounded-lg transition-transform duration-200 ${expandedIds.has(cn.id) ? 'rotate-180 bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'text-gray-400'}`}
                                                    >
                                                        <ChevronDownIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-gray-900 dark:text-gray-100">{cn.documentNumber}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <HistoryIcon className="w-3 h-3" /> {cn.date}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {cn.billDocumentNumber ? (
                                                        <div className="font-black text-gray-800 dark:text-gray-200 text-xs">{cn.billDocumentNumber}</div>
                                                    ) : (
                                                        <span className="text-xs font-mono bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400" title="Factura original no disponible">
                                                            {cn.billId ? `REF: ${cn.billId.slice(-8)}` : 'N/A'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">{cn.customerName}</div>
                                                    <div className="text-[10px] font-bold text-orange-600/60 dark:text-orange-400/60 uppercase tracking-wider">{cn.customerIdentification}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={cn.reasonDescription}>
                                                        {cn.reasonDescription || cn.reason}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-black text-orange-600 dark:text-orange-400 text-base">-${cn.total.toFixed(2)}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">Sub: ${cn.subtotal.toFixed(2)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center mb-1.5">
                                                        {getStatusBadge(cn.sriStatus)}
                                                    </div>
                                                    <div className="text-[8px] font-mono text-gray-400 bg-gray-50 dark:bg-dark-900 px-2 py-1 rounded-md border border-gray-100 dark:border-dark-700 max-w-[140px] truncate mx-auto" title={cn.accessKey}>
                                                        {cn.accessKey || 'Sin clave'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end">
                                                        {renderCreditNoteActions(cn)}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Section for Credit Notes */}
                                            {expandedIds.has(cn.id) && (
                                                <tr className="bg-orange-50/20 dark:bg-dark-900/40 animate-in slide-in-from-top-2 duration-300">
                                                    <td colSpan={8} className="px-6 py-6 border-b border-gray-100 dark:border-dark-700">
                                                        <div className="max-w-2xl mx-auto">
                                                            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 border border-gray-100 dark:border-dark-700 shadow-sm">
                                                                <h4 className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <AlertCircleIcon className="w-3 h-3" /> Información de la Nota de Crédito
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Motivo</span>
                                                                        <p className="font-medium text-gray-700 dark:text-gray-300">{cn.reasonDescription || cn.reason}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Fecha Autorización</span>
                                                                        <p className="font-medium text-gray-700 dark:text-gray-300">{cn.authorizationDate || 'Pendiente'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</span>
                                                                        <p className="font-medium text-gray-700 dark:text-gray-300">${cn.subtotal.toFixed(2)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">IVA</span>
                                                                        <p className="font-medium text-gray-700 dark:text-gray-300">${cn.tax.toFixed(2)}</p>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Clave de Acceso</span>
                                                                        <p className="font-mono text-xs text-gray-500 break-all">{cn.accessKey || 'No generada'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Error Log for Credit Notes */}
                                                            {cn.errorLog && cn.errorLog.length > 0 && (
                                                                <ErrorLogPanel
                                                                    errorLog={cn.errorLog}
                                                                    sriMessage={cn.sriMessage}
                                                                    documentNumber={cn.documentNumber}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        VENTAS SIN FACTURA — Tarjetas (móvil)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'noInvoiceSales' && (
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-700">
                            {manualSalesLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-2/3"></div>
                                        <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-1/3"></div>
                                    </div>
                                ))
                            ) : manualSales.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">No hay ventas registradas sin factura.</div>
                            ) : (
                                manualSales.map((sale) => {
                                    const totals = calculateOrderTotals(sale.items || []);
                                    const saleId = sale.id || sale._id;
                                    return (
                                        <div key={saleId} className="p-4 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">
                                                        {sale.orderNumber ? `PEDIDO #${sale.orderNumber}` : `REF: ${saleId?.slice(-8).toUpperCase()}`}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <HistoryIcon className="w-3 h-3" /> {new Date(sale.createdAt).toLocaleString()}
                                                    </div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1.5 truncate">{sale.customerName || 'Consumidor Final'}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <div className="font-black text-purple-600 dark:text-purple-400 text-base">${totals.total.toFixed(2)}</div>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 uppercase">
                                                        {sale.type || 'En Local'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <button
                                                    onClick={() => toggleExpansion(saleId)}
                                                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${expandedIds.has(saleId) ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'}`}
                                                >
                                                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(saleId) ? 'rotate-180' : ''}`} />
                                                    Detalle
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        title="Imprimir Ticket"
                                                        onClick={() => printSaleTicket(sale)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border border-purple-100 dark:border-purple-800/30"
                                                    >
                                                        🖨️ Ticket
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            title="Eliminar Registro de Venta"
                                                            onClick={() => openDeleteModal('manualSale', saleId)}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border border-red-100 dark:border-red-900/30"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedIds.has(saleId) && (
                                                <div className="bg-purple-50/30 dark:bg-purple-950/10 rounded-2xl p-4 space-y-2 animate-slide-down">
                                                    {(sale.items || []).map((item: any, idx: number) => {
                                                        const itemTotal = (item.price || 0) * (item.quantity || 0);
                                                        return (
                                                            <div key={idx} className="flex justify-between gap-2 text-xs">
                                                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                                                    {item.quantity}× {item.name}
                                                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${item.taxRate === 15 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400'}`}>
                                                                        {item.taxRate === 15 ? '15%' : '0%'}
                                                                    </span>
                                                                </span>
                                                                <span className="font-black text-purple-600 dark:text-purple-400 flex-shrink-0">${itemTotal.toFixed(2)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="border-t border-purple-100 dark:border-purple-900/30 pt-2 mt-2 space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                                            <span>Sub 15%</span><span>${totals.subtotal15.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                                            <span>Sub 0%</span><span>${totals.subtotal0.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-black text-purple-600 dark:text-purple-400 uppercase">
                                                            <span>Total</span><span>${totals.total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        TABLA DE VENTAS SIN FACTURA (desktop / tablet)
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'noInvoiceSales' && (
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-purple-50/50 dark:bg-dark-750 border-b border-gray-100 dark:border-dark-700">
                                    <th className="px-4 py-5 w-10"></th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido / Referencia</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tipo de Pedido</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Total</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado Venta</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-700 text-sm">
                                {manualSalesLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : manualSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No hay ventas registradas sin factura.
                                        </td>
                                    </tr>
                                ) : (
                                    manualSales.map((sale) => {
                                        const totals = calculateOrderTotals(sale.items || []);
                                        const saleId = sale.id || sale._id;
                                        return (
                                            <React.Fragment key={saleId}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-dark-750 transition-colors">
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => toggleExpansion(saleId)}
                                                            className={`p-1.5 rounded-lg transition-transform duration-200 ${expandedIds.has(saleId) ? 'rotate-180 bg-purple-50 text-purple-600 dark:bg-purple-900/20' : 'text-gray-400'}`}
                                                        >
                                                            <ChevronDownIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-gray-900 dark:text-gray-100">
                                                            {sale.orderNumber ? `PEDIDO #${sale.orderNumber}` : `REF: ${saleId?.slice(-8).toUpperCase()}`}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                            <HistoryIcon className="w-3 h-3" /> {new Date(sale.createdAt).toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-800 dark:text-gray-200">{sale.customerName || 'Consumidor Final'}</div>
                                                        <div className="text-[10px] font-bold text-purple-600/60 dark:text-purple-400/60 uppercase tracking-wider">
                                                            Venta Directa
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 uppercase">
                                                            {sale.type || 'En Local'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-black text-purple-600 dark:text-purple-400 text-base">${totals.total.toFixed(2)}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">
                                                            Sub15: ${totals.subtotal15.toFixed(2)} | Sub0: ${totals.subtotal0.toFixed(2)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 uppercase tracking-tighter">
                                                            🛍️ REGISTRADO
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                title="Imprimir Ticket"
                                                                onClick={() => printSaleTicket(sale)}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border border-purple-100 dark:border-purple-800/30"
                                                            >
                                                                🖨️ Ticket
                                                            </button>

                                                            {isAdmin && (
                                                                <button
                                                                    title="Eliminar Registro de Venta"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openDeleteModal('manualSale', saleId);
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border border-red-100 dark:border-red-900/30"
                                                                >
                                                                    <TrashIcon className="w-3.5 h-3.5" /> Eliminar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedIds.has(saleId) && (
                                                    <tr className="bg-purple-50/20 dark:bg-purple-950/5">
                                                        <td colSpan={7} className="p-0 border-b border-gray-100 dark:border-dark-700">
                                                            <div className="px-8 py-6 flex flex-col gap-6 animate-slide-down">
                                                                <div className="flex items-center justify-between">
                                                                    <h3 className="text-xs font-black text-purple-800 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                                                        <span>🛒</span> DETALLE DEL PEDIDO
                                                                    </h3>
                                                                </div>
                                                                <div className="border border-purple-100 dark:border-purple-900/30 rounded-2xl overflow-hidden bg-white/50 dark:bg-dark-850/50 backdrop-blur-sm">
                                                                    <table className="w-full text-left border-collapse text-xs">
                                                                        <thead>
                                                                            <tr className="bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30">
                                                                                <th className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">Producto</th>
                                                                                <th className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-center w-24">Cantidad</th>
                                                                                <th className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-right w-32">Precio Unit.</th>
                                                                                <th className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-center w-24">IVA</th>
                                                                                <th className="px-4 py-3 font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-right w-32">Total</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-purple-50 dark:divide-purple-900/20">
                                                                            {(sale.items || []).map((item: any, idx: number) => {
                                                                                const is15Percent = item.taxRate === 15;
                                                                                const itemTotal = (item.price || 0) * (item.quantity || 0);
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10">
                                                                                        <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">{item.name}</td>
                                                                                        <td className="px-4 py-3 font-bold text-gray-600 dark:text-gray-400 text-center">{item.quantity}</td>
                                                                                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-right">${(item.price || 0).toFixed(2)}</td>
                                                                                        <td className="px-4 py-3 text-center">
                                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${is15Percent ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400'}`}>
                                                                                                {is15Percent ? '15%' : '0%'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400 text-right">${itemTotal.toFixed(2)}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                    PAGINACIÓN
                ═══════════════════════════════════════════════════════════════════ */}
                <div className="px-4 py-5 md:px-6 md:py-8 bg-gray-50/50 dark:bg-dark-750/50 border-t border-gray-100 dark:border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest order-2 md:order-1">
                        Mostrando {
                            activeTab === 'invoices'
                                ? bills.length
                                : activeTab === 'creditNotes'
                                    ? creditNotes.length
                                    : manualSales.length
                        } de {
                            activeTab === 'invoices'
                                ? billsTotal
                                : activeTab === 'creditNotes'
                                    ? creditNotesTotal
                                    : manualSalesTotal
                        } {
                            activeTab === 'invoices'
                                ? 'facturas'
                                : activeTab === 'creditNotes'
                                    ? 'notas de crédito'
                                    : 'ventas sin factura'
                        }
                    </span>

                    <div className="flex items-center gap-4 order-1 md:order-2">
                        <button
                            onClick={() => {
                                if (activeTab === 'invoices') {
                                    setBillsPage(p => Math.max(1, p - 1));
                                } else if (activeTab === 'creditNotes') {
                                    setCreditNotesPage(p => Math.max(1, p - 1));
                                } else {
                                    setManualSalesPage(p => Math.max(1, p - 1));
                                }
                            }}
                            disabled={
                                (activeTab === 'invoices'
                                    ? billsPage
                                    : activeTab === 'creditNotes'
                                        ? creditNotesPage
                                        : manualSalesPage
                                ) === 1
                            }
                            aria-label="Anterior"
                            className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all shadow-xl shadow-black/5 active:scale-90"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-5 py-2.5 rounded-2xl border shadow-inner ${
                                activeTab === 'invoices'
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50'
                                    : activeTab === 'creditNotes'
                                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800/50'
                                        : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800/50'
                            }`}>
                                PÁGINA {
                                    activeTab === 'invoices'
                                        ? billsPage
                                        : activeTab === 'creditNotes'
                                            ? creditNotesPage
                                            : manualSalesPage
                                }
                            </span>
                        </div>

                        <button
                            onClick={() => {
                                if (activeTab === 'invoices') {
                                    setBillsPage(p => p + 1);
                                } else if (activeTab === 'creditNotes') {
                                    setCreditNotesPage(p => p + 1);
                                } else {
                                    setManualSalesPage(p => p + 1);
                                }
                            }}
                            disabled={
                                (activeTab === 'invoices'
                                    ? bills.length
                                    : activeTab === 'creditNotes'
                                        ? creditNotes.length
                                        : manualSales.length
                                ) < limit
                            }
                            aria-label="Siguiente"
                            className="p-3 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all shadow-xl shadow-black/5 active:scale-90"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden md:block w-[200px] order-3"></div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MODALES
            ═══════════════════════════════════════════════════════════════════ */}
            {selectedBillForCreditNote && (
                <CreditNoteModal
                    bill={selectedBillForCreditNote}
                    isOpen={!!selectedBillForCreditNote}
                    onClose={() => setSelectedBillForCreditNote(null)}
                    onSuccess={() => {
                        fetchBills();
                        fetchCreditNotes();
                    }}
                />
            )}

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

            <XMLViewerModal
                isOpen={isXmlModalOpen}
                onClose={() => setIsXmlModalOpen(false)}
                xmlContent={selectedBillForXml?.xmlContent || ''}
                documentNumber={selectedBillForXml?.documentNumber}
            />

            <EditBillModal
                isOpen={isEditModalOpen}
                bill={selectedBillForEdit}
                onClose={() => setIsEditModalOpen(false)}
                onSave={async (id, data) => {
                    await billingService.updateBill(id, data);
                    await fetchBills();
                }}
            />

            {/* Modal de confirmación para eliminar */}
            <ConfirmModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleDeleteConfirm}
                title={deleteConfirmModal.title}
                message={deleteConfirmModal.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default BillingHistory;