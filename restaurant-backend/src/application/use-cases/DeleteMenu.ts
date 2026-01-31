import { IMenuRepository } from '../../domain/repositories/IMenuRepository';

export class DeleteMenu {
    constructor(private menuRepository: IMenuRepository) { }

    async execute(id: string): Promise<boolean> {
        return this.menuRepository.delete(id);
    }
}
