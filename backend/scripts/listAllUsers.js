
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config({ path: '../.env' });

const listAllEmails = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Fetch all Users
        const users = await User.find({}, 'email firstName lastName role').lean();

        // Fetch all Employees
        const employees = await Employee.find({}, 'contactInfo.email personalInfo.firstName personalInfo.lastName employeeCode').lean();

        console.log('\n--- REGISTERED USER ACCOUNTS ---');
        console.log(`Total Users: ${users.length}`);
        if (users.length > 0) {
            console.table(users.map(u => ({
                Email: u.email,
                Name: `${u.firstName} ${u.lastName}`,
                Role: u.role,
                ID: u._id.toString()
            })));
        } else {
            console.log("No users found.");
        }

        console.log('\n--- REGISTERED EMPLOYEE RECORDS ---');
        console.log(`Total Employees: ${employees.length}`);
        if (employees.length > 0) {
            console.table(employees.map(e => ({
                Email: e.contactInfo?.email || 'N/A',
                Name: `${e.personalInfo?.firstName} ${e.personalInfo?.lastName}`,
                Code: e.employeeCode,
                ID: e._id.toString()
            })));
        } else {
            console.log("No employees found.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit();
    }
};

listAllEmails();
