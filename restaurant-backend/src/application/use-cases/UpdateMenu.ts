import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { MenuItem } from '../../domain/entities/MenuItem';

export class UpdateMenu {
    constructor(private menuRepository: IMenuRepository) { }

    async execute(id: string, data: Partial<MenuItem>): Promise<MenuItem | null> {
        return this.menuRepository.update(id, data);
    }
}
