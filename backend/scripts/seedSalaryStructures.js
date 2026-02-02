import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SalaryStructure from '../models/SalaryStructure.js';
import Employee from '../models/Employee.js';

dotenv.config();

const seedSalaryStructures = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management');
        console.log('Connected to MongoDB');

        // Get active employees
        const employees = await Employee.find({ status: 'active' }).limit(10);

        if (employees.length === 0) {
            console.log('No active employees found. Please create employees first.');
            process.exit(0);
        }

        console.log(`Found ${employees.length} active employees`);

        // Sample salary structures for different levels
        const salaryTemplates = [
            { basicPay: 25000, hraPercentage: 40, specialAllowance: 5000, grade: 'Junior' },
            { basicPay: 35000, hraPercentage: 50, specialAllowance: 8000, grade: 'Mid-Level' },
            { basicPay: 50000, hraPercentage: 50, specialAllowance: 15000, grade: 'Senior' },
            { basicPay: 75000, hraPercentage: 50, specialAllowance: 25000, grade: 'Lead' },
            { basicPay: 100000, hraPercentage: 50, specialAllowance: 35000, grade: 'Manager' }
        ];

        for (let i = 0; i < employees.length; i++) {
            const employee = employees[i];
            const template = salaryTemplates[i % salaryTemplates.length];

            // Check if salary structure already exists
            const existing = await SalaryStructure.findOne({
                employeeId: employee._id,
                isActive: true
            });

            if (existing) {
                console.log(`Salary structure already exists for ${employee.employeeCode}`);
                continue;
            }

            const salaryStructure = await SalaryStructure.create({
                employeeId: employee._id,
                basicPay: template.basicPay,
                hraPercentage: template.hraPercentage,
                daPercentage: 0,
                specialAllowance: template.specialAllowance,
                conveyanceAllowance: 1600,
                medicalAllowance: 1250,
                lta: template.basicPay * 0.05, // 5% of basic
                otherAllowances: [
                    { name: 'Mobile Allowance', amount: 1000, isTaxable: true },
                    { name: 'Internet Allowance', amount: 500, isTaxable: true }
                ],
                overtimeRate: 0,
                isOvertimeEligible: false,
                pfEnabled: true,
                pfPercentage: 12,
                employerPfPercentage: 12,
                esiEnabled: template.basicPay <= 15000, // ESI only for lower salaries
                esiPercentage: 0.75,
                employerEsiPercentage: 3.25,
                professionalTax: 200,
                effectiveFrom: new Date(),
                isActive: true
            });

            console.log(`Created salary structure for ${employee.employeeCode}:`);
            console.log(`  Basic: ₹${template.basicPay}`);
            console.log(`  Gross: ₹${salaryStructure.grossSalary}`);
            console.log(`  CTC: ₹${salaryStructure.ctc}/year`);
        }

        console.log('\n✅ Salary structures seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding salary structures:', error);
        process.exit(1);
    }
};

seedSalaryStructures();
