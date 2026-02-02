
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';

dotenv.config({ path: '../.env' });

const removeUsers = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const emailsToRemove = [
            'jithendrakote4@gmail.com',
            'nalluriwesly@gmail.com',
            'vivekracharla@gmail.com',
            'rahasyaracharla@gmail.com'
        ];

        console.log(`\n--- Removing Users and Associated Data: ${emailsToRemove.join(', ')} ---`);

        for (const email of emailsToRemove) {
            console.log(`\nProcessing: ${email}`);

            // 1. Find User
            const user = await User.findOne({ email: email });
            let employeeId = null;

            if (user) {
                // Check if user has a linked employee
                if (user.employeeId) {
                    employeeId = user.employeeId;
                } else {
                    // Try to find employee by userId reference
                    const linkedEmp = await Employee.findOne({ userId: user._id });
                    if (linkedEmp) employeeId = linkedEmp._id;
                }

                // Delete User
                await User.findByIdAndDelete(user._id);
                console.log(`✓ Deleted User account: ${user.firstName} ${user.lastName}`);
            } else {
                console.log(`- User account not found.`);
            }

            // 2. Find Employee by email if not already found via user link
            if (!employeeId) {
                const employeeByEmail = await Employee.findOne({ 'contactInfo.email': email });
                if (employeeByEmail) {
                    employeeId = employeeByEmail._id;
                }
            }

            // 3. If Employee found, delete it and all related data
            if (employeeId) {
                const employee = await Employee.findById(employeeId);
                const employeeName = employee ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}` : 'Unknown';

                // Delete Related Data
                const attendance = await Attendance.deleteMany({ employeeId: employeeId });
                const leaves = await Leave.deleteMany({ employeeId: employeeId });
                const payroll = await Payroll.deleteMany({ employeeId: employeeId });

                console.log(`✓ Deleted Related Data for ${employeeName}:`);
                console.log(`  - Attendance Records: ${attendance.deletedCount}`);
                console.log(`  - Leave Records: ${leaves.deletedCount}`);
                console.log(`  - Payroll Records: ${payroll.deletedCount}`);

                // Delete Employee
                await Employee.findByIdAndDelete(employeeId);
                console.log(`✓ Deleted Employee record: ${employeeName}`);
            } else {
                console.log(`- Employee record not found (no related operational data to delete).`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit();
    }
};

removeUsers();
