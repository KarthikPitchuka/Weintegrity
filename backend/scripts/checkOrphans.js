
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config({ path: '../.env' });

const checkOrphanedAttendance = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Find all attendance records
        const allAttendance = await Attendance.find({}).populate('employeeId userId');

        console.log(`\nTotal Attendance Records: ${allAttendance.length}`);

        // Check for records with missing or null references
        let orphans = 0;
        for (const record of allAttendance) {
            const hasEmployee = record.employeeId && record.employeeId._id;
            const hasUser = record.userId && record.userId._id;

            // Sometimes employeeId field stores User ID (based on controller logic)
            // So we need to check if what is stored in 'employeeId' actually exists as a User if it's not an Employee

            if (!hasEmployee && !hasUser) {
                console.log(`Orphaned Record ID: ${record._id} - No linked Employee or User`);
                orphans++;
                // Optional: Delete these
                // await Attendance.findByIdAndDelete(record._id);
            }
        }

        console.log(`Potential Orphans found: ${orphans}`);

        // specifically check if we have any attendance for the emails we just deleted but maybe they are still there
        // Since users are deleted, we can't find them by email.
        // We have to rely on seeing if the IDs in attendance actually exist in the collections.

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit();
    }
};

checkOrphanedAttendance();
