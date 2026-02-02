// Utility script to drop stale indexes on the Employee collection
// Run this if you're getting duplicate key errors for fields that shouldn't be unique

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropStaleIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management');
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const employeesCollection = db.collection('employees');

        // Get all indexes
        const indexes = await employeesCollection.indexes();
        console.log('\nCurrent indexes on employees collection:');
        indexes.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key),
                index.unique ? '(UNIQUE)' : '');
        });

        // Find indexes that might be causing issues 
        // (unique indexes on email-related fields that shouldn't be unique)
        const problematicIndexes = indexes.filter(index => {
            const keyStr = JSON.stringify(index.key);
            // Check for email-related unique indexes (these shouldn't exist)
            return index.unique &&
                (keyStr.includes('email') || keyStr.includes('contactInfo.email')) &&
                index.name !== '_id_';
        });

        if (problematicIndexes.length > 0) {
            console.log('\n⚠️ Found potentially problematic unique indexes:');
            for (const index of problematicIndexes) {
                console.log(`  - Dropping index: ${index.name}`);
                await employeesCollection.dropIndex(index.name);
                console.log(`  ✅ Dropped: ${index.name}`);
            }
        } else {
            console.log('\n✅ No problematic indexes found on email fields.');
        }

        // Show final state
        const finalIndexes = await employeesCollection.indexes();
        console.log('\nFinal indexes on employees collection:');
        finalIndexes.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key),
                index.unique ? '(UNIQUE)' : '');
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

dropStaleIndexes();
