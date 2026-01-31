import { StorageUtil } from './storage';

const ORDER_SEQUENCE_KEY = 'restaurant_pm_order_sequence';

export const OrderNumberGenerator = {
    /**
     * Obtiene el siguiente número de pedido y actualiza la secuencia.
     */
    getNextOrderNumber: (): string => {
        const current = StorageUtil.getItem<number>(ORDER_SEQUENCE_KEY) || 0;
        const next = current + 1;
        StorageUtil.setItem(ORDER_SEQUENCE_KEY, next);
        return next.toString().padStart(3, '0');
    },

    /**
     * Asegura que la secuencia local esté sincronizada con el número más alto existente.
     * Útil al cargar pedidos existentes para evitar duplicados.
     */
    ensureSequenceSynced: (maxCurrent: number) => {
        const current = StorageUtil.getItem<number>(ORDER_SEQUENCE_KEY) || 0;
        if (maxCurrent > current) {
            StorageUtil.setItem(ORDER_SEQUENCE_KEY, maxCurrent);
        }
    },

    /**
     * Resetea la secuencia (útil para testing o reset diario)
     */
    resetSequence: () => {
        StorageUtil.setItem(ORDER_SEQUENCE_KEY, 0);
    }
};
