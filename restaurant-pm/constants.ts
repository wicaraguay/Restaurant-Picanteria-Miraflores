/**
 * Constantes de la Aplicación
 * 
 * Define constantes reutilizables como items de navegación,
 * días de la semana, y configuraciones generales.
 */

import type { ViewType } from './types';
import { HomeIcon, UsersIcon, ClipboardListIcon, ChefHatIcon, BriefcaseIcon, BookOpenIcon, SettingsIcon, FileTextIcon } from './components/Icons';

/**
 * Items de navegación de la aplicación
 * Cada item tiene un ícono, etiqueta y vista asociada
 */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: HomeIcon, view: 'dashboard' as ViewType },
  { id: 'customers', label: 'Gestión de Clientes', shortLabel: 'Clientes', icon: UsersIcon, view: 'customers' as ViewType },
  { id: 'orders', label: 'Gestión de Pedidos', shortLabel: 'Pedidos', icon: ClipboardListIcon, view: 'orders' as ViewType },
  { id: 'billing', label: 'Facturación SRI', shortLabel: 'Facturas', icon: FileTextIcon, view: 'billing' as ViewType },
  { id: 'menu', label: 'Gestión de Menú', shortLabel: 'Menú', icon: BookOpenIcon, view: 'menu' as ViewType },
  { id: 'kitchen', label: 'Gestión de Cocina', shortLabel: 'Cocina', icon: ChefHatIcon, view: 'kitchen' as ViewType },
  { id: 'hr', label: 'Recursos Humanos', shortLabel: 'RRHH', icon: BriefcaseIcon, view: 'hr' as ViewType },
  { id: 'settings', label: 'Configuración', shortLabel: 'Ajustes', icon: SettingsIcon, view: 'settings' as ViewType },
];

/**
 * Días de la semana en español
 */
export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];