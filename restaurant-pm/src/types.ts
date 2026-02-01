/**
 * Tipos e Interfaces del Frontend
 * 
 * Define todas las interfaces y tipos utilizados en la aplicación.
 * Incluye tipos para entidades del dominio y respuestas de API.
 */

import type { Dispatch, SetStateAction } from 'react';

/**
 * Tipo para vistas de la aplicación
 */
export type ViewType = 'dashboard' | 'orders' | 'menu' | 'kitchen' | 'hr' | 'settings' | 'billing';

/**
 * Tipo helper para setState de React
 */
export type SetState<T> = Dispatch<SetStateAction<T>>;

/**
 * Interfaz para Cliente
 */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  lastVisit: string;
  // Campos SRI (Ecuador)
  identification?: string; // RUC o Cédula
  address?: string;
}

export interface Reservation {
  id: string;
  name: string;
  partySize: number;
  time: string;
  status: 'Confirmada' | 'Pendiente' | 'Cancelada';
}

export enum OrderStatus {
  New = 'Nuevo',
  Ready = 'Listo',
  Completed = 'Completado',
}

export interface OrderItem {
  name: string;
  quantity: number;
  price?: number; // Added to track price per item at moment of order
  prepared?: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  type: 'En Local' | 'Delivery' | 'Para Llevar';
  status: OrderStatus;
  createdAt: string; // ISO 8601 string from backend
  billed?: boolean; // Track if order has been converted to a bill
  orderNumber?: string; // Sequential identifier for UI (e.g., "001")
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  available: boolean;
}

export interface Employee {
  id: string;
  name: string;
  username: string;
  password?: string;
  roleId: string;
  phone: string;
  shifts: { [key: string]: string }; // Day: 'AM', 'PM', 'Libre'
  salary: number;
  equipment: { uniform: boolean; epp: boolean };
}

export interface Role {
  id: string;
  name: string;
  permissions: {
    [key in ViewType]?: boolean;
  };
}

export interface BillingConfig {
  establishment: string; // 001
  emissionPoint: string; // 001
  currentSequenceFactura: number; // 1
  currentSequenceNotaVenta: number; // 1
  myRuc: string;
  myBusinessName: string;
  myAddress: string;
  myRegime: 'General' | 'RIMPE - Negocio Popular' | 'RIMPE - Emprendedor';
}

export interface Bill {
  id: string; // Internal ID
  documentNumber: string; // 001-001-000000001
  orderId: string;
  date: string;
  documentType: 'Factura' | 'Nota de Venta';
  customerName: string;
  customerIdentification: string; // RUC or CI
  customerAddress: string;
  customerEmail: string;
  items: { name: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  tax: number; // IVA 15%
  total: number;
  regime: string;
  accessKey?: string;
  sriStatus?: string;
  environment?: string;
  authorizationDate?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  hasCreditNote?: boolean;
}

// Deprecated but kept for compatibility
export interface Feedback {
  id: string;
  customerName: string;
  date: string;
  type: 'Queja' | 'Sugerencia';
  details: string;
  status: 'Abierto' | 'Resuelto';
}

export interface LegalDocument {
  id: string;
  name: string;
  type: 'Sanitario' | 'Municipal' | 'SRI';
  dueDate: string;
  status: 'Vigente' | 'Por Vencer' | 'Vencido';
}

export interface Training {
  id: string;
  employeeId: string;
  course: string;
  status: 'Pendiente' | 'En Progreso' | 'Completado';
  completionDate?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Ingreso' | 'Gasto';
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  status: 'Planificada' | 'Activa' | 'Finalizada';
}

export interface SocialPostIdea {
  id: string;
  platform: 'Instagram' | 'Facebook' | 'TikTok';
  idea: string;
  status: 'Idea' | 'Programado' | 'Publicado';
  scheduledAt?: string; // ISO string
}

/**
 * Configuración del Restaurante - White Label
 * Permite personalizar completamente el sistema para cada restaurante
 */
export interface RestaurantConfig {
  // Información básica
  name: string;
  logo?: string; // URL o base64 de la imagen
  slogan?: string;

  // Información de contacto
  phone: string;
  email: string;
  address: string;
  website?: string;

  // Información fiscal (Ecuador) - CENTRALIZADA
  ruc: string;
  businessName: string;
  fiscalEmail?: string;
  fiscalLogo?: string; // Logo específico para facturas
  obligadoContabilidad?: boolean;
  contribuyenteEspecial?: string; // Número de resolución (opcional)

  // Configuración regional
  currency: string; // 'USD', 'EUR', etc.
  currencySymbol: string; // '$', '€', etc.
  timezone: string; // 'America/Guayaquil'
  locale: string; // 'es-EC'

  // Personalización de marca
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Configuración de facturación SRI - TODO CENTRALIZADO AQUÍ
  billing: {
    establishment: string;
    emissionPoint: string;
    regime: 'General' | 'RIMPE - Negocio Popular' | 'RIMPE - Emprendedor';
    // Secuenciales
    currentSequenceFactura: number;
    currentSequenceNotaCredito: number;
    currentSequenceNotaVenta: number;
    // Impuestos
    taxRate?: number; // Porcentaje (e.g., 15 for 15%)
    environment?: '1' | '2'; // 1: Pruebas, 2: Producción
  };
}