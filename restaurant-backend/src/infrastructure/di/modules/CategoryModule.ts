/**
 * CategoryModule - Módulo de inyección de dependencias para categorías
 *
 * Gestiona la creación e inyección de use cases relacionados con categorías.
 */

import { RepositoryModule } from './RepositoryModule';
import { logger } from '../../utils/Logger';

import {
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    GetCategories,
    ReorderCategories,
} from '../../../application/use-cases/categories';

export class CategoryModule {
    private createCategory?: CreateCategory;
    private updateCategory?: UpdateCategory;
    private deleteCategory?: DeleteCategory;
    private getCategories?: GetCategories;
    private reorderCategories?: ReorderCategories;

    constructor(private repoModule: RepositoryModule) {}

    public getCreateCategoryUseCase(): CreateCategory {
        if (!this.createCategory) {
            this.createCategory = new CreateCategory(this.repoModule.getCategoryRepository());
            logger.debug('CreateCategory use case instantiated');
        }
        return this.createCategory;
    }

    public getUpdateCategoryUseCase(): UpdateCategory {
        if (!this.updateCategory) {
            this.updateCategory = new UpdateCategory(this.repoModule.getCategoryRepository());
            logger.debug('UpdateCategory use case instantiated');
        }
        return this.updateCategory;
    }

    public getDeleteCategoryUseCase(): DeleteCategory {
        if (!this.deleteCategory) {
            this.deleteCategory = new DeleteCategory(this.repoModule.getCategoryRepository());
            logger.debug('DeleteCategory use case instantiated');
        }
        return this.deleteCategory;
    }

    public getGetCategoriesUseCase(): GetCategories {
        if (!this.getCategories) {
            this.getCategories = new GetCategories(this.repoModule.getCategoryRepository());
            logger.debug('GetCategories use case instantiated');
        }
        return this.getCategories;
    }

    public getReorderCategoriesUseCase(): ReorderCategories {
        if (!this.reorderCategories) {
            this.reorderCategories = new ReorderCategories(this.repoModule.getCategoryRepository());
            logger.debug('ReorderCategories use case instantiated');
        }
        return this.reorderCategories;
    }

    public reset(): void {
        this.createCategory = undefined;
        this.updateCategory = undefined;
        this.deleteCategory = undefined;
        this.getCategories = undefined;
        this.reorderCategories = undefined;
    }
}
