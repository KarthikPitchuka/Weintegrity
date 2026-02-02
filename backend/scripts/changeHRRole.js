import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const changeHR = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const oldHREmail = 'liyakhatyusuf@gmail.com';
        const newHREmail = 'karthikpitchuka169@gmail.com';

        // 1. Demote old HR
        const oldHR = await User.findOne({ email: oldHREmail });
        if (oldHR) {
            oldHR.role = 'Employee';
            await oldHR.save();
            console.log(`✅ Demoted ${oldHREmail} to Employee`);
        } else {
            console.log(`⚠️ User ${oldHREmail} not found`);
        }

        // 2. Promote new HR
        const newHR = await User.findOne({ email: newHREmail });
        if (newHR) {
            newHR.role = 'HRManager';
            await newHR.save();
            console.log(`✅ Promoted ${newHREmail} to HRManager`);
        } else {
            console.log(`⚠️ User ${newHREmail} not found`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

changeHR();
