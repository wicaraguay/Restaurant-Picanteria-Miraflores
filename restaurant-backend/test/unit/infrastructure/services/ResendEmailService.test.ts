import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendEmailService } from '../../../../src/infrastructure/services/ResendEmailService';

// State for the mock
const sendMock = vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null });

// Mock Resend SDK
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: sendMock
      }
    }
  };
});

describe('ResendEmailService', () => {
    let service: ResendEmailService;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RESEND_API_KEY = 're_test_key';
        service = new ResendEmailService();
    });

    it('should call resend emails.send with correct data', async () => {
        const mockInvoice = {
            info: {
                estab: '001', ptoEmi: '001', secuencial: '001',
                nombreComercial: 'T', razonSocialComprador: 'J', razonSocial: 'S', importeTotal: 10
            }
        } as any;

        await service.sendInvoiceEmail('test@email.com', mockInvoice, Buffer.from('p'), 'x');

        expect(sendMock).toHaveBeenCalled();
        const callArgs = sendMock.mock.calls[0][0];
        expect(callArgs.to).toContain('test@email.com');
        expect(callArgs.subject).toContain('001-001-001');
    });
});
