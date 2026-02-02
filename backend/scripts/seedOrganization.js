import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';

dotenv.config();

const seedOrganization = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            Company.deleteMany({}),
            Branch.deleteMany({}),
            Department.deleteMany({}),
            Designation.deleteMany({}),
            Grade.deleteMany({}),
            Shift.deleteMany({})
        ]);
        console.log('Cleared existing organization data');

        // Create Company
        const company = await Company.create({
            name: 'TechCorp Solutions Pvt Ltd',
            legalName: 'TechCorp Solutions Private Limited',
            code: 'TECH001',
            type: 'headquarters',
            industry: 'technology',
            registrationNumber: 'U72200KA2020PTC123456',
            gstNumber: '29AADCT1234A1ZV',
            panNumber: 'AADCT1234A',
            tanNumber: 'BLRT01234A',
            contact: {
                email: 'info@techcorp.com',
                phone: '+91 80 4567 8900',
                website: 'https://www.techcorp.com'
            },
            registeredAddress: {
                street: '123 Tech Park, Electronic City',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                pincode: '560100'
            },
            statutory: {
                pfNumber: 'KAPF/BLR/12345',
                esiNumber: 'KAESI/BLR/67890',
                ptNumber: 'KAPT/BLR/11111',
                ptState: 'Karnataka'
            },
            settings: {
                currency: 'INR',
                dateFormat: 'DD/MM/YYYY',
                timeZone: 'Asia/Kolkata',
                weekStartDay: 1,
                workingDays: [1, 2, 3, 4, 5]
            }
        });
        console.log('Created company:', company.name);

        // Create Branches
        const branches = await Branch.insertMany([
            {
                name: 'Bangalore HQ',
                code: 'BLRHQ01',
                company: company._id,
                type: 'head-office',
                contact: { email: 'bangalore@techcorp.com', phone: '+91 80 4567 8900' },
                address: { street: '123 Tech Park, Electronic City', city: 'Bangalore', state: 'Karnataka', pincode: '560100' },
                location: { latitude: 12.8447, longitude: 77.6602, radius: 200 },
                operatingHours: { startTime: '09:00', endTime: '18:00' }
            },
            {
                name: 'Hyderabad Office',
                code: 'HYDOF01',
                company: company._id,
                type: 'regional-office',
                contact: { email: 'hyderabad@techcorp.com', phone: '+91 40 4567 8900' },
                address: { street: 'Plot 45, HITEC City', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
                location: { latitude: 17.4474, longitude: 78.3762, radius: 200 },
                operatingHours: { startTime: '09:30', endTime: '18:30' }
            },
            {
                name: 'Mumbai Office',
                code: 'MUMOF01',
                company: company._id,
                type: 'branch',
                contact: { email: 'mumbai@techcorp.com' },
                address: { street: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' },
                operatingHours: { startTime: '10:00', endTime: '19:00' }
            }
        ]);
        console.log('Created branches:', branches.length);

        // Create Grades (Pay Scales)
        const grades = await Grade.insertMany([
            {
                name: 'Entry Level',
                code: 'G01',
                company: company._id,
                level: 1,
                salaryRange: { minimum: 300000, maximum: 500000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true }, esi: { applicable: true, ceilingAmount: 21000 } },
                benefits: { paidLeave: 18, sickLeave: 12, casualLeave: 6 },
                noticePeriod: { days: 30 },
                probation: { duration: 6 }
            },
            {
                name: 'Associate',
                code: 'G02',
                company: company._id,
                level: 2,
                salaryRange: { minimum: 500000, maximum: 800000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true }, esi: { applicable: false } },
                benefits: { paidLeave: 18, sickLeave: 12, casualLeave: 6 },
                noticePeriod: { days: 30 },
                probation: { duration: 6 }
            },
            {
                name: 'Senior Associate',
                code: 'G03',
                company: company._id,
                level: 3,
                salaryRange: { minimum: 800000, maximum: 1200000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 21, sickLeave: 12, casualLeave: 6 },
                noticePeriod: { days: 60 },
                probation: { duration: 3 }
            },
            {
                name: 'Team Lead',
                code: 'G04',
                company: company._id,
                level: 4,
                salaryRange: { minimum: 1200000, maximum: 1800000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 21, sickLeave: 12, casualLeave: 6, insuranceCover: 500000 },
                noticePeriod: { days: 60 },
                probation: { duration: 3 }
            },
            {
                name: 'Manager',
                code: 'G05',
                company: company._id,
                level: 5,
                salaryRange: { minimum: 1800000, maximum: 2500000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 24, sickLeave: 12, casualLeave: 6, insuranceCover: 700000 },
                noticePeriod: { days: 90 },
                probation: { duration: 3 }
            },
            {
                name: 'Senior Manager',
                code: 'G06',
                company: company._id,
                level: 6,
                salaryRange: { minimum: 2500000, maximum: 3500000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 24, sickLeave: 12, casualLeave: 6, insuranceCover: 1000000, fuelAllowance: 5000 },
                noticePeriod: { days: 90 }
            },
            {
                name: 'Director',
                code: 'G07',
                company: company._id,
                level: 7,
                salaryRange: { minimum: 3500000, maximum: 5000000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 30, sickLeave: 12, casualLeave: 6, insuranceCover: 1500000, fuelAllowance: 10000, carLease: true },
                noticePeriod: { days: 90 }
            },
            {
                name: 'Vice President',
                code: 'G08',
                company: company._id,
                level: 8,
                salaryRange: { minimum: 5000000, maximum: 8000000 },
                ctcStructure: { basic: 40, hra: 20, pf: { applicable: true } },
                benefits: { paidLeave: 30, sickLeave: 12, casualLeave: 6, insuranceCover: 2000000, stockOptions: true, carLease: true },
                noticePeriod: { days: 90 }
            }
        ]);
        console.log('Created grades:', grades.length);

        // Create Departments
        const engineering = await Department.create({
            name: 'Engineering',
            code: 'ENG001',
            company: company._id,
            description: 'Software Engineering and Product Development',
            level: 1,
            costCenter: { code: 'CC-ENG', name: 'Engineering Cost Center' },
            branch: branches[0]._id
        });

        const frontend = await Department.create({
            name: 'Frontend Engineering',
            code: 'FE001',
            company: company._id,
            description: 'Frontend Web and Mobile Development',
            parentDepartment: engineering._id,
            branch: branches[0]._id
        });

        const backend = await Department.create({
            name: 'Backend Engineering',
            code: 'BE001',
            company: company._id,
            description: 'Backend Services and APIs Development',
            parentDepartment: engineering._id,
            branch: branches[0]._id
        });

        const hr = await Department.create({
            name: 'Human Resources',
            code: 'HR001',
            company: company._id,
            description: 'Human Resources and People Operations',
            level: 1,
            costCenter: { code: 'CC-HR', name: 'HR Cost Center' },
            branch: branches[0]._id
        });

        const finance = await Department.create({
            name: 'Finance',
            code: 'FIN001',
            company: company._id,
            description: 'Finance and Accounting',
            level: 1,
            costCenter: { code: 'CC-FIN', name: 'Finance Cost Center' },
            branch: branches[0]._id
        });

        const sales = await Department.create({
            name: 'Sales & Marketing',
            code: 'SM001',
            company: company._id,
            description: 'Sales, Marketing and Business Development',
            level: 1,
            costCenter: { code: 'CC-SM', name: 'Sales & Marketing Cost Center' },
            branch: branches[0]._id
        });

        console.log('Created departments: 6');

        // Create Designations
        const designations = await Designation.insertMany([
            { name: 'Software Engineer Trainee', code: 'SET1', company: company._id, level: 1, category: 'trainee', jobFamily: 'engineering', grade: grades[0]._id },
            { name: 'Software Engineer', code: 'SE2', company: company._id, level: 2, category: 'staff', jobFamily: 'engineering', grade: grades[1]._id },
            { name: 'Senior Software Engineer', code: 'SSE3', company: company._id, level: 3, category: 'staff', jobFamily: 'engineering', grade: grades[2]._id },
            { name: 'Tech Lead', code: 'TL4', company: company._id, level: 4, category: 'junior-management', jobFamily: 'engineering', grade: grades[3]._id, scope: { canApproveLeave: true, canApproveTimesheet: true } },
            { name: 'Engineering Manager', code: 'EM5', company: company._id, level: 5, category: 'middle-management', jobFamily: 'engineering', grade: grades[4]._id, scope: { canApproveLeave: true, canApproveExpense: true, canHire: true } },

            { name: 'HR Executive', code: 'HRE2', company: company._id, level: 2, category: 'staff', jobFamily: 'hr', grade: grades[1]._id },
            { name: 'HR Manager', code: 'HRM5', company: company._id, level: 5, category: 'middle-management', jobFamily: 'hr', grade: grades[4]._id, scope: { canApproveLeave: true, canHire: true, canTerminate: true } },

            { name: 'Accountant', code: 'ACC2', company: company._id, level: 2, category: 'staff', jobFamily: 'finance', grade: grades[1]._id },
            { name: 'Finance Manager', code: 'FM5', company: company._id, level: 5, category: 'middle-management', jobFamily: 'finance', grade: grades[4]._id, scope: { canApproveExpense: true, approvalLimit: 500000 } },

            { name: 'Sales Executive', code: 'SLE2', company: company._id, level: 2, category: 'staff', jobFamily: 'sales', grade: grades[1]._id },
            { name: 'Sales Manager', code: 'SLM5', company: company._id, level: 5, category: 'middle-management', jobFamily: 'sales', grade: grades[4]._id },

            { name: 'Director of Engineering', code: 'DOE7', company: company._id, level: 7, category: 'senior-management', jobFamily: 'engineering', grade: grades[6]._id, scope: { canApproveLeave: true, canApproveExpense: true, canHire: true, canTerminate: true } },
            { name: 'VP of Engineering', code: 'VPE8', company: company._id, level: 8, category: 'executive', jobFamily: 'leadership', grade: grades[7]._id }
        ]);
        console.log('Created designations:', designations.length);

        // Create Shifts
        const shifts = await Shift.insertMany([
            {
                name: 'General Shift',
                code: 'SHFREG01',
                company: company._id,
                type: 'regular',
                timing: { startTime: '09:00', endTime: '18:00', graceTime: 15, halfDayHours: 4, fullDayHours: 8 },
                breaks: [{ name: 'Lunch', startTime: '13:00', endTime: '14:00', duration: 60, isPaid: true }],
                workingDays: [1, 2, 3, 4, 5],
                overtime: { allowed: true, minOvertimeHours: 1, maxOvertimeHours: 4, overtimeRate: 1.5 },
                weekOff: { type: 'fixed', fixedDays: [0, 6] },
                color: '#3B82F6'
            },
            {
                name: 'Flexible Shift',
                code: 'SHFFLEX01',
                company: company._id,
                type: 'flexible',
                timing: { startTime: '10:00', endTime: '19:00', graceTime: 30, halfDayHours: 4, fullDayHours: 8 },
                breaks: [{ name: 'Lunch', duration: 60, isPaid: true }],
                workingDays: [1, 2, 3, 4, 5],
                flexibility: { flexibleStart: true, earliestStart: '08:00', latestStart: '11:00', coreHoursStart: '11:00', coreHoursEnd: '17:00' },
                overtime: { allowed: true },
                weekOff: { type: 'fixed', fixedDays: [0, 6] },
                color: '#10B981'
            },
            {
                name: 'Night Shift',
                code: 'SHFNGT01',
                company: company._id,
                type: 'night',
                timing: { startTime: '21:00', endTime: '06:00', graceTime: 15, halfDayHours: 4, fullDayHours: 8 },
                breaks: [{ name: 'Dinner', startTime: '00:00', endTime: '01:00', duration: 60, isPaid: true }],
                workingDays: [1, 2, 3, 4, 5],
                nightShift: { isNightShift: true, nightStartHour: 21, nightEndHour: 6, nightAllowance: 500 },
                overtime: { allowed: true, overtimeRate: 2 },
                weekOff: { type: 'fixed', fixedDays: [0, 6] },
                color: '#6366F1'
            },
            {
                name: 'Rotational Shift',
                code: 'SHFROT01',
                company: company._id,
                type: 'rotational',
                timing: { startTime: '06:00', endTime: '14:00', graceTime: 15, fullDayHours: 8 },
                breaks: [{ name: 'Break', duration: 30, isPaid: true }],
                workingDays: [1, 2, 3, 4, 5, 6],
                overtime: { allowed: true },
                weekOff: { type: 'rotational', rotationalPattern: 'weekly' },
                color: '#F59E0B'
            }
        ]);
        console.log('Created shifts:', shifts.length);

        console.log('\n✅ Organization seed completed successfully!');
        console.log('\nSummary:');
        console.log('- 1 Company');
        console.log(`- ${branches.length} Branches`);
        console.log('- 6 Departments (with hierarchy)');
        console.log(`- ${designations.length} Designations`);
        console.log(`- ${grades.length} Grades/Pay Scales`);
        console.log(`- ${shifts.length} Shifts`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding organization:', error);
        process.exit(1);
    }
};

seedOrganization();
