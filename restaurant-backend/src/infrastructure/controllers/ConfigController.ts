import { Request, Response, NextFunction } from 'express';
import { GetRestaurantConfig } from '../../application/use-cases/GetRestaurantConfig';
import { UpdateRestaurantConfig } from '../../application/use-cases/UpdateRestaurantConfig';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { cacheService } from '../utils/CacheService';

export class ConfigController {
    constructor(
        private getRestaurantConfig: GetRestaurantConfig,
        private updateRestaurantConfig: UpdateRestaurantConfig
    ) { }

    public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching restaurant config');

            // Use cache with 15 minute TTL (config rarely changes)
            const config = await cacheService.getOrSet(
                'config:restaurant',
                async () => {
                    return await this.getRestaurantConfig.execute();
                },
                15 * 60 * 1000 // 15 minutes
            );

            logger.info('Restaurant config fetched successfully');
            res.json(ResponseFormatter.success(config));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating restaurant config', { fields: Object.keys(req.body) });

            const updatedConfig = await this.updateRestaurantConfig.execute(req.body);

            // Invalidate config cache
            cacheService.invalidate('config:restaurant');

            logger.info('Restaurant config updated successfully');
            res.json(ResponseFormatter.success(updatedConfig));
        } catch (error) {
            next(error);
        }
    };
}
