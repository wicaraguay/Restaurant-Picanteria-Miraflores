import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { MenuItem } from '../../domain/entities/MenuItem';

export class CreateMenu {
    constructor(private menuRepository: IMenuRepository) { }

    async execute(data: MenuItem): Promise<MenuItem> {
        return this.menuRepository.create(data);
    }
}
