/**
 * Database Cleanup Script
 * Removes corrupt payroll records with null employee IDs
 * 
 * Run with: node scripts/cleanupPayroll.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management';

async function cleanup() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the payrolls collection directly
        const db = mongoose.connection.db;
        const payrollsCollection = db.collection('payrolls');
        const salaryStructuresCollection = db.collection('salarystructures');

        // Find corrupt payroll records (with null employeeId)
        const corruptPayrolls = await payrollsCollection.find({
            $or: [
                { employeeId: null },
                { 'payPeriod.month': null },
                { 'payPeriod.year': null }
            ]
        }).toArray();

        console.log(`Found ${corruptPayrolls.length} corrupt payroll records`);

        if (corruptPayrolls.length > 0) {
            // Delete corrupt records
            const result = await payrollsCollection.deleteMany({
                $or: [
                    { employeeId: null },
                    { 'payPeriod.month': null },
                    { 'payPeriod.year': null }
                ]
            });
            console.log(`Deleted ${result.deletedCount} corrupt payroll records`);
        }

        // Find and clean up duplicate salary structures (keep only one per employee)
        const duplicateSalaryStructures = await salaryStructuresCollection.aggregate([
            {
                $group: {
                    _id: '$employeeId',
                    count: { $sum: 1 },
                    docs: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Found ${duplicateSalaryStructures.length} employees with duplicate salary structures`);

        for (const dup of duplicateSalaryStructures) {
            // Keep the first one, delete the rest
            const toDelete = dup.docs.slice(1);
            if (toDelete.length > 0) {
                await salaryStructuresCollection.deleteMany({
                    _id: { $in: toDelete }
                });
                console.log(`Cleaned up ${toDelete.length} duplicate salary structures for employee ${dup._id}`);
            }
        }

        // Clean up salary structures with null employeeId
        const corruptSalaryStructures = await salaryStructuresCollection.deleteMany({
            employeeId: null
        });
        console.log(`Deleted ${corruptSalaryStructures.deletedCount} corrupt salary structures`);

        console.log('\n✅ Cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

cleanup();
