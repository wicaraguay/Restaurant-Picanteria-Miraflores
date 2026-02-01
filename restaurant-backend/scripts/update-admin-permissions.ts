
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
        // Cast to any to avoid TS errors with dynamic Map/Object types
        const role = await RoleModel.findOne({ name: roleName }) as any;

        if (!role) {
            console.error(`Role '${roleName}' not found.`);
            process.exit(1);
        }

        console.log(`Updating permissions for role: ${roleName}`);

        // Add analytics permission
        // Mongoose maps need .set, but plain objects need assignment
        if (role.permissions && typeof role.permissions.set === 'function') {
            role.permissions.set('analytics', true);
        } else {
            role.permissions['analytics'] = true;
        }

        // Always mark as modified for Mixed/Map types
        role.markModified('permissions');

        await role.save();
        console.log('Permissions updated successfully.');

    } catch (error) {
        console.error('Error updating permissions:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

updatePermissions();
