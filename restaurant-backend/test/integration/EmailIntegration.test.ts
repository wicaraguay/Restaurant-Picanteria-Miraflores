import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DIContainer } from '../../src/infrastructure/di/DIContainer';
import { IEmailService } from '../../src/application/interfaces/IEmailService';
import { ResendEmailService } from '../../src/infrastructure/services/ResendEmailService';

describe('Email Integration', () => {
    let container: DIContainer;

    beforeEach(() => {
        process.env.RESEND_API_KEY = 're_test_key';
        container = DIContainer.getInstance();
    });

    it('should resolve ResendEmailService from DIContainer', () => {
        const emailService = container.getEmailService();
        expect(emailService).toBeDefined();
        expect(emailService).toBeInstanceOf(ResendEmailService);
    });

    it('should inject email service into GenerateInvoice use case', () => {
        const generateInvoice = container.getGenerateInvoiceUseCase();
        // @ts-ignore - access private for testing
        expect(generateInvoice.emailService).toBeDefined();
        // @ts-ignore
        expect(generateInvoice.emailService).toBeInstanceOf(ResendEmailService);
    });

    it('should inject email service into CheckInvoiceStatus use case', () => {
        const checkStatus = container.getCheckInvoiceStatusUseCase();
        // @ts-ignore
        expect(checkStatus.emailService).toBeDefined();
        // @ts-ignore
        expect(checkStatus.emailService).toBeInstanceOf(ResendEmailService);
    });
});
