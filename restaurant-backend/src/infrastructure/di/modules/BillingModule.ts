
import { RepositoryModule } from './RepositoryModule';
import { GenerateInvoice } from '../../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../../application/use-cases/CheckInvoiceStatus';
import { GenerateCreditNote } from '../../../application/use-cases/GenerateCreditNote';
import { CreateBill } from '../../../application/use-cases/CreateBill';
import { GetBills } from '../../../application/use-cases/GetBills';
import { DeleteBill } from '../../../application/use-cases/DeleteBill';
import { CheckCreditNoteStatus } from '../../../application/use-cases/CheckCreditNoteStatus';
import { GetCreditNotes } from '../../../application/use-cases/GetCreditNotes';
import { ResetBillingSystem } from '../../../application/use-cases/ResetBillingSystem';

import { SRIService } from '../../services/SRIService';
import { PDFService } from '../../services/PDFService';
import { IEmailService } from '../../../application/interfaces/IEmailService';
import { ResendEmailService } from '../../services/ResendEmailService';
import { BillingService } from '../../../application/services/BillingService';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { BillingController } from '../../controllers/BillingController';
import { logger } from '../../utils/Logger';

export class BillingModule {
    private sriService?: SRIService;
    private pdfService?: PDFService;
    private emailService?: IEmailService;
    private billingService?: BillingService;
    
    private generateInvoiceUseCase?: GenerateInvoice;
    private checkInvoiceStatusUseCase?: CheckInvoiceStatus;
    private generateCreditNoteUseCase?: GenerateCreditNote;
    private createBillUseCase?: CreateBill;
    private getBillsUseCase?: GetBills;
    private deleteBillUseCase?: DeleteBill;
    private getCreditNotesUseCase?: GetCreditNotes;
    private checkCreditNoteStatusUseCase?: CheckCreditNoteStatus;
    private resetBillingSystemUseCase?: ResetBillingSystem;
    private billingController?: BillingController;

    constructor(private repoModule: RepositoryModule) {}

    public getSRIService(): SRIService {
        if (!this.sriService) {
            this.sriService = new SRIService();
            logger.debug('SRIService instantiated');
        }
        return this.sriService;
    }

    public getPDFService(): PDFService {
        if (!this.pdfService) {
            this.pdfService = new PDFService();
            logger.debug('PDFService instantiated');
        }
        return this.pdfService;
    }

    public getEmailService(): IEmailService {
        if (!this.emailService) {
            this.emailService = new ResendEmailService();
            logger.debug('ResendEmailService instantiated');
        }
        return this.emailService;
    }

    public getBillingService(): BillingService {
        if (!this.billingService) {
            this.billingService = new BillingService();
            logger.debug('BillingService instantiated');
        }
        return this.billingService;
    }

    public getGenerateInvoiceUseCase(): GenerateInvoice {
        if (!this.generateInvoiceUseCase) {
            this.generateInvoiceUseCase = new GenerateInvoice(
                this.repoModule.getRestaurantConfigRepository(),
                this.repoModule.getBillRepository(),
                this.repoModule.getOrderRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService(),
                this.getBillingService(),
                this.repoModule.getCustomerRepository()
            );
            logger.debug('GenerateInvoice use case instantiated');
        }
        return this.generateInvoiceUseCase;
    }

    public getCheckInvoiceStatusUseCase(): CheckInvoiceStatus {
        if (!this.checkInvoiceStatusUseCase) {
            this.checkInvoiceStatusUseCase = new CheckInvoiceStatus(
                this.repoModule.getRestaurantConfigRepository(),
                this.repoModule.getBillRepository(),
                this.repoModule.getOrderRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService(),
                this.getBillingService()
            );
            logger.debug('CheckInvoiceStatus use case instantiated');
        }
        return this.checkInvoiceStatusUseCase;
    }

    public getGenerateCreditNoteUseCase(): GenerateCreditNote {
        if (!this.generateCreditNoteUseCase) {
            this.generateCreditNoteUseCase = new GenerateCreditNote(
                this.repoModule.getRestaurantConfigRepository(),
                this.repoModule.getCreditNoteRepository(),
                this.repoModule.getBillRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService(),
                this.getBillingService()
            );
            logger.debug('GenerateCreditNote use case instantiated');
        }
        return this.generateCreditNoteUseCase;
    }

    public getCreateBillUseCase(): CreateBill {
        if (!this.createBillUseCase) {
            this.createBillUseCase = new CreateBill(this.repoModule.getBillRepository());
            logger.debug('CreateBill use case instantiated');
        }
        return this.createBillUseCase;
    }

    public getGetBillsUseCase(): GetBills {
        if (!this.getBillsUseCase) {
            this.getBillsUseCase = new GetBills(this.repoModule.getBillRepository());
            logger.debug('GetBills use case instantiated');
        }
        return this.getBillsUseCase;
    }

    public getDeleteBillUseCase(): DeleteBill {
        if (!this.deleteBillUseCase) {
            this.deleteBillUseCase = new DeleteBill(this.repoModule.getBillRepository());
            logger.debug('DeleteBill use case instantiated');
        }
        return this.deleteBillUseCase;
    }

    public getCheckCreditNoteStatusUseCase(): CheckCreditNoteStatus {
        if (!this.checkCreditNoteStatusUseCase) {
            this.checkCreditNoteStatusUseCase = new CheckCreditNoteStatus(
                this.repoModule.getCreditNoteRepository(),
                this.getSRIService()
            );
            logger.debug('CheckCreditNoteStatus use case instantiated');
        }
        return this.checkCreditNoteStatusUseCase;
    }

    public getGetCreditNotesUseCase(): GetCreditNotes {
        if (!this.getCreditNotesUseCase) {
            this.getCreditNotesUseCase = new GetCreditNotes(this.repoModule.getCreditNoteRepository());
            logger.debug('GetCreditNotes use case instantiated');
        }
        return this.getCreditNotesUseCase;
    }

    public getResetBillingSystemUseCase(): ResetBillingSystem {
        if (!this.resetBillingSystemUseCase) {
            this.resetBillingSystemUseCase = new ResetBillingSystem();
            logger.debug('ResetBillingSystem use case instantiated');
        }
        return this.resetBillingSystemUseCase;
    }

    public getBillingController(): BillingController {
        if (!this.billingController) {
            this.billingController = new BillingController(
                this.getGenerateInvoiceUseCase(),
                this.getCheckInvoiceStatusUseCase()
            );
            logger.debug('BillingController instantiated');
        }
        return this.billingController;
    }

    public reset(): void {
        this.sriService = undefined;
        this.pdfService = undefined;
        this.emailService = undefined;
        this.billingService = undefined;
        this.generateInvoiceUseCase = undefined;
        this.checkInvoiceStatusUseCase = undefined;
        this.generateCreditNoteUseCase = undefined;
        this.createBillUseCase = undefined;
        this.getBillsUseCase = undefined;
        this.deleteBillUseCase = undefined;
        this.getCreditNotesUseCase = undefined;
        this.checkCreditNoteStatusUseCase = undefined;
        this.resetBillingSystemUseCase = undefined;
        this.billingController = undefined;
    }
}
