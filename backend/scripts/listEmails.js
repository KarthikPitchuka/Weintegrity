import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env') });

const listEmails = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}).select('email role isEmailVerified firstName lastName');

        console.log('\n=== REGISTERED EMAILS ===');
        console.table(users.map(u => ({
            Email: u.email,
            Role: u.role,
            Verified: u.isEmailVerified ? '✅' : '❌',
            Name: `${u.firstName} ${u.lastName}`
        })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected');
    }
};

listEmails();
