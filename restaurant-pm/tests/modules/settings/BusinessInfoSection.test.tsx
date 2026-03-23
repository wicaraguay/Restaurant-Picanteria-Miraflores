import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BusinessInfoSection from '@/modules/settings/components/sections/BusinessInfoSection';
import React from 'react';

const mockBusinessInfo = {
    name: 'Picantería Miraflores',
    slogan: 'El mejor sabor',
    phone: '0987654321',
    email: 'info@miraflores.com',
    address: 'Calle Falsa 123',
    website: 'https://miraflores.com'
};

describe('BusinessInfoSection Component', () => {
    const mockOnInfoChange = vi.fn();
    const mockOnSave = vi.fn();

    it('renders all fields with initial values', () => {
        render(
            <BusinessInfoSection 
                businessInfo={mockBusinessInfo}
                onInfoChange={mockOnInfoChange}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByDisplayValue('Picantería Miraflores')).toBeDefined();
        expect(screen.getByDisplayValue('El mejor sabor')).toBeDefined();
        expect(screen.getByDisplayValue('0987654321')).toBeDefined();
        expect(screen.getByDisplayValue('info@miraflores.com')).toBeDefined();
        expect(screen.getByDisplayValue('Calle Falsa 123')).toBeDefined();
        expect(screen.getByDisplayValue('miraflores.com')).toBeDefined();
    });

    it('calls onInfoChange when inputs are modified', () => {
        render(
            <BusinessInfoSection 
                businessInfo={mockBusinessInfo}
                onInfoChange={mockOnInfoChange}
                onSave={mockOnSave}
            />
        );

        const nameInput = screen.getByDisplayValue('Picantería Miraflores');
        fireEvent.change(nameInput, { target: { value: 'Nuevo Nombre' } });

        expect(mockOnInfoChange).toHaveBeenCalledWith({
            ...mockBusinessInfo,
            name: 'Nuevo Nombre'
        });
    });

    it('renders QR code section when website is present', () => {
        render(
            <BusinessInfoSection 
                businessInfo={mockBusinessInfo}
                onInfoChange={mockOnInfoChange}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText(/Menú Digital QR/i)).toBeDefined();
        expect(screen.getByText(/https:\/\/miraflores.com/i)).toBeDefined();
    });

    it('shows warning when website is missing in QR section', () => {
        const infoWithoutWebsite = { ...mockBusinessInfo, website: '' };
        render(
            <BusinessInfoSection 
                businessInfo={infoWithoutWebsite}
                onInfoChange={mockOnInfoChange}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText(/URL no configurada/i)).toBeDefined();
    });
});
