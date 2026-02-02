
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

dotenv.config();

const documentsData = [
    {
        title: 'Employee Handbook 2024',
        fileName: 'Employee_Handbook_2024.pdf',
        fileUrl: '/uploads/Employee_Handbook_2024.pdf',
        originalName: 'Employee Handbook 2024.pdf',
        fileType: 'application/pdf',
        fileSize: 2400000,
        documentType: 'policy-acknowledgement',
        category: 'Policy', // Requires schema update or use existing mapping
        tags: ['handbook', 'policy', '2024'],
        isConfidential: false,
        uploadedOn: new Date('2024-12-01')
    },
    {
        title: 'Holiday Calendar 2025',
        fileName: 'Holiday_Calendar_2025.pdf',
        fileUrl: '/uploads/Holiday_Calendar_2025.pdf',
        originalName: 'Holiday Calendar 2025.pdf',
        fileType: 'application/pdf',
        fileSize: 1100000,
        documentType: 'other',
        category: 'General',
        tags: ['holiday', 'calendar', '2025'],
        isConfidential: false,
        uploadedOn: new Date('2024-12-15')
    },
    {
        title: 'Code of Conduct',
        fileName: 'Code_of_Conduct.docx',
        fileUrl: '/uploads/Code_of_Conduct.docx',
        originalName: 'Code of Conduct.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 850000,
        documentType: 'policy-acknowledgement',
        category: 'Policy',
        tags: ['conduct', 'compliance', 'legal'],
        isConfidential: false,
        uploadedOn: new Date('2024-06-10')
    },
    {
        title: 'Insurance Benefit Guide',
        fileName: 'Insurance_Benefit_Guide.pdf',
        fileUrl: '/uploads/Insurance_Benefit_Guide.pdf',
        originalName: 'Insurance Benefit Guide.pdf',
        fileType: 'application/pdf',
        fileSize: 3200000,
        documentType: 'other',
        category: 'Benefits',
        tags: ['insurance', 'benefits', 'medical'],
        isConfidential: false,
        uploadedOn: new Date('2024-11-20')
    }
];

const seedDocuments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management');
        console.log('Connected to MongoDB');

        // Find an admin user to be the uploader
        const adminUser = await User.findOne({ role: { $in: ['admin', 'HRManager'] } });
        if (!adminUser) {
            console.error('No admin user found. Please run seedUsers.js first.');
            process.exit(1);
        }

        // Get an employee ID (create dummy if needed or find one)
        let employee = await Employee.findOne();
        if (!employee) {
            // Fallback if no employee
            employee = { _id: new mongoose.Types.ObjectId() };
        }

        // Clear existing documents
        await Document.deleteMany({});
        console.log('Cleared existing documents');

        // Prepare documents
        const docsToInsert = documentsData.map(doc => ({
            ...doc,
            employeeId: employee._id,
            uploadedBy: adminUser._id,
            // Map our UI category to documentType or just store it if we add a field. 
            // The current schema has 'documentType' enum. 
            // I will use tags to store the "Category" from the UI or flexible mapping.
        }));

        await Document.insertMany(docsToInsert);
        console.log(`✅ ${documentsData.length} documents seeded successfully!`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error seeding documents:', error);
        process.exit(1);
    }
};

seedDocuments();
