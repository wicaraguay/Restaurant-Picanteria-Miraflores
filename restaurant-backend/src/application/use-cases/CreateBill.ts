import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { Bill } from '../../domain/entities/Bill';

export class CreateBill {
    constructor(private billRepository: IBillRepository) { }

    async execute(billData: Bill): Promise<Bill> {
        return this.billRepository.create(billData);
    }
}
