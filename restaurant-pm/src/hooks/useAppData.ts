/**
 * @file useAppData.ts
 * @description Hook personalizado para cargar datos iniciales
 * 
 * @purpose
 * Centraliza la lógica de carga de datos iniciales desde el backend.
 * Maneja estados de loading y error.
 * Integra con DataService y AppStateContext.
 * 
 * @connections
 * - Usa: DataService (services/DataService)
 * - Usa: AppStateContext (contexts/AppStateContext)
 * - Usa: RestaurantConfigContext (contexts/RestaurantConfigContext)
 * - Usado por: AdminApp
 * 
 * @layer Hooks - Custom Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/DataService';
import { useAppState } from '../contexts/AppStateContext';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Hook para cargar datos iniciales de la aplicación
 */
export function useAppData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { setCustomers, setOrders, setMenuItems, setBills } = useAppState();
    const { updateConfig } = useRestaurantConfig();

    /**
     * Carga todos los datos iniciales
     */
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            logger.info('Loading initial application data');

            const data = await dataService.loadAllData();

            // Actualizar estado global
            setCustomers(data.customers);
            setOrders(data.orders);
            setMenuItems(data.menu);
            setBills(data.bills);

            // Actualizar configuración si existe
            if (data.config) {
                updateConfig(data.config);
            }

            logger.info('Initial data loaded successfully');
        } catch (err) {
            const errorMessage = ErrorHandler.handle(err, 'Error al cargar datos iniciales');
            setError(errorMessage);
            logger.error('Failed to load initial data', err);
        } finally {
            setIsLoading(false);
        }
    }, [setCustomers, setOrders, setMenuItems, setBills, updateConfig]);

    /**
     * Carga datos automáticamente al montar
     */
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar una vez al montar el componente

    return {
        isLoading,
        error,
        reload: loadData
    };
}
