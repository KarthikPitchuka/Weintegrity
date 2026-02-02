import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'karthikpitchuka169@gmail.com';
        const newPassword = 'HRManager@123';

        const user = await User.findOne({ email });

        if (!user) {
            console.error(`User ${email} not found`);
            process.exit(1);
        }

        user.password = newPassword;
        await user.save();

        console.log(`✅ Password successfully reset for ${email}`);
        console.log(`🔑 New Password: ${newPassword}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

resetPassword();
