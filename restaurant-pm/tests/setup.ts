/**
 * @file setup.ts
 * @description Test setup for Vitest
 * 
 * @purpose
 * Configura el entorno de testing con globals y testing-library.
 * 
 * @layer Tests - Configuration
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Basic mocks
window.alert = vi.fn();
window.scrollTo = vi.fn().mockImplementation(() => {});
if (typeof window.matchMedia === 'undefined') {
    window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}
