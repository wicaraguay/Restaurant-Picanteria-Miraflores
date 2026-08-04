/**
 * MobileMenu — Gestión de Menú (CRUD) desde el móvil.
 *
 * Lista los platos agrupados por categoría con:
 *  - Interruptor de disponibilidad (habilitar/deshabilitar) → se refleja al
 *    instante en "Realizar Pedido", que ya filtra por `available`.
 *  - Editar / Eliminar por plato.
 *  - Botón flotante "+" para crear.
 *
 * REUTILIZA el MenuFormModal de la web (misma validación, detección de duplicados
 * y subida de imagen a Cloudinary) — una sola fuente de verdad, no se duplica lógica.
 *
 * NOTA: la subida de FOTO usa multipart (Cloudinary). Con CapacitorHttp activo,
 * el multipart nativo puede fallar; crear/editar SIN foto funciona siempre.
 */

import React, { useMemo, useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { menuService } from '../../modules/menu/services/MenuService';
import { MenuItem } from '../../modules/menu/types/menu.types';
import { MenuFormModal } from '../../modules/menu/components/MenuFormModal';
import { toast } from '../../components/ui/AlertProvider';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/ui/Icons';

const MobileMenu: React.FC = () => {
    const { state, addMenuItem, updateMenuItem, deleteMenuItem } = useAppState();

    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null); // null = creando
    const [busyId, setBusyId] = useState<string | null>(null);

    // Agrupa por categoría, aplicando el filtro de búsqueda por nombre.
    const grouped = useMemo(() => {
        const q = search.trim().toLowerCase();
        const items = q
            ? state.menuItems.filter((m) => m.name.toLowerCase().includes(q))
            : state.menuItems;
        const map = new Map<string, MenuItem[]>();
        for (const m of items) {
            const cat = m.category || 'Sin categoría';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(m);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [state.menuItems, search]);

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (m: MenuItem) => {
        setEditing(m);
        setFormOpen(true);
    };

    // El modal llama onSave y, si NO lanza, cierra solo. Si algo falla, re-lanzamos
    // para que el modal permanezca abierto y el empleado no pierda lo escrito.
    const handleSave = async (item: MenuItem) => {
        if (editing === null) {
            const { id, ...rest } = item; // descartamos el id temporal del cliente
            void id;
            const created = await menuService.create(rest);
            addMenuItem(created);
            toast.success('Plato creado', 'Menú');
        } else {
            const updated = await menuService.update(editing.id, item);
            updateMenuItem(editing.id, updated);
            toast.success('Plato actualizado', 'Menú');
        }
    };

    const toggleAvailable = async (m: MenuItem) => {
        if (busyId) return;
        setBusyId(m.id);
        const nextValue = !m.available;
        updateMenuItem(m.id, { available: nextValue }); // optimista
        try {
            await menuService.update(m.id, { available: nextValue });
        } catch {
            updateMenuItem(m.id, { available: m.available }); // revertir
            toast.error('No se pudo cambiar la disponibilidad.', 'Error');
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (m: MenuItem) => {
        if (busyId) return;
        if (!window.confirm(`¿Eliminar "${m.name}"? Esta acción no se puede deshacer.`)) return;
        setBusyId(m.id);
        deleteMenuItem(m.id); // optimista
        try {
            await menuService.delete(m.id);
            toast.success('Plato eliminado', 'Menú');
        } catch {
            addMenuItem(m); // restaurar si falla
            toast.error('No se pudo eliminar el plato.', 'Error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="pb-24">
            <div className="mb-4">
                <h1 className="text-xl font-black text-light-text dark:text-light-background">Menú</h1>
                <p className="text-xs text-light-subtext dark:text-gray-400">
                    Habilita, edita o crea platos. Los cambios se reflejan al instante en Realizar Pedido.
                </p>
            </div>

            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar plato…"
                className="w-full mb-4 rounded-xl bg-light-surface dark:bg-dark-800 border border-light-border dark:border-dark-700 px-4 py-2.5 text-sm text-light-text dark:text-light-background placeholder:text-light-subtext/60 focus:outline-none focus:border-blue-600"
            />

            {grouped.length === 0 ? (
                <p className="text-center text-sm text-light-subtext dark:text-gray-400 py-12">
                    {search ? 'Sin resultados.' : 'No hay platos aún. Crea el primero con el botón +.'}
                </p>
            ) : (
                <div className="space-y-5">
                    {grouped.map(([cat, items]) => (
                        <div key={cat}>
                            <p className="text-xs font-black uppercase tracking-widest text-light-subtext dark:text-gray-500 mb-2 ml-1">
                                {cat}
                            </p>
                            <div className="space-y-2">
                                {items.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`flex items-center gap-3 bg-light-surface dark:bg-dark-800 rounded-2xl p-3 border border-light-border dark:border-dark-700 transition ${
                                            m.available ? '' : 'opacity-60'
                                        }`}
                                    >
                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-light-background dark:bg-dark-700 shrink-0 flex items-center justify-center">
                                            {m.imageUrl ? (
                                                <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <span className="text-lg">🍽️</span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm text-light-text dark:text-light-background truncate">
                                                {m.name}
                                            </p>
                                            <p className="text-[11px] text-light-subtext dark:text-gray-400">
                                                ${m.price.toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Interruptor de disponibilidad */}
                                        <button
                                            onClick={() => toggleAvailable(m)}
                                            disabled={busyId === m.id}
                                            aria-label={m.available ? 'Deshabilitar' : 'Habilitar'}
                                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                                                m.available ? 'bg-blue-600' : 'bg-gray-300 dark:bg-dark-600'
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                    m.available ? 'translate-x-5' : ''
                                                }`}
                                            />
                                        </button>

                                        <button
                                            onClick={() => openEdit(m)}
                                            aria-label="Editar"
                                            className="p-2 rounded-lg text-light-subtext dark:text-gray-400 hover:text-blue-600 active:scale-95 transition shrink-0"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => remove(m)}
                                            disabled={busyId === m.id}
                                            aria-label="Eliminar"
                                            className="p-2 rounded-lg text-light-subtext dark:text-gray-400 hover:text-red-500 active:scale-95 transition shrink-0 disabled:opacity-50"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Botón flotante crear */}
            <button
                onClick={openCreate}
                aria-label="Nuevo plato"
                className="fixed right-4 bottom-20 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center active:scale-95 transition"
            >
                <PlusIcon className="w-7 h-7" />
            </button>

            <MenuFormModal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                item={editing}
                menuItems={state.menuItems}
                onEditExisting={(existing) => setEditing(existing)}
            />
        </div>
    );
};

export default MobileMenu;
