import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import User from '../models/User.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const removeUnverifiedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find unverified users
        const unverifiedUsers = await User.find({ isEmailVerified: false });

        if (unverifiedUsers.length === 0) {
            console.log('No unverified users found.');
            return;
        }

        console.log(`Found ${unverifiedUsers.length} unverified users.`);

        for (const user of unverifiedUsers) {
            console.log(`Deleting user: ${user.email} (${user._id})`);

            // If user is linked to an employee, unset the userId in Employee collection
            if (user.employeeId) {
                console.log(`  - Unlinking from Employee ${user.employeeId}`);
                await Employee.findByIdAndUpdate(user.employeeId, { $unset: { userId: 1 } });
            }

            await User.findByIdAndDelete(user._id);
            console.log('  - Deleted successfully');
        }

        console.log('\nAll unverified users have been removed.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

removeUnverifiedUsers();
