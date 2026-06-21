/**
 * Swagger/OpenAPI Configuration
 *
 * Configures automatic API documentation using swagger-jsdoc and swagger-ui-express.
 * Scans route files for JSDoc annotations and generates OpenAPI 3.0 spec.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Restaurant Backend API',
            version: '1.0.0',
            description: 'API documentation for Restaurant Management System - Picantería Miraflores',
            contact: {
                name: 'Restaurant Backend Team'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from /api/auth/login'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'error'
                        },
                        message: {
                            type: 'string',
                            example: 'Error message description'
                        },
                        code: {
                            type: 'string',
                            example: 'ERROR_CODE'
                        }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'success'
                        },
                        data: {
                            type: 'object'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    // Scan route files for JSDoc annotations
    // In development: read .ts files, in production: read .js files
    apis: process.env.NODE_ENV === 'production'
        ? [
            './dist/infrastructure/web/routes/*.js',
            './dist/interfaces/http/routes/*.js'
        ]
        : [
            './src/infrastructure/web/routes/*.ts',
            './src/interfaces/http/routes/*.ts'
        ]
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI at /api-docs endpoint
 */
export const setupSwagger = (app: Express): void => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Restaurant API Docs'
    }));
};

export default swaggerSpec;
