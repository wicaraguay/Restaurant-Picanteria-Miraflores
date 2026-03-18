const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-pm';
        console.log('CONNECTING TO:', mongoUrl);
        await mongoose.connect(mongoUrl);
        
        const count = await Customer.countDocuments();
        console.log('COUNT:', count);

        const customers = await Customer.find().sort({ createdAt: -1 }).limit(10);
        for (const c of customers) {
            console.log('CUST:', c._id, c.name, c.identification, c.createdAt.toISOString());
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('ERROR:', error);
    }
}

check();
