const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BillSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Bill = mongoose.model('Bill', BillSchema);

async function check() {
    try {
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-pm';
        console.log('CONNECTING TO:', mongoUrl);
        await mongoose.connect(mongoUrl);
        
        const count = await Bill.countDocuments();
        console.log('COUNT:', count);

        const bills = await Bill.find().sort({ createdAt: -1 }).limit(5);
        for (const b of bills) {
            console.log('BILL:', b._id, b.documentNumber, b.customerName, b.createdAt.toISOString(), b.sriStatus);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('ERROR:', error);
    }
}

check();
