
/// <reference types="node" />

import 'dotenv/config';
import mongoose from 'mongoose';
import { RoleModel } from '../src/infrastructure/database/schemas/RoleSchema';

const updatePermissions = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const roleName = 'Administrador';
        const role = await RoleModel.findOne({ name: roleName });

        if (!role) {
            console.error(`Role '${roleName}' not found.`);
            process.exit(1);
        }

        console.log(`Updating permissions for role: ${roleName}`);

        // Define strict list of current permissions
        const permissions = [
            'dashboard',
            'orders',
            'menu',
            'kitchen',
            'hr',
            'settings',
            'billing'
        ];

        // Ensure permissions property exists and is a Map
        if (!role.permissions) {
            role.permissions = new Map();
        }

        // We know it's a Map because of the Schema definition
        const permsMap = role.permissions as unknown as Map<string, boolean>;

        // Set all active permissions to true
        permissions.forEach(p => {
            console.log(`Granting ${p}...`);
            permsMap.set(p, true);
        });

        // Remove obsolete 'analytics' permission if it exists
        if (permsMap.has('analytics')) {
            console.log('Removing obsolete analytics permission...');
            permsMap.set('analytics', false); // Or delete: permsMap.delete('analytics');
            // Keeping it false might be safer if some old code checks it, but delete is cleaner.
            // Let's just set to true 'dashboard' which covers it now.
            permsMap.delete('analytics');
        }

        role.markModified('permissions');
        await role.save();

        console.log('Permissions updated successfully.');
        console.log('Current Permissions:', Object.fromEntries(permsMap));

    } catch (error) {
        console.error('Error updating permissions:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

updatePermissions();
