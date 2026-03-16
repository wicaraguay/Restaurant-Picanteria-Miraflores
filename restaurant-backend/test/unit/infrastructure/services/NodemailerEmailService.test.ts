import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodemailerEmailService } from '../../../../src/infrastructure/services/NodemailerEmailService';

// Mock nodemailer properly
vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-id' })
      })
    }
  };
});

import nodemailer from 'nodemailer';

describe('NodemailerEmailService', () => {
    let service: NodemailerEmailService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new NodemailerEmailService();
    });

    it('should call sendMail with correct data', async () => {
        const mockInvoice = {
            info: {
                estab: '001', ptoEmi: '001', secuencial: '001',
                nombreComercial: 'T', razonSocialComprador: 'J', razonSocial: 'S', importeTotal: 10
            }
        } as any;

        await service.sendInvoiceEmail('test@email.com', mockInvoice, Buffer.from('p'), 'x');

        const mockTransporter = vi.mocked(nodemailer.createTransport).mock.results[0].value;
        expect(mockTransporter.sendMail).toHaveBeenCalled();
        
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.to).toBe('test@email.com');
        expect(callArgs.html).toContain('T'); // nombreComercial
        expect(callArgs.html).toContain('S'); // razonSocial
    });
});
