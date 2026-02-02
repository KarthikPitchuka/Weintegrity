
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

dotenv.config({ path: '../.env' });

const cleanOrphans = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Find all attendance records
        const allAttendance = await Attendance.find({}).populate('employeeId userId');

        console.log(`\nTotal Attendance Records Scanned: ${allAttendance.length}`);

        let deletedCount = 0;
        for (const record of allAttendance) {
            // Check if linked Employee exists (if linked)
            const hasEmployee = record.employeeId && record.employeeId._id;

            // Check if linked User exists (if linked)
            const hasUser = record.userId && record.userId._id;

            // An attendance record is an orphan if:
            // 1. It refers to an Employee ID that doesn't exist AND
            // 2. It refers to a User ID that doesn't exist

            // Note: populate returns null if the referenced document is missing
            const isEmployeeMissing = record.employeeId === null; // Was populated but found nothing
            const isUserMissing = record.userId === null;         // Was populated but found nothing

            // Logic:
            // If the record has an employeeId field but populate returned null, it's a broken link.
            // If the record has a userId field but populate returned null, it's a broken link.

            // We delete if it has NO valid links left.
            if (isEmployeeMissing && isUserMissing) {
                console.log(`Deleting Orphan Record: ${record._id}`);
                await Attendance.findByIdAndDelete(record._id);
                deletedCount++;
            } else if (isEmployeeMissing && !record.userId) {
                // Has only employee link, and it's broken
                console.log(`Deleting Orphan Record (Broken Emp Link, No User): ${record._id}`);
                await Attendance.findByIdAndDelete(record._id);
                deletedCount++;
            } else if (isUserMissing && !record.employeeId) {
                // Has only user link, and it's broken
                console.log(`Deleting Orphan Record (Broken User Link, No Emp): ${record._id}`);
                await Attendance.findByIdAndDelete(record._id);
                deletedCount++;
            }
        }

        console.log(`\nSuccessfully deleted ${deletedCount} orphaned attendance records.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit();
    }
};

cleanOrphans();
