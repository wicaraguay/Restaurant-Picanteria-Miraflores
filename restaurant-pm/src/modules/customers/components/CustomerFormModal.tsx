/**
 * @file CustomerFormModal.tsx
 * @description Modal para crear o editar información de clientes.
 * Flujo optimizado para el empleado: identificación primero con búsqueda
 * automática de clientes existentes (evita duplicados), validación al salir
 * de cada campo y solo el nombre como obligatorio.
 */
import React from 'react';
import { Customer } from '../types/customer.types';
import Modal from '../../../components/ui/Modal';
import { Validators } from '../../../utils/validators';
import { useState, useEffect } from 'react';
import { api } from '../../../api';

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/10";
const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
const errorClass = "text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase";

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id'>) => void;
    customer: Customer | null;
    isLoading?: boolean;
    /** Cuando la cédula/RUC digitada ya pertenece a un cliente, permite saltar a editarlo. */
    onEditExisting?: (customer: Customer) => void;
}

interface FormState {
    name: string;
    identification: string;
    phone: string;
    email: string;
    address: string;
}

const emptyForm: FormState = { name: '', identification: '', phone: '', email: '', address: '' };

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer, isLoading, onEditExisting }) => {
    const isEditing = customer !== null;
    const [form, setForm] = useState<FormState>(emptyForm);
    const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [existing, setExisting] = useState<Customer | null>(null);
    const [lookingUp, setLookingUp] = useState(false);

    // Cargar datos al abrir (crear = vacío, editar = datos del cliente)
    useEffect(() => {
        if (isOpen) {
            const loaded: FormState = customer ? {
                name: customer.name || '',
                identification: customer.identification || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || ''
            } : emptyForm;
            setForm(loaded);
            setInitialForm(loaded);
            setErrors({});
            setExisting(null);
        }
    }, [isOpen, customer]);

    // En edición: solo se puede guardar si el empleado cambió algo
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

    // Búsqueda automática por identificación (mismo patrón que OrderManagement)
    useEffect(() => {
        const ident = form.identification;
        const isComplete = ident.length === 10 || ident.length === 13;
        const isOwnIdent = isEditing && ident === (customer?.identification || '');

        if (!isOpen || !isComplete || isOwnIdent) {
            setExisting(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLookingUp(true);
            try {
                const found = await api.customers.lookupByIdentification(ident);
                setExisting(found || null);
            } catch {
                // 404 = no existe: el empleado puede registrarlo tranquilo
                setExisting(null);
            } finally {
                setLookingUp(false);
            }
        }, 600);
        return () => clearTimeout(timeoutId);
    }, [form.identification, isOpen, isEditing, customer]);

    const validateIdentification = (value: string): string | null => {
        if (!value) return null; // opcional
        if (value.length === 10) {
            const v = Validators.cedula(value);
            return v.valid ? null : v.error!;
        }
        if (value.length === 13) {
            const v = Validators.ruc(value);
            return v.valid ? null : v.error!;
        }
        return 'Debe tener 10 dígitos (Cédula) o 13 (RUC)';
    };

    const validateField = (field: keyof FormState, value: string): string | null => {
        switch (field) {
            case 'name':
                return Validators.required(value, 'Nombre').valid ? null : 'Nombre es requerido';
            case 'identification':
                return validateIdentification(value);
            case 'phone':
                return !value || Validators.phone(value).valid ? null : Validators.phone(value).error!;
            case 'email':
                return !value || Validators.email(value).valid ? null : Validators.email(value).error!;
            default:
                return null;
        }
    };

    const handleBlur = (field: keyof FormState) => {
        const error = validateField(field, form[field]);
        setErrors(prev => {
            const next = { ...prev };
            if (error) next[field] = error; else delete next[field];
            return next;
        });
    };

    const setField = (field: keyof FormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Si el campo tenía error y el empleado lo corrige, limpiarlo al instante
        if (errors[field] && !validateField(field, value)) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // Estado visual de la identificación (badge de ayuda para el empleado)
    const identBadge = ((): { text: string; tone: 'ok' | 'bad' | 'info' } | null => {
        const ident = form.identification;
        if (!ident) return null;
        if (ident.length === 10) return Validators.cedula(ident).valid ? { text: '✓ Cédula', tone: 'ok' } : { text: 'Cédula inválida', tone: 'bad' };
        if (ident.length === 13) return Validators.ruc(ident).valid ? { text: '✓ RUC', tone: 'ok' } : { text: 'RUC inválido', tone: 'bad' };
        return { text: `${ident.length}/10`, tone: 'info' };
    })();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};
        (['name', 'identification', 'phone', 'email'] as const).forEach(field => {
            const error = validateField(field, form[field]);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0 || existing) return;

        onSave({
            name: form.name.trim().toUpperCase(),
            email: form.email.trim(),
            phone: form.phone,
            identification: form.identification,
            address: form.address.trim(),
            // Los puntos no se editan a mano: los administra el sistema
            loyaltyPoints: isEditing ? (customer!.loyaltyPoints ?? 0) : 0,
            // Editar el perfil NO cuenta como visita — se conserva la fecha real
            lastVisit: isEditing ? customer!.lastVisit : new Date().toISOString(),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Perfil de Cliente' : 'Nuevo Registro de Cliente'}>
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                {isEditing && (
                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900">
                        <p className="font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{customer!.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Última visita: {customer!.lastVisit ? new Date(customer!.lastVisit).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin registro'}
                        </p>
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Identificación (RUC/CI)</label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus={!isEditing}
                                name="identification"
                                placeholder="Cédula o RUC del cliente"
                                value={form.identification}
                                onChange={e => setField('identification', e.target.value.replace(/\D/g, '').slice(0, 13))}
                                onBlur={() => handleBlur('identification')}
                                className={`${inputClass} pr-24 ${errors.identification ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                disabled={isLoading}
                            />
                            {(identBadge || lookingUp) && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                    lookingUp ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                                    : identBadge!.tone === 'ok' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : identBadge!.tone === 'bad' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                    {lookingUp ? 'Buscando…' : identBadge!.text}
                                </span>
                            )}
                        </div>
                        {errors.identification && <p className={errorClass}>{errors.identification}</p>}

                        {existing && (
                            <div className="mt-2 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-snug">
                                    Ya registrado: <span className="font-black">{existing.name}</span>
                                </p>
                                {onEditExisting && (
                                    <button
                                        type="button"
                                        onClick={() => onEditExisting(existing)}
                                        className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Nombre Completo / Razón Social <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            name="name"
                            autoFocus={isEditing}
                            placeholder="Ej. JUAN PÉREZ"
                            value={form.name}
                            onChange={e => setField('name', e.target.value.toUpperCase())}
                            onBlur={() => handleBlur('name')}
                            required
                            className={`${inputClass} ${errors.name ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                            disabled={isLoading}
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Teléfono <span className="normal-case font-bold text-gray-300 dark:text-gray-500">· opcional</span></label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                name="phone"
                                placeholder="0999999999"
                                value={form.phone}
                                onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                onBlur={() => handleBlur('phone')}
                                className={`${inputClass} ${errors.phone ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                disabled={isLoading}
                            />
                            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Correo <span className="normal-case font-bold text-gray-300 dark:text-gray-500">· opcional</span></label>
                            <input
                                type="email"
                                name="email"
                                placeholder="cliente@ejemplo.com"
                                value={form.email}
                                onChange={e => setField('email', e.target.value)}
                                onBlur={() => handleBlur('email')}
                                className={`${inputClass} ${errors.email ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                disabled={isLoading}
                            />
                            {errors.email && <p className={errorClass}>{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Dirección Domiciliaria <span className="normal-case font-bold text-gray-300 dark:text-gray-500">· opcional</span></label>
                        <input
                            type="text"
                            name="address"
                            placeholder="Calle principal y secundaria"
                            value={form.address}
                            onChange={e => setField('address', e.target.value)}
                            className={inputClass}
                            disabled={isLoading}
                        />
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
                        className={`px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2 ${(isLoading || !!existing || (isEditing && !isDirty)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        disabled={isLoading || !!existing || (isEditing && !isDirty)}
                        title={isEditing && !isDirty ? 'No hay cambios por guardar' : undefined}
                    >
                        {isLoading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Procesando...
                            </>
                        ) : (
                            isEditing ? (isDirty ? 'Guardar Cambios' : 'Sin cambios') : 'Registrar Cliente'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CustomerFormModal;
