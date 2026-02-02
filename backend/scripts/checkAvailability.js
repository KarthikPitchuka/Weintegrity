
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '../.env' });

const checkEmail = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const emailToCheck = 'shaikliyakhatyusufraza@gmail.com';

        const user = await User.findOne({ email: emailToCheck });
        const employee = await Employee.findOne({ 'contactInfo.email': emailToCheck });

        console.log('\n--- Availability Check ---');
        console.log(`Checking email: ${emailToCheck}`);

        let isAvailable = true;

        if (user) {
            console.log(`[USER FOUND] User ID: ${user._id}, Name: ${user.firstName} ${user.lastName}, Role: ${user.role}`);
            isAvailable = false;
        } else {
            console.log('[USER NOT FOUND] No user account with this email.');
        }

        if (employee) {
            console.log(`[EMPLOYEE FOUND] Employee Code: ${employee.employeeCode}, Name: ${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`);
            isAvailable = false;
        } else {
            console.log('[EMPLOYEE NOT FOUND] No employee record with this email.');
        }

        console.log('\n--- Result ---');
        if (isAvailable) {
            console.log('The email is AVAILABLE.');
        } else {
            console.log('The email is ALREADY TAKEN.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit();
    }
};

checkEmail();
