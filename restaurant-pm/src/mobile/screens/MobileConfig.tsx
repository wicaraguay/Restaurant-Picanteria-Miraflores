/**
 * MobileConfig — "Configuración" de la app móvil (hub de ajustes).
 *
 * Secciones:
 *  - Apariencia: tema claro/oscuro (useTheme, persistido en localStorage).
 *  - Preferencias de pedido: tipo de pedido por defecto (preferences.ts).
 *  - Gestión de Menú: acceso a la pantalla de menú (CRUD).
 *  - Cuenta y sesión: usuario actual, cambiar contraseña, cerrar sesión.
 *
 * Ajustes de negocio "pesados" (SRI, roles, backups, HR) NO van aquí a propósito:
 * esta es una app de operación en tablet, no el panel de administración web.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../modules/auth/contexts/AuthContext';
import { api } from '../../api';
import { toast } from '../../components/ui/AlertProvider';
import { getMobilePrefs, setMobilePrefs, OrderType } from '../preferences';
import {
    SunIcon,
    MoonIcon,
    ChevronRightIcon,
    ClipboardListIcon,
    LockIcon,
    LogOutIcon,
    UserIcon,
} from '../../components/ui/Icons';

const ORDER_TYPES: OrderType[] = ['En Local', 'Delivery', 'Para Llevar'];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <p className="text-xs font-black uppercase tracking-widest text-light-subtext dark:text-gray-500 mb-2 ml-1">
            {title}
        </p>
        <div className="bg-light-surface dark:bg-dark-800 rounded-2xl border border-light-border dark:border-dark-700 overflow-hidden">
            {children}
        </div>
    </div>
);

const MobileConfig: React.FC = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { currentUser, logout } = useAuth();

    const [defaultOrderType, setDefaultOrderType] = useState<OrderType>(
        () => getMobilePrefs().defaultOrderType
    );

    // Cambio de contraseña (inline)
    const [pwOpen, setPwOpen] = useState(false);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const pickOrderType = (t: OrderType) => {
        setDefaultOrderType(t);
        setMobilePrefs({ defaultOrderType: t });
    };

    const changePassword = async () => {
        if (savingPw) return;
        if (next.length < 6) {
            toast.error('La nueva contraseña debe tener al menos 6 caracteres.', 'Contraseña');
            return;
        }
        if (next !== confirm) {
            toast.error('La confirmación no coincide.', 'Contraseña');
            return;
        }
        setSavingPw(true);
        try {
            await api.auth.changePassword(current, next);
            toast.success('Contraseña actualizada.', 'Cuenta');
            setPwOpen(false);
            setCurrent('');
            setNext('');
            setConfirm('');
        } catch (e: any) {
            toast.error(e?.message || 'No se pudo cambiar la contraseña.', 'Error');
        } finally {
            setSavingPw(false);
        }
    };

    const segBtn = (active: boolean) =>
        `flex-1 text-sm font-semibold py-2.5 rounded-xl transition ${
            active
                ? 'bg-blue-600 text-white'
                : 'bg-light-background dark:bg-dark-700 text-light-subtext dark:text-gray-400'
        }`;

    const pwInput =
        'w-full rounded-xl bg-light-background dark:bg-dark-900 border border-light-border dark:border-dark-700 px-4 py-2.5 text-sm text-light-text dark:text-light-background focus:outline-none focus:border-blue-600';

    return (
        <div className="space-y-6 pb-8">
            <h1 className="text-xl font-black text-light-text dark:text-light-background">Configuración</h1>

            {/* Apariencia */}
            <Section title="Apariencia">
                <div className="p-3">
                    <div className="flex gap-2">
                        <button onClick={() => setTheme('light')} className={segBtn(theme === 'light')}>
                            <span className="inline-flex items-center gap-1.5 justify-center">
                                <SunIcon className="w-4 h-4" /> Claro
                            </span>
                        </button>
                        <button onClick={() => setTheme('dark')} className={segBtn(theme === 'dark')}>
                            <span className="inline-flex items-center gap-1.5 justify-center">
                                <MoonIcon className="w-4 h-4" /> Oscuro
                            </span>
                        </button>
                    </div>
                </div>
            </Section>

            {/* Preferencias de pedido */}
            <Section title="Preferencias de pedido">
                <div className="p-3 space-y-2">
                    <p className="text-xs text-light-subtext dark:text-gray-400 ml-1">
                        Tipo de pedido preseleccionado al crear una comanda.
                    </p>
                    <div className="flex gap-2">
                        {ORDER_TYPES.map((t) => (
                            <button key={t} onClick={() => pickOrderType(t)} className={segBtn(defaultOrderType === t)}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Gestión de Menú */}
            <Section title="Gestión">
                <button
                    onClick={() => navigate('/menu')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-light-background dark:active:bg-dark-700 transition"
                >
                    <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                        <ClipboardListIcon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 text-left font-semibold text-sm text-light-text dark:text-light-background">
                        Gestión de Menú
                    </span>
                    <ChevronRightIcon className="w-5 h-5 text-light-subtext dark:text-gray-500" />
                </button>
            </Section>

            {/* Cuenta y sesión */}
            <Section title="Cuenta y sesión">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-light-border dark:border-dark-700">
                    <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-light-text dark:text-light-background truncate">
                            {currentUser?.name || currentUser?.username || 'Usuario'}
                        </p>
                        <p className="text-[11px] text-light-subtext dark:text-gray-400 truncate">
                            {currentUser?.role?.name || 'Sin rol'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setPwOpen((v) => !v)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-light-background dark:active:bg-dark-700 transition"
                >
                    <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                        <LockIcon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 text-left font-semibold text-sm text-light-text dark:text-light-background">
                        Cambiar contraseña
                    </span>
                    <ChevronRightIcon
                        className={`w-5 h-5 text-light-subtext dark:text-gray-500 transition-transform ${
                            pwOpen ? 'rotate-90' : ''
                        }`}
                    />
                </button>

                {pwOpen && (
                    <div className="px-4 pb-4 space-y-2.5 border-b border-light-border dark:border-dark-700">
                        <input
                            type="password"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            placeholder="Contraseña actual"
                            className={pwInput}
                        />
                        <input
                            type="password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            placeholder="Nueva contraseña (mín. 6)"
                            className={pwInput}
                        />
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Confirmar nueva contraseña"
                            className={pwInput}
                        />
                        <button
                            onClick={changePassword}
                            disabled={savingPw}
                            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl active:scale-[0.99] transition disabled:opacity-70"
                        >
                            {savingPw ? 'Guardando…' : 'Actualizar contraseña'}
                        </button>
                    </div>
                )}

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-light-background dark:active:bg-dark-700 transition"
                >
                    <span className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                        <LogOutIcon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 text-left font-semibold text-sm text-red-500">Cerrar sesión</span>
                </button>
            </Section>
        </div>
    );
};

export default MobileConfig;
