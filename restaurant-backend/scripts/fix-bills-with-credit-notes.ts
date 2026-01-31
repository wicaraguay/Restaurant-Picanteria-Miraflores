/**
 * Script to update bills that have credit notes to CANCELLED status
 * Run this once to fix bills created before the status update fix
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const billSchema = new mongoose.Schema({
    sriStatus: String,
    hasCreditNote: Boolean,
    documentNumber: String
}, { collection: 'bills', strict: false });

const Bill = mongoose.model('Bill', billSchema);

async function fixBillsWithCreditNotes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant');

        console.log('Finding bills with credit notes but not marked as CANCELLED...');

        const billsToUpdate = await Bill.find({
            hasCreditNote: true,
            sriStatus: { $ne: 'CANCELLED' }
        });

        console.log(`Found ${billsToUpdate.length} bills to update`);

        for (const bill of billsToUpdate) {
            console.log(`Updating bill ${bill.documentNumber} to CANCELLED`);
            await Bill.updateOne(
                { _id: bill._id },
                { $set: { sriStatus: 'CANCELLED' } }
            );
        }

        console.log('✅ All bills updated successfully!');

    } catch (error) {
        console.error('Error updating bills:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixBillsWithCreditNotes();
