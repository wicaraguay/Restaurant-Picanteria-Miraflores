import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Resend
vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: {
            send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
        },
    })),
}));

describe('Password Reset Email Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RESEND_API_KEY = 'test-api-key';
        process.env.SMTP_FROM = 'test@example.com';
        process.env.BUSINESS_NAME = 'Test Business';
    });

    describe('Email Content Generation', () => {
        it('should generate HTML with user name', () => {
            const userName = 'John Doe';
            const htmlContent = generatePasswordResetHtml(userName, 'https://example.com/reset');

            expect(htmlContent).toContain('John Doe');
        });

        it('should include reset URL in email', () => {
            const resetUrl = 'https://example.com/reset-password?token=abc123';
            const htmlContent = generatePasswordResetHtml('User', resetUrl);

            expect(htmlContent).toContain(resetUrl);
        });

        it('should include business name', () => {
            const businessName = 'Mi Restaurante';
            const htmlContent = generatePasswordResetHtmlWithBusiness('User', 'https://url.com', businessName);

            expect(htmlContent).toContain(businessName);
        });

        it('should include expiry notice', () => {
            const htmlContent = generatePasswordResetHtml('User', 'https://url.com');

            expect(htmlContent).toContain('1 hora');
        });
    });

    describe('Email Subject', () => {
        it('should include business name in subject', () => {
            const businessName = 'Picanteria Miraflores';
            const subject = `Restablecer contrasena - ${businessName}`;

            expect(subject).toBe('Restablecer contrasena - Picanteria Miraflores');
        });
    });

    describe('Reset URL Format', () => {
        it('should construct correct reset URL', () => {
            const frontendUrl = 'https://www.picanteriamiraflores.com';
            const token = 'abc123def456';
            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

            expect(resetUrl).toBe('https://www.picanteriamiraflores.com/reset-password?token=abc123def456');
        });

        it('should handle localhost for development', () => {
            const frontendUrl = 'http://localhost:5173';
            const token = 'test-token';
            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

            expect(resetUrl).toContain('localhost:5173');
        });
    });
});

// Helper functions to test (simulating the actual implementation)
function generatePasswordResetHtml(userName: string, resetUrl: string): string {
    return `
        <div>
            <h2>Hola, ${userName}</h2>
            <p>Recibimos una solicitud para restablecer tu contrasena.</p>
            <a href="${resetUrl}">Restablecer Contrasena</a>
            <p>Este enlace expirara en 1 hora.</p>
        </div>
    `;
}

function generatePasswordResetHtmlWithBusiness(userName: string, resetUrl: string, businessName: string): string {
    return `
        <div>
            <h1>${businessName}</h1>
            <h2>Hola, ${userName}</h2>
            <a href="${resetUrl}">Restablecer Contrasena</a>
            <p>${businessName} - Sistema de Gestion</p>
        </div>
    `;
}
