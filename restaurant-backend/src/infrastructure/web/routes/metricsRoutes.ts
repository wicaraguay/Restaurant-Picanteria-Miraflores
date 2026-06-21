/**
 * metricsRoutes.ts
 * Prometheus metrics exposition endpoint
 *
 * Exposes /metrics endpoint for Prometheus scraping
 */

import { Router, Request, Response } from 'express';
import { metricsService } from '../../monitoring/MetricsService';
import { logger } from '../../utils/Logger';

const router = Router();

/**
 * GET /metrics
 * Return Prometheus metrics in text format
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        if (!metricsService.isEnabled()) {
            return res.status(503).send('# Metrics service not initialized\n');
        }

        const metrics = await metricsService.getMetrics();
        const contentType = metricsService.getContentType();

        res.setHeader('Content-Type', contentType);
        res.send(metrics);
    } catch (error) {
        logger.error('[Metrics] Error serving metrics', { error });
        res.status(500).send('# Error collecting metrics\n');
    }
});

export default router;
