/**
 * preferences.ts — Preferencias locales de la app móvil.
 *
 * Persistencia simple en localStorage (mismo mecanismo que el tema del sistema).
 * NO viaja al backend: son ajustes de conveniencia del dispositivo/operador,
 * no configuración del negocio.
 */

export type OrderType = 'En Local' | 'Delivery' | 'Para Llevar';

export interface MobilePrefs {
    /** Tipo de pedido preseleccionado al abrir "Realizar Pedido". */
    defaultOrderType: OrderType;
}

const KEY = 'restaurant_pm_mobile_prefs';

const DEFAULTS: MobilePrefs = {
    defaultOrderType: 'En Local',
};

export function getMobilePrefs(): MobilePrefs {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULTS;
        // Merge con DEFAULTS para tolerar versiones viejas sin alguna clave.
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return DEFAULTS;
    }
}

export function setMobilePrefs(patch: Partial<MobilePrefs>): MobilePrefs {
    const next = { ...getMobilePrefs(), ...patch };
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* almacenamiento no disponible: no es crítico */
    }
    return next;
}
