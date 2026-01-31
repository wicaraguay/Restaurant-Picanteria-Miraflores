import { IBillRepository } from '../../domain/repositories/IBillRepository';

export class DeleteBill {
    constructor(private billRepository: IBillRepository) { }

    async execute(id: string): Promise<boolean> {
        return this.billRepository.delete(id);
    }
}
