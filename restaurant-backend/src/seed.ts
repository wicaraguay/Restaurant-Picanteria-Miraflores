/**
 * @file seed.ts
 * @description Script para poblar la base de datos con datos iniciales
 * 
 * @purpose
 * Crea datos de prueba en MongoDB: menú, clientes, empleados (incluyendo admin), y órdenes.
 * Limpia datos existentes antes de insertar. Ejecutar con: npm run seed
 * 
 * @connections
 * - Usa: MenuItemModel, CustomerModel, OrderModel, EmployeeModel (infrastructure/database/schemas)
 * - Crea: Usuario admin con credenciales desde variables de entorno (SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD)
 * - Crea: Datos de ejemplo para desarrollo y testing
 * 
 * @environment_variables
 * - SEED_ADMIN_USERNAME: Username para el usuario administrador (default: 'admin')
 * - SEED_ADMIN_PASSWORD: Password para el usuario administrador (default: 'admin123')
 * - SEED_WAITER_USERNAME: Username para el mesero (default: 'cmesero')
 * - SEED_WAITER_PASSWORD: Password para el mesero (default: 'mesero123')
 * - SEED_CHEF_USERNAME: Username para el cocinero (default: 'acocinera')
 * - SEED_CHEF_PASSWORD: Password para el cocinero (default: 'cocina123')
 * 
 * @layer Infrastructure - Script de utilidad
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MenuItemModel } from './infrastructure/database/schemas/MenuItemSchema';
import { CustomerModel } from './infrastructure/database/schemas/CustomerSchema';
import { OrderModel } from './infrastructure/database/schemas/OrderSchema';
import { EmployeeModel } from './infrastructure/database/schemas/EmployeeSchema';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedData = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant-pm';
        console.log('🔄 Connecting to MongoDB...');
        console.log('📍 URI:', uri);

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB!');

        // Clear existing data
        console.log('\n🗑️  Clearing existing data...');
        await MenuItemModel.deleteMany({});
        await CustomerModel.deleteMany({});
        await OrderModel.deleteMany({});
        await EmployeeModel.deleteMany({});
        console.log('✅ Data cleared!');

        // Seed Menu Items
        console.log('\n🍽️  Seeding menu items...');
        const menuItems = [
            {
                name: 'Hamburguesa Clásica',
                description: 'Hamburguesa con carne, lechuga, tomate y queso',
                price: 8.99,
                category: 'Hamburguesas',
                imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                available: true
            },
            {
                name: 'Pizza Margherita',
                description: 'Pizza con tomate, mozzarella y albahaca',
                price: 12.99,
                category: 'Pizzas',
                imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
                available: true
            },
            {
                name: 'Ensalada César',
                description: 'Lechuga romana, pollo, crutones y aderezo césar',
                price: 7.99,
                category: 'Ensaladas',
                imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1',
                available: true
            },
            {
                name: 'Pasta Carbonara',
                description: 'Pasta con salsa carbonara, bacon y queso parmesano',
                price: 11.99,
                category: 'Pastas',
                imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3',
                available: true
            },
            {
                name: 'Tacos al Pastor',
                description: 'Tres tacos con carne al pastor, piña y cilantro',
                price: 9.99,
                category: 'Mexicana',
                imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
                available: true
            },
            {
                name: 'Sushi Roll',
                description: 'Roll de salmón, aguacate y pepino',
                price: 14.99,
                category: 'Sushi',
                imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
                available: true
            },
            {
                name: 'Coca Cola',
                description: 'Refresco de cola 500ml',
                price: 2.50,
                category: 'Bebidas',
                imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7',
                available: true
            },
            {
                name: 'Agua Mineral',
                description: 'Agua mineral natural 500ml',
                price: 1.50,
                category: 'Bebidas',
                imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d',
                available: true
            }
        ];

        const createdMenuItems = await MenuItemModel.insertMany(menuItems);
        console.log(`✅ Created ${createdMenuItems.length} menu items`);

        // Seed Customers
        console.log('\n👥 Seeding customers...');
        const customers = [
            {
                name: 'Juan Pérez',
                email: 'juan.perez@email.com',
                phone: '+1234567890',
                loyaltyPoints: 150,
                identification: 'DNI-12345678',
                address: 'Calle Principal 123',
                lastVisit: new Date()
            },
            {
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+1234567891',
                loyaltyPoints: 200,
                identification: 'DNI-87654321',
                address: 'Avenida Central 456',
                lastVisit: new Date()
            },
            {
                name: 'Carlos López',
                email: 'carlos.lopez@email.com',
                phone: '+1234567892',
                loyaltyPoints: 75,
                identification: 'DNI-11223344',
                address: 'Plaza Mayor 789',
                lastVisit: new Date()
            }
        ];

        const createdCustomers = await CustomerModel.insertMany(customers);
        console.log(`✅ Created ${createdCustomers.length} customers`);

        // Seed Roles first
        console.log('\n🎭 Seeding roles...');
        const { RoleModel } = require('./infrastructure/database/schemas/RoleSchema'); // CommonJS require if import fails or mixed modules

        const rolesData = [
            {
                name: 'Administrador',
                permissions: { dashboard: true, orders: true, customers: true, menu: true, kitchen: true, hr: true, billing: true, settings: true },
                isSystem: true
            },
            {
                name: 'Mesero',
                permissions: { dashboard: true, orders: true, customers: true, menu: true, kitchen: true }
            },
            {
                name: 'Chef',
                permissions: { dashboard: true, orders: true, menu: true, kitchen: true }
            },
            {
                name: 'Cajero',
                permissions: { dashboard: true, orders: true, customers: true, billing: true }
            }
        ];

        // Ensure roles exist and get their IDs
        const rolesMap: Record<string, string> = {};
        for (const r of rolesData) {
            const role = await RoleModel.findOneAndUpdate(
                { name: r.name },
                { $set: r },
                { upsert: true, new: true }
            );
            rolesMap[r.name] = role._id.toString();
        }
        console.log('✅ Roles seeded');

        // Seed Employees (including admin user)
        console.log('\n👨‍💼 Seeding employees...');
        const employees = [
            {
                name: 'Administrador',
                username: process.env.SEED_ADMIN_USERNAME || 'admin',
                password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
                roleId: rolesMap['Administrador'], // Use real ID
                phone: '+1234567890',
                salary: 5000,
                shifts: { 'Lunes': '9:00-17:00' },
                equipment: { uniform: true, epp: true }
            },
            {
                name: 'Carlos Mesero',
                username: process.env.SEED_WAITER_USERNAME || 'cmesero',
                password: process.env.SEED_WAITER_PASSWORD || 'mesero123',
                roleId: rolesMap['Mesero'],
                phone: '+1234567893',
                salary: 1500,
                shifts: { 'Lunes': '12:00-20:00' },
                equipment: { uniform: true, epp: false }
            },
            {
                name: 'Ana Cocinera',
                username: process.env.SEED_CHEF_USERNAME || 'acocinera',
                password: process.env.SEED_CHEF_PASSWORD || 'cocina123',
                roleId: rolesMap['Chef'],
                phone: '+1234567894',
                salary: 2500,
                shifts: { 'Lunes': '10:00-18:00' },
                equipment: { uniform: true, epp: true }
            }
        ];


        // Hash passwords before inserting
        const employeesWithHashedPasswords = await Promise.all(employees.map(async (emp) => {
            const hashedPassword = await bcrypt.hash(emp.password, 10);
            return { ...emp, password: hashedPassword };
        }));

        const createdEmployees = await EmployeeModel.insertMany(employeesWithHashedPasswords);
        console.log(`✅ Created ${createdEmployees.length} employees`);

        // Seed Orders
        console.log('\n📦 Seeding orders...');
        const orders = [
            {
                customerName: 'Juan Pérez',
                items: [
                    { name: 'Hamburguesa Clásica', quantity: 2, price: 8.99 },
                    { name: 'Coca Cola', quantity: 2, price: 2.50 }
                ],
                type: 'En Local',
                status: 'Nuevo',
                billed: false
            },
            {
                customerName: 'María García',
                items: [
                    { name: 'Pizza Margherita', quantity: 1, price: 12.99 },
                    { name: 'Ensalada César', quantity: 1, price: 7.99 }
                ],
                type: 'Delivery',
                status: 'Nuevo',
                billed: false
            },
            {
                customerName: 'Carlos López',
                items: [
                    { name: 'Tacos al Pastor', quantity: 3, price: 9.99 }
                ],
                type: 'Para Llevar',
                status: 'Completado',
                billed: true
            }
        ];

        const createdOrders = await OrderModel.insertMany(orders);
        console.log(`✅ Created ${createdOrders.length} orders`);

        console.log('\n✨ Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Menu Items: ${createdMenuItems.length}`);
        console.log(`   - Customers: ${createdCustomers.length}`);
        console.log(`   - Employees: ${createdEmployees.length}`);
        console.log(`   - Orders: ${createdOrders.length}`);
        console.log('\n🔐 Admin Credentials:');
        console.log(`   Username: ${process.env.SEED_ADMIN_USERNAME || 'admin'}`);
        console.log(`   Password: ${process.env.SEED_ADMIN_PASSWORD || 'admin123'}`);
        console.log('\n💡 You can now connect MongoDB Compass to:');
        console.log(`   ${uri}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
