import React, { useState, useEffect } from 'react';
import { billingService } from '../../services/BillingService';
import { Bill } from '../../types';
import { API_BASE_URL } from '../../config/api.config';
import { useRestaurantConfig } from '../../contexts/RestaurantConfigContext';
import CreditNoteModal from './CreditNoteModal';

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
    TrashIcon
} from '../Icons';

const BillingHistory: React.FC = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');
    const [idSearch, setIdSearch] = useState('');
    const [selectedBillForCreditNote, setSelectedBillForCreditNote] = useState<Bill | null>(null);
    const { config } = useRestaurantConfig();

    const fetchBills = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page,
                limit,
                sort: { createdAt: -1 }
            };

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
    }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchBills();
    };

    const handleAuthorize = async (bill: Bill) => {
        if (!confirm('¿Desea generar y autorizar esta factura en el SRI?')) return;

        try {
            setIsLoading(true);
            const taxRate = config.billing?.taxRate || 15;

            // Reconstruct order items with tax-inclusive prices
            // In DB, items have 'total' which is usually tax inclusive if derived from bill logic,
            // OR we need to trust the logic.
            // Safe bet: Use item.total / quantity as the inclusive unit price.
            const items = bill.items.map(item => ({
                id: item.name, // Placeholder ID
                name: item.name,
                quantity: item.quantity,
                price: item.quantity > 0 ? (item.total / item.quantity) : 0
            }));

            // Construct payload
            // NOTE: orderNumber is intentionally NOT sent to backend
            // The backend will automatically generate a unique sequential number from the database
            // This prevents duplicate access key errors when re-sending failed invoices
            const orderPayload = {
                id: bill.orderId,
                items: items
            };

            const clientPayload = {
                name: bill.customerName,
                identification: bill.customerIdentification,
                address: bill.customerAddress,
                email: bill.customerEmail || config.fiscalEmail || 'consumidor@final.com', // Fallback
                phone: '9999999999' // Fallback
            };

            await billingService.generateXML({
                order: orderPayload,
                client: clientPayload,
                taxRate: taxRate,
                logoUrl: config.fiscalLogo || config.logo
            });

            await fetchBills();
            alert('Factura enviada a autorización SRI exitosamente.');
        } catch (error) {
            console.error('Error authorizing bill:', error);
            alert('Error al autorizar la factura.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (bills.length === 0) return;

        const headers = ["Fecha", "Numero", "Cliente", "RUC/CI", "Subtotal", "IVA", "Total", "SRI Status", "Clave Acceso"];
        const rows = bills.map(b => [
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

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Facturacion_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (bill: Bill) => {
        // Check if bill has been cancelled with a credit note
        if (bill.hasCreditNote === true || bill.sriStatus === 'CANCELLED') {
            return (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    <AlertCircleIcon className="w-3 h-3" /> ANULADO (NC)
                </span>
            );
        }

        const s = bill.sriStatus?.toUpperCase() || 'UNKNOWN';
        if (s === 'AUTORIZADO') {
            return (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircleIcon className="w-3 h-3" /> AUTORIZADO
                </span>
            );
        }
        if (s === 'RECIBIDA' || s === 'PENDING' || s === 'SENT') {
            return (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <RefreshCcwIcon className="w-3 h-3 animate-spin" /> PROCESANDO
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                <AlertCircleIcon className="w-3 h-3" /> {s}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-light-background flex items-center gap-2">
                        <FileTextIcon className="text-primary-600" /> Historial de Facturas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Control de documentos para contabilidad</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all"
                    >
                        <span>📊</span> Exportar CSV
                    </button>
                    <button
                        onClick={() => { setPage(1); fetchBills(); }}
                        className="p-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg text-gray-600 hover:text-primary-600 shadow-sm transition-all"
                    >
                        <RefreshCcwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="RUC / Cédula..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-900 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <FileTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Número de Factura..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-900 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                            value={idSearch}
                            onChange={(e) => setIdSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 rounded-xl transition-all"
                    >
                        Filtrar Reporte
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-dark-750 border-b border-gray-100 dark:border-dark-700">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Entorno</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado SRI</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-700 text-sm">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No hay facturas registradas.
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-dark-750 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 dark:text-gray-200">{bill.documentNumber}</div>
                                            <div className="text-[10px] text-gray-400">{bill.date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{bill.customerName}</div>
                                            <div className="text-xs text-gray-500">{bill.customerIdentification}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {bill.environment === '2' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    PRODUCCIÓN
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                    PRUEBAS
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-primary-600">${(bill.total || 0).toFixed(2)}</div>
                                            <div className="text-[10px] text-gray-400">Sub: ${(bill.subtotal || 0).toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center mb-1">
                                                {getStatusBadge(bill)}
                                            </div>
                                            <div className="text-[9px] font-mono text-gray-400 whitespace-nowrap mx-auto" title={bill.accessKey}>
                                                {bill.accessKey}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-1">
                                                {/* PRIMARY ACTIONS (Print & Status) */}

                                                {/* Check Status / Retry */}
                                                {(bill.sriStatus !== 'AUTORIZADO' && bill.sriStatus !== 'CANCELLED') && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!bill.accessKey) {
                                                                await handleAuthorize(bill);
                                                                return;
                                                            }
                                                            try {
                                                                setIsLoading(true);
                                                                await billingService.checkStatus(bill.accessKey);
                                                                await fetchBills();
                                                            } catch (error) {
                                                                console.error('Error checking status:', error);
                                                            } finally {
                                                                setIsLoading(false);
                                                            }
                                                        }}
                                                        className={`p-2 rounded-xl transition-all shadow-sm ${!bill.accessKey
                                                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400'
                                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                                                            }`}
                                                        title={!bill.accessKey ? "Generar NUEVA factura" : "Actualizar Estado SRI"}
                                                    >
                                                        <RefreshCcwIcon className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => window.open(`${API_BASE_URL}/bills/${bill.id}/pdf`, '_blank')}
                                                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:bg-dark-700 rounded-xl transition-all"
                                                    title="Ver RIDE (PDF)"
                                                >
                                                    <PrinterIcon className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => window.open(`${API_BASE_URL}/bills/${bill.id}/pdf?format=ticket`, '_blank')}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-xl transition-all"
                                                    title="Imprimir Ticket"
                                                >
                                                    <div className="flex items-center justify-center w-4 h-4 border border-current rounded-[4px] text-[8px] font-bold">
                                                        T
                                                    </div>
                                                </button>

                                                {/* DIVIDER */}
                                                <div className="w-px h-4 bg-gray-200 dark:bg-dark-700 mx-1"></div>

                                                {/* SECONDARY ACTIONS (Manage) */}

                                                {/* Credit Note (Always visible, disabled if not applicable) */}
                                                <button
                                                    disabled={
                                                        bill.sriStatus?.trim().toUpperCase() !== 'AUTORIZADO' ||
                                                        bill.hasCreditNote ||
                                                        bill.customerIdentification?.trim() === '9999999999999'
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBillForCreditNote(bill);
                                                    }}
                                                    className={`p-2 rounded-xl transition-all ${bill.sriStatus?.trim().toUpperCase() === 'AUTORIZADO' &&
                                                        !bill.hasCreditNote &&
                                                        bill.customerIdentification?.trim() !== '9999999999999'
                                                        ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
                                                        : 'text-gray-200 dark:text-gray-700 cursor-not-allowed opacity-50'
                                                        }`}
                                                    title={
                                                        bill.sriStatus?.trim().toUpperCase() !== 'AUTORIZADO'
                                                            ? "Solo facturas AUTORIZADAS pueden tener Nota de Crédito"
                                                            : bill.hasCreditNote
                                                                ? "Ya tiene Nota de Crédito"
                                                                : bill.customerIdentification?.trim() === '9999999999999'
                                                                    ? "No se puede emitir Nota de Crédito a Consumidor Final"
                                                                    : "Emitir Nota de Crédito"
                                                    }
                                                >
                                                    <FileTextIcon className="w-4 h-4" />
                                                </button>

                                                {/* Delete */}
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
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                    title="Eliminar Registro"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-dark-750 border-t border-gray-100 dark:border-dark-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Mostrando {bills.length} de {total} comprobantes</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border dark:border-dark-700 disabled:opacity-50 hover:border-primary-500 transition-all shadow-sm"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="flex items-center px-4 text-sm font-bold text-gray-700 dark:text-gray-300">
                            {page}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={bills.length < limit}
                            className="p-1.5 rounded-lg bg-white dark:bg-dark-800 border dark:border-dark-700 disabled:opacity-50 hover:border-primary-500 transition-all shadow-sm"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
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
                            setSelectedBillForCreditNote(null);
                            fetchBills();
                        }}
                    />
                )
            }
        </div >
    );
};

export default BillingHistory;
