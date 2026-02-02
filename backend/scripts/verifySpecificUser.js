import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const verifyUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'dheerajsrisai2@gmail.com';

        // Find the user
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Found user: ${user.email}`);
            console.log(`Current status: isEmailVerified = ${user.isEmailVerified}`);

            user.isEmailVerified = true;
            user.emailOTP = undefined;
            user.emailOTPExpires = undefined;
            await user.save();

            console.log(`✅ Successfully verified user: ${user.email}`);
        } else {
            console.log(`User ${email} not found.`);
        }

        // Also fix any others just in case
        const result = await User.updateMany(
            { isEmailVerified: false },
            { $set: { isEmailVerified: true, emailOTP: undefined, emailOTPExpires: undefined } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ Auto-verified ${result.modifiedCount} other pending accounts.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

verifyUser();
