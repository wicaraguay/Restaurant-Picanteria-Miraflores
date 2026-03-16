import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/entities/Customer';

export class LookupCustomer {
    constructor(private customerRepository: ICustomerRepository) { }

    async execute(identification: string): Promise<Customer | null> {
        if (!identification) return null;
        return this.customerRepository.findByIdentification(identification);
    }
}
