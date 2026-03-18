import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    identification: { type: String },
    address: { type: String },
}, { timestamps: true });

const Customer = mongoose.model('Customer', CustomerSchema);

async function check() {
    try {
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        
        const customers = await Customer.find().sort({ createdAt: -1 }).limit(5);
        console.log('Last 5 customers created:');
        customers.forEach(c => {
            console.log(`- ID: ${c._id}, Name: ${c.name}, Ident: ${c.identification}, Created: ${c.createdAt}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

check();
