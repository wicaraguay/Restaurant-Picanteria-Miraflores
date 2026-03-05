/**
 * @file marketing.types.ts
 * @description Tipos para el módulo de marketing.
 */

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
