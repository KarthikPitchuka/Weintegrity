import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import config from '../config/env.js';

dotenv.config();

// Predefined users for the HR system
const predefinedUsers = [
    // Admin Account
    {
        email: 'admin@company.com',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
    },
    // HR Executive Accounts
    {
        email: 'hr1@company.com',
        password: 'hr123456',
        firstName: 'Priya',
        lastName: 'Sharma',
        role: 'hr',
        isActive: true
    },
    {
        email: 'hr2@company.com',
        password: 'hr123456',
        firstName: 'Rahul',
        lastName: 'Kumar',
        role: 'hr',
        isActive: true
    },
    {
        email: 'hr.manager@company.com',
        password: 'hrmanager123',
        firstName: 'Anita',
        lastName: 'Desai',
        role: 'hr',
        isActive: true
    },
    // Manager Accounts
    {
        email: 'manager@company.com',
        password: 'manager123',
        firstName: 'Vikram',
        lastName: 'Singh',
        role: 'manager',
        isActive: true
    },
    // Employee Account (for testing)
    {
        email: 'employee@company.com',
        password: 'employee123',
        firstName: 'Amit',
        lastName: 'Patel',
        role: 'employee',
        isActive: true
    }
];

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongodbUri);
        console.log('📦 Connected to MongoDB');

        console.log('\n🌱 Seeding predefined users...\n');

        for (const userData of predefinedUsers) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`⏭️  User already exists: ${userData.email} (${userData.role})`);
            } else {
                // Create new user
                const user = await User.create(userData);
                console.log(`✅ Created user: ${userData.email} (${userData.role})`);
            }
        }

        console.log('\n✨ Seeding completed successfully!\n');
        console.log('='.repeat(50));
        console.log('📋 PREDEFINED LOGIN CREDENTIALS:');
        console.log('='.repeat(50));
        console.log('\n🔴 ADMIN:');
        console.log('   Email: admin@company.com');
        console.log('   Password: admin123');
        console.log('\n🟢 HR EXECUTIVES:');
        console.log('   Email: hr1@company.com | Password: hr123456');
        console.log('   Email: hr2@company.com | Password: hr123456');
        console.log('   Email: hr.manager@company.com | Password: hrmanager123');
        console.log('\n🔵 MANAGER:');
        console.log('   Email: manager@company.com');
        console.log('   Password: manager123');
        console.log('\n🟡 EMPLOYEE:');
        console.log('   Email: employee@company.com');
        console.log('   Password: employee123');
        console.log('\n' + '='.repeat(50));

    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📦 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the seed function
seedUsers();
