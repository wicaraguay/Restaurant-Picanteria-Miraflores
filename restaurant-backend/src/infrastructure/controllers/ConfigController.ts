import { Request, Response, NextFunction } from 'express';
import { GetRestaurantConfig } from '../../application/use-cases/GetRestaurantConfig';
import { UpdateRestaurantConfig } from '../../application/use-cases/UpdateRestaurantConfig';
import { UploadSRICertificate } from '../../application/use-cases/UploadSRICertificate';
import { DeleteSRICertificate } from '../../application/use-cases/DeleteSRICertificate';
import { UpdateCertificateEnvironment } from '../../application/use-cases/UpdateCertificateEnvironment';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { cacheService } from '../utils/CacheService';

export class ConfigController {
    constructor(
        private getRestaurantConfig: GetRestaurantConfig,
        private updateRestaurantConfig: UpdateRestaurantConfig,
        private uploadSRICertificate: UploadSRICertificate,
        private deleteSRICertificate: DeleteSRICertificate,
        private updateCertificateEnvironment: UpdateCertificateEnvironment
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
            // SECURITY: Strip sriCertificate from general config updates
            // Certificate should ONLY be modified via dedicated endpoints (POST/DELETE/PATCH /certificate)
            // This prevents accidental restoration of corrupted/old certificate data from frontend cache
            const { sriCertificate, ...safeBody } = req.body;
            if (sriCertificate) {
                logger.warn('Stripped sriCertificate from config update - use dedicated certificate endpoints');
            }

            logger.info('Updating restaurant config', { fields: Object.keys(safeBody) });

            const updatedConfig = await this.updateRestaurantConfig.execute(safeBody);

            // Invalidate config cache
            cacheService.invalidate('config:restaurant');

            logger.info('Restaurant config updated successfully');
            res.json(ResponseFormatter.success(updatedConfig));
        } catch (error) {
            next(error);
        }
    };

    public uploadCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Uploading SRI certificate');

            const result = await this.uploadSRICertificate.execute(req.body);

            // Invalidate config cache
            cacheService.invalidate('config:restaurant');

            logger.info('SRI certificate uploaded successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public deleteCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting SRI certificate');

            const result = await this.deleteSRICertificate.execute();

            // Invalidate config cache
            cacheService.invalidate('config:restaurant');

            logger.info('SRI certificate deleted successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public updateCertificateEnv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating SRI certificate environment', { environment: req.body.environment });

            const result = await this.updateCertificateEnvironment.execute(req.body);

            // Invalidate config cache
            cacheService.invalidate('config:restaurant');

            logger.info('SRI certificate environment updated successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };
}
