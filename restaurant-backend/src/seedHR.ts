/**
 * Script de Seed - Datos Iniciales de HR
 * 
 * Crea roles básicos y un usuario administrador inicial
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoleModel } from './infrastructure/database/schemas/RoleSchema';
import { EmployeeModel } from './infrastructure/database/schemas/EmployeeSchema';
import bcrypt from 'bcryptjs';
import { logger } from './infrastructure/utils/Logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant';

const seedRoles = async () => {
    logger.info('Seeding roles...');

    const roles = [
        {
            name: 'Administrador',
            permissions: {
                dashboard: true,
                orders: true,
                customers: true,
                menu: true,
                kitchen: true,
                hr: true,
                billing: true,
                settings: true
            },
            isSystem: true
        },
        {
            name: 'Mesero',
            permissions: {
                dashboard: true,
                orders: true,
                customers: true,
                menu: true,
                kitchen: true
            }
        },
        {
            name: 'Chef',
            permissions: {
                dashboard: true,
                orders: true,
                menu: true,
                kitchen: true
            }
        },
        {
            name: 'Cajero',
            permissions: {
                dashboard: true,
                orders: true,
                customers: true,
                billing: true
            }
        }
    ];

    for (const roleData of roles) {
        // Usar findOneAndUpdate para crear si no existe, o actualizar si existe
        // Esto asegura que los permisos nuevos se apliquen a roles viejos
        await RoleModel.findOneAndUpdate(
            { name: roleData.name },
            { $set: roleData },
            { upsert: true, new: true }
        );
        logger.info(`Role synced: ${roleData.name}`);
    }
};

const seedAdminEmployee = async () => {
    logger.info('Seeding admin employee...');

    const adminRole = await RoleModel.findOne({ name: 'Administrador' });
    if (!adminRole) {
        logger.error('Admin role not found!');
        return;
    }

    const existingAdmin = await EmployeeModel.findOne({ username: 'admin' });
    if (existingAdmin) {
        logger.info('Admin employee already exists');
        return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await EmployeeModel.create({
        name: 'Administrador',
        username: 'admin',
        password: hashedPassword,
        roleId: adminRole._id.toString(),
        phone: '0999999999',
        salary: 1000,
        shifts: {
            Lunes: 'AM-PM',
            Martes: 'AM-PM',
            Miercoles: 'AM-PM',
            Jueves: 'AM-PM',
            Viernes: 'AM-PM',
            Sabado: 'Libre',
            Domingo: 'Libre'
        },
        equipment: {
            uniform: true,
            epp: true
        }
    });

    logger.info('Admin employee created: admin / admin123');
};

const main = async () => {
    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        logger.info('Connected to MongoDB');

        await seedRoles();
        await seedAdminEmployee();

        logger.info('Seed completed successfully!');
        logger.info('You can now login with: admin / admin123');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logger.error('Seed failed:', error);
        process.exit(1);
    }
};

main();
