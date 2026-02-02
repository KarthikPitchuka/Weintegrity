// Seed sample job postings to the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Recruitment from '../models/Recruitment.js';
import User from '../models/User.js';

dotenv.config();

const jobPostings = [
    {
        jobTitle: 'software engineer',
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'part-time',
        experienceLevel: 'entry',
        description: 'We are looking for a software engineer to join our team.',
        requirements: ['Basic programming knowledge', 'Good communication skills'],
        responsibilities: ['Write code', 'Fix bugs'],
        salaryRange: { min: 300000, max: 500000, currency: 'INR' },
        openings: 2,
        status: 'draft',
        postedDate: new Date(),
        applicants: []
    },
    {
        jobTitle: 'UI/UX Designer',
        department: 'Design',
        location: 'Mumbai',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        description: 'Join our design team to create beautiful interfaces.',
        requirements: ['Figma expertise', 'User research experience'],
        responsibilities: ['Design UI components', 'Create user flows'],
        salaryRange: { min: 800000, max: 1500000, currency: 'INR' },
        openings: 2,
        status: 'closed',
        postedDate: new Date(),
        applicants: []
    },
    {
        jobTitle: 'Marketing Manager',
        department: 'Marketing',
        location: 'Delhi',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        description: 'Lead our marketing campaigns and strategy.',
        requirements: ['Marketing experience', 'Leadership skills'],
        responsibilities: ['Plan campaigns', 'Manage team'],
        salaryRange: { min: 1200000, max: 1800000, currency: 'INR' },
        openings: 1,
        status: 'closed',
        postedDate: new Date(),
        applicants: []
    },
    {
        jobTitle: 'Data Analyst',
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        description: 'Analyze data to drive business decisions.',
        requirements: ['SQL mastery', 'Python for data analysis'],
        responsibilities: ['Analyze datasets', 'Create reports'],
        salaryRange: { min: 1000000, max: 1600000, currency: 'INR' },
        openings: 2,
        status: 'open',
        postedDate: new Date(),
        applicants: []
    },
    {
        jobTitle: 'Senior Software Developer',
        department: 'Engineering',
        location: 'Bangalore',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        description: 'Lead developer for core platform services.',
        requirements: ['5+ years JS/Node experience', 'System design skills'],
        responsibilities: ['Architect solutions', 'Code core modules'],
        salaryRange: { min: 1500000, max: 2500000, currency: 'INR' },
        openings: 3,
        status: 'open',
        postedDate: new Date(),
        applicants: []
    }
];

const seedRecruitment = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management');
        console.log('Connected to MongoDB');

        // Find an existing user to be the creator
        let adminUser = await User.findOne({ role: { $in: ['admin', 'HRManager', 'HRExecutive'] } });

        if (!adminUser) {
            console.log('No admin/HR user found. Creating a default HR Manager...');
            adminUser = await User.create({
                email: 'hr@example.com',
                password: 'password123',
                firstName: 'HR',
                lastName: 'Manager',
                role: 'HRManager'
            });
            console.log('Created default HR Manager user');
        }

        // Check if job postings already exist and clear them
        const existingCount = await Recruitment.countDocuments();
        if (existingCount > 0) {
            console.log(`${existingCount} job postings exist. Clearing them...`);
            await Recruitment.deleteMany({});
        }

        // Add createdBy to each job posting
        const jobsWithCreator = jobPostings.map(job => ({
            ...job,
            createdBy: adminUser._id
        }));

        await Recruitment.insertMany(jobsWithCreator);
        console.log(`✅ ${jobPostings.length} job postings seeded successfully!`);

        // Show all job postings
        const allJobs = await Recruitment.find();
        console.log('\nCurrent Job Postings:');
        allJobs.forEach(job => {
            console.log(`  - ${job.jobTitle} (${job.department}): ${job.openings} openings - ${job.status}`);
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

seedRecruitment();
