import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Holiday from '../models/Holiday.js';

dotenv.config();

const holidays2026 = [
    // January
    { name: 'New Year', date: '2026-01-01', type: 'national', description: 'New Year celebration' },
    { name: 'Makar Sankranti', date: '2026-01-14', type: 'regional', description: 'Harvest festival' },
    { name: 'Republic Day', date: '2026-01-26', type: 'national', description: 'Republic Day of India' },

    // February
    { name: 'Maha Shivaratri', date: '2026-02-15', type: 'national', description: 'Hindu festival dedicated to Lord Shiva' },

    // March
    { name: 'Holi', date: '2026-03-17', type: 'national', description: 'Festival of colors' },
    { name: 'Good Friday', date: '2026-04-03', type: 'national', description: 'Christian holiday' },

    // April
    { name: 'Ram Navami', date: '2026-04-05', type: 'national', description: 'Birth of Lord Rama' },
    { name: 'Mahavir Jayanti', date: '2026-04-14', type: 'national', description: 'Birth of Lord Mahavira' },
    { name: 'Ambedkar Jayanti', date: '2026-04-14', type: 'national', description: 'Birth of Dr. B.R. Ambedkar' },

    // May
    { name: 'Buddha Purnima', date: '2026-05-12', type: 'national', description: 'Birth of Gautama Buddha' },
    { name: 'Eid ul-Fitr', date: '2026-05-25', type: 'national', description: 'End of Ramadan', isOptional: false },

    // August
    { name: 'Independence Day', date: '2026-08-15', type: 'national', description: 'Independence Day of India' },
    { name: 'Raksha Bandhan', date: '2026-08-22', type: 'regional', description: 'Festival celebrating sibling bond' },
    { name: 'Janmashtami', date: '2026-08-30', type: 'national', description: 'Birth of Lord Krishna' },

    // October
    { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'national', description: 'Birth of Mahatma Gandhi' },
    { name: 'Dussehra', date: '2026-10-14', type: 'national', description: 'Victory of good over evil' },

    // November
    { name: 'Diwali', date: '2026-11-02', type: 'national', description: 'Festival of lights' },
    { name: 'Guru Nanak Jayanti', date: '2026-11-15', type: 'national', description: 'Birth of Guru Nanak' },

    // December
    { name: 'Christmas', date: '2026-12-25', type: 'national', description: 'Christmas celebration' }
];

const seedHolidays = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // Clear existing holidays for 2026
        await Holiday.deleteMany({ year: 2026 });
        console.log('Cleared existing 2026 holidays');

        // Insert new holidays
        const created = [];
        for (const h of holidays2026) {
            const holidayDate = new Date(h.date);
            const holiday = await Holiday.create({
                name: h.name,
                date: holidayDate,
                year: holidayDate.getFullYear(),
                type: h.type || 'national',
                description: h.description || '',
                isOptional: h.isOptional || false,
                applicableTo: 'all',
                isActive: true
            });
            created.push(holiday);
            console.log(`Created: ${holiday.name} - ${holiday.date.toDateString()}`);
        }

        console.log(`\n✅ Successfully seeded ${created.length} holidays for 2026`);

        // Show upcoming holidays
        const today = new Date();
        const upcoming = created.filter(h => h.date >= today).slice(0, 5);
        console.log('\nUpcoming holidays:');
        upcoming.forEach(h => {
            console.log(`  - ${h.name}: ${h.date.toDateString()}`);
        });

        await mongoose.disconnect();
        console.log('\nMongoDB Disconnected');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding holidays:', error);
        process.exit(1);
    }
};

seedHolidays();
