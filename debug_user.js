import mongoose from 'mongoose';
import User from './backend/models/User.js';
import Employee from './backend/models/Employee.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'karthikpitchuka169@gmail.com' });
        console.log('User found:', user ? 'Yes' : 'No');
        console.log('User ID:', user._id);
        console.log('User Employee ID:', user.employeeId);
        
        if (user.employeeId) {
            const emp = await Employee.findById(user.employeeId);
            console.log('Employee Found via ID:', emp ? 'Yes' : 'No');
            if (emp) console.log('Employee Details:', JSON.stringify(emp, null, 2));
        } else {
             console.log('No employeeId on User document.');
             const empByEmail = await Employee.findOne({ 'contactInfo.email': 'karthikpitchuka169@gmail.com' });
             console.log('Employee Found via Email:', empByEmail ? 'Yes' : 'No');
             if (empByEmail) console.log('Employee ID found via email:', empByEmail._id);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};
check();
