/**
 * Repositorio Base con operaciones CRUD comunes
 * 
 * Este archivo define una clase abstracta que implementa operaciones CRUD estándar.
 * Todos los repositorios específicos (Customer, Order, Menu, Employee) extienden esta clase.
 * Elimina la duplicación de código al centralizar la lógica común de base de datos.
 * Incluye logging automático y manejo de errores consistente.
 * 
 * Patrón utilizado: Repository Pattern con Template Method
 */

import { Model, Document } from 'mongoose';
import { logger } from '../utils/Logger';
import { DatabaseError, NotFoundError } from '../../domain/errors/CustomErrors';

/**
 * Clase abstracta BaseRepository
 * @template T - Tipo de entidad del dominio que maneja este repositorio
 */
export abstract class BaseRepository<T> {
    protected model: Model<any>;
    protected entityName: string;

    constructor(model: Model<any>, entityName: string) {
        this.model = model;
        this.entityName = entityName;
    }

    /**
     * Map MongoDB document to domain entity
     * Must be implemented by child classes
     */
    protected abstract mapToEntity(doc: any): T;

    /**
     * Create a new entity
     */
    async create(entity: T): Promise<T> {
        try {
            logger.debug(`Creating new ${this.entityName}`, { entity });
            const newDoc = new this.model(entity);
            const saved = await newDoc.save();
            logger.info(`${this.entityName} created successfully`, { id: saved._id });
            return this.mapToEntity(saved);
        } catch (error) {
            logger.error(`Failed to create ${this.entityName}`, error);
            throw new DatabaseError(`Failed to create ${this.entityName}`, error as Error);
        }
    }

    /**
     * Find entity by ID
     */
    async findById(id: string): Promise<T | null> {
        try {
            logger.debug(`Finding ${this.entityName} by ID`, { id });
            const found = await this.model.findById(id);

            if (!found) {
                logger.debug(`${this.entityName} not found`, { id });
                return null;
            }

            return this.mapToEntity(found);
        } catch (error) {
            logger.error(`Failed to find ${this.entityName} by ID`, error);
            throw new DatabaseError(`Failed to find ${this.entityName}`, error as Error);
        }
    }

    /**
     * Find all entities
     */
    async findAll(): Promise<T[]> {
        try {
            logger.debug(`Finding all ${this.entityName}s`);
            const all = await this.model.find();
            logger.info(`Found ${all.length} ${this.entityName}s`);
            return all.map(doc => this.mapToEntity(doc));
        } catch (error) {
            logger.error(`Failed to find all ${this.entityName}s`, error);
            throw new DatabaseError(`Failed to find ${this.entityName}s`, error as Error);
        }
    }

    /**
     * Update entity by ID
     */
    async update(id: string, entity: Partial<T>): Promise<T | null> {
        try {
            logger.debug(`Updating ${this.entityName}`, { id, entity });
            const updated = await this.model.findByIdAndUpdate(id, entity, { new: true });

            if (!updated) {
                logger.debug(`${this.entityName} not found for update`, { id });
                return null;
            }

            logger.info(`${this.entityName} updated successfully`, { id });
            return this.mapToEntity(updated);
        } catch (error) {
            logger.error(`Failed to update ${this.entityName}`, error);
            throw new DatabaseError(`Failed to update ${this.entityName}`, error as Error);
        }
    }

    /**
     * Delete entity by ID
     */
    async delete(id: string): Promise<boolean> {
        try {
            logger.debug(`Deleting ${this.entityName}`, { id });
            const result = await this.model.findByIdAndDelete(id);

            if (!result) {
                logger.debug(`${this.entityName} not found for deletion`, { id });
                return false;
            }

            logger.info(`${this.entityName} deleted successfully`, { id });
            return true;
        } catch (error) {
            logger.error(`Failed to delete ${this.entityName}`, error);
            throw new DatabaseError(`Failed to delete ${this.entityName}`, error as Error);
        }
    }

    /**
     * Count all entities
     */
    async count(): Promise<number> {
        try {
            const count = await this.model.countDocuments();
            return count;
        } catch (error) {
            logger.error(`Failed to count ${this.entityName}s`, error);
            throw new DatabaseError(`Failed to count ${this.entityName}s`, error as Error);
        }
    }
}
