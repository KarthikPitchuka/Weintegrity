// Seed leave types to the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveType from '../models/LeaveType.js';

dotenv.config();

// Official HR leave types with fixed annual quotas
const leaveTypes = [
    {
        name: 'Casual Leave',
        code: 'CL',
        description: 'Casual leave for personal reasons and emergencies',
        annualQuota: 12,
        maxConsecutiveDays: 3,
        carryForward: { allowed: false, maxDays: 0, expiryMonths: 0 },
        encashment: { allowed: false, maxDays: 0 },
        applicableTo: { gender: 'all', employmentTypes: ['full-time', 'part-time'], minServiceDays: 0 },
        requiresApproval: true,
        requiresAttachment: false,
        minDaysNotice: 1,
        isPaid: true,
        color: '#3B82F6',
        isActive: true
    },
    {
        name: 'Sick Leave',
        code: 'SL',
        description: 'Leave for medical reasons and health issues',
        annualQuota: 10,
        maxConsecutiveDays: 7,
        carryForward: { allowed: false, maxDays: 0, expiryMonths: 0 },
        encashment: { allowed: false, maxDays: 0 },
        applicableTo: { gender: 'all', employmentTypes: ['full-time', 'part-time', 'contract'], minServiceDays: 0 },
        requiresApproval: true,
        requiresAttachment: true, // Medical certificate required for more than 2 days
        minDaysNotice: 0,
        isPaid: true,
        color: '#10B981',
        isActive: true
    },
    {
        name: 'Earned Leave',
        code: 'EL',
        description: 'Earned/Privilege leave that accrues over time',
        annualQuota: 14,
        maxConsecutiveDays: 30,
        carryForward: { allowed: true, maxDays: 30, expiryMonths: 12 },
        encashment: { allowed: true, maxDays: 15 },
        applicableTo: { gender: 'all', employmentTypes: ['full-time'], minServiceDays: 90 },
        requiresApproval: true,
        requiresAttachment: false,
        minDaysNotice: 7,
        isPaid: true,
        color: '#8B5CF6',
        isActive: true
    },
    {
        name: 'Comp Off',
        code: 'CO',
        description: 'Compensatory time off for extra work on weekends/holidays',
        annualQuota: 5,
        maxConsecutiveDays: 2,
        carryForward: { allowed: false, maxDays: 0, expiryMonths: 0 },
        encashment: { allowed: false, maxDays: 0 },
        applicableTo: { gender: 'all', employmentTypes: ['full-time', 'part-time'], minServiceDays: 0 },
        requiresApproval: true,
        requiresAttachment: false,
        minDaysNotice: 1,
        isPaid: true,
        color: '#F59E0B',
        isActive: true
    },
    {
        name: 'Maternity Leave',
        code: 'ML',
        description: 'Maternity leave as per government regulations (26 weeks)',
        annualQuota: 180, // 26 weeks = 182 days, rounded to 180
        maxConsecutiveDays: 180,
        carryForward: { allowed: false, maxDays: 0, expiryMonths: 0 },
        encashment: { allowed: false, maxDays: 0 },
        applicableTo: { gender: 'female', employmentTypes: ['full-time'], minServiceDays: 80 },
        requiresApproval: true,
        requiresAttachment: true, // Medical certificate required
        minDaysNotice: 30,
        isPaid: true,
        color: '#EC4899',
        isActive: true
    },
    {
        name: 'Paternity Leave',
        code: 'PL',
        description: 'Paternity leave for new fathers',
        annualQuota: 15,
        maxConsecutiveDays: 15,
        carryForward: { allowed: false, maxDays: 0, expiryMonths: 0 },
        encashment: { allowed: false, maxDays: 0 },
        applicableTo: { gender: 'male', employmentTypes: ['full-time'], minServiceDays: 80 },
        requiresApproval: true,
        requiresAttachment: true, // Birth certificate required
        minDaysNotice: 10,
        isPaid: true,
        color: '#06B6D4',
        isActive: true
    }
];

const seedLeaveTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management');
        console.log('Connected to MongoDB');

        // Delete existing leave types and reseed for accurate quotas
        const existingCount = await LeaveType.countDocuments();

        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing leave types. Updating quotas...`);

            // Update existing leave types with new quotas
            for (const leaveType of leaveTypes) {
                await LeaveType.findOneAndUpdate(
                    { code: leaveType.code },
                    leaveType,
                    { upsert: true, new: true }
                );
                console.log(`  ✓ Updated/Created: ${leaveType.name} (${leaveType.code}) - ${leaveType.annualQuota} days/year`);
            }
        } else {
            await LeaveType.insertMany(leaveTypes);
            console.log(`✅ ${leaveTypes.length} leave types seeded successfully!`);
        }

        // Show all leave types
        const allTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });
        console.log('\n📋 Active Leave Types (Fixed Annual Quotas):');
        console.log('─'.repeat(50));
        allTypes.forEach(type => {
            console.log(`  ${type.name.padEnd(20)} (${type.code}) : ${type.annualQuota.toString().padStart(3)} days/year`);
        });
        console.log('─'.repeat(50));

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

seedLeaveTypes();
