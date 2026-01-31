/**
 * Migration Script: Initialize Sequential Counter
 * 
 * This script initializes the billing.currentSequenceFactura field in RestaurantConfig
 * based on the highest sequential number found in existing bills.
 * 
 * Run this script ONCE before using the new sequential counter system.
 * 
 * Usage:
 *   npx ts-node scripts/initializeSequentialCounter.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { BillModel } from '../src/infrastructure/database/schemas/BillSchema';
import { RestaurantConfigModel } from '../src/infrastructure/database/schemas/RestaurantConfigSchema';

dotenv.config();

async function initializeSequentialCounter() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Find the highest sequential from existing bills
        console.log('\n📊 Searching for existing bills...');
        const bills = await BillModel.find()
            .select('documentNumber')
            .sort({ documentNumber: -1 })
            .limit(100); // Get top 100 to be safe

        console.log(`Found ${bills.length} bills in database`);

        // 2. Extract sequential numbers and find the maximum
        let maxSequential = 0;

        for (const bill of bills) {
            if (bill.documentNumber) {
                // documentNumber format: "001-001-000000038"
                const parts = bill.documentNumber.split('-');
                if (parts.length === 3) {
                    const sequential = parseInt(parts[2]);
                    if (!isNaN(sequential) && sequential > maxSequential) {
                        maxSequential = sequential;
                        console.log(`  Found bill ${bill.documentNumber} with sequential ${sequential}`);
                    }
                }
            }
        }

        console.log(`\n📈 Highest sequential found: ${maxSequential}`);

        // 3. Set the counter to start from the next number
        const nextSequential = maxSequential > 0 ? maxSequential : 0;

        console.log(`\n⚙️  Setting counter to: ${nextSequential}`);
        console.log(`   (Next invoice will be #${nextSequential + 1})`);

        // 4. Update RestaurantConfig
        const result = await RestaurantConfigModel.findOneAndUpdate(
            { _id: 'restaurant-config' },
            {
                $set: {
                    'billing.currentSequenceFactura': nextSequential
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        if (result) {
            console.log('\n✅ Sequential counter initialized successfully!');
            console.log(`   Current value: ${result.billing?.currentSequenceFactura || 0}`);
            console.log(`   Next invoice will have sequential: ${(result.billing?.currentSequenceFactura || 0) + 1}`);
        } else {
            console.error('\n❌ Failed to update RestaurantConfig');
        }

        // 5. Verify
        console.log('\n🔍 Verifying configuration...');
        const config = await RestaurantConfigModel.findById('restaurant-config');
        if (config) {
            console.log(`   ✓ Establishment: ${config.billing?.establishment}`);
            console.log(`   ✓ Emission Point: ${config.billing?.emissionPoint}`);
            console.log(`   ✓ Current Sequential: ${config.billing?.currentSequenceFactura}`);
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('You can now generate invoices with automatic sequential numbers.');

    } catch (error) {
        console.error('\n❌ Error during migration:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
initializeSequentialCounter()
    .then(() => {
        console.log('\n✅ Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
