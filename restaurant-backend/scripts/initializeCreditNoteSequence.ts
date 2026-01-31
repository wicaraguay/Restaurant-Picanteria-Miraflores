/**
 * Migration Script: Initialize Credit Note Sequential Counter
 * 
 * This script initializes the billing.currentSequenceNotaCredito field in RestaurantConfig
 * based on the highest sequential number found in existing credit notes.
 * 
 * Run this script ONCE before using the new sequential counter system.
 * 
 * Usage:
 *   npx ts-node scripts/initializeCreditNoteSequence.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CreditNoteModel } from '../src/infrastructure/database/schemas/CreditNoteSchema';
import { RestaurantConfigModel } from '../src/infrastructure/database/schemas/RestaurantConfigSchema';

dotenv.config();

async function initializeCreditNoteSequence() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Find the highest sequential from existing credit notes
        console.log('\n📊 Searching for existing credit notes...');
        const creditNotes = await CreditNoteModel.find()
            .select('documentNumber')
            .sort({ documentNumber: -1 })
            .limit(100); // Get top 100 to be safe

        console.log(`Found ${creditNotes.length} credit notes in database`);

        // 2. Extract sequential numbers and find the maximum
        let maxSequential = 0;

        for (const note of creditNotes) {
            if (note.documentNumber) {
                // documentNumber format: "001-001-000000038"
                const parts = note.documentNumber.split('-');
                if (parts.length === 3) {
                    const sequential = parseInt(parts[2]);
                    if (!isNaN(sequential) && sequential > maxSequential) {
                        maxSequential = sequential;
                        console.log(`  Found credit note ${note.documentNumber} with sequential ${sequential}`);
                    }
                }
            }
        }

        console.log(`\n📈 Highest sequential found: ${maxSequential}`);

        // 3. Set the counter to start from the next number
        const nextSequential = maxSequential > 0 ? maxSequential : 0;

        console.log(`\n⚙️  Setting counter to: ${nextSequential}`);
        console.log(`   (Next credit note will be #${nextSequential + 1})`);

        // 4. Update RestaurantConfig
        // We use $set to only update or add the currentSequenceNotaCredito field
        const result = await RestaurantConfigModel.findOneAndUpdate(
            { _id: 'restaurant-config' },
            {
                $set: {
                    'billing.currentSequenceNotaCredito': nextSequential
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        if (result) {
            console.log('\n✅ Credit Note Sequential counter initialized successfully!');
            console.log(`   Current value: ${result.billing?.currentSequenceNotaCredito || 0}`);
            console.log(`   Next credit note will have sequential: ${(result.billing?.currentSequenceNotaCredito || 0) + 1}`);
        } else {
            console.error('\n❌ Failed to update RestaurantConfig');
        }

    } catch (error) {
        console.error('\n❌ Error during migration:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
initializeCreditNoteSequence()
    .then(() => {
        console.log('\n✅ Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
