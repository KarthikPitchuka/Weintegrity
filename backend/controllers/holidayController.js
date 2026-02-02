import Holiday from '../models/Holiday.js';
import { notifyAllEmployees } from './notificationController.js';

// @desc    Get all holidays (with filters)
// @route   GET /api/holidays
// @access  Private
export const getHolidays = async (req, res) => {
    try {
        const { year, upcoming, limit } = req.query;

        let query = { isActive: true };

        // Filter by year
        if (year) {
            query.year = parseInt(year);
        }

        // Get upcoming holidays only
        if (upcoming === 'true') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.date = { $gte: today };
        }

        let holidaysQuery = Holiday.find(query)
            .sort({ date: 1 })
            .populate('createdBy', 'firstName lastName');

        // Limit results
        if (limit) {
            holidaysQuery = holidaysQuery.limit(parseInt(limit));
        }

        const holidays = await holidaysQuery;

        res.json({ holidays });
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ message: 'Error fetching holidays', error: error.message });
    }
};

// @desc    Get upcoming holidays for dashboard
// @route   GET /api/holidays/upcoming
// @access  Private
export const getUpcomingHolidays = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limit = parseInt(req.query.limit) || 5;

        const holidays = await Holiday.find({
            isActive: true,
            date: { $gte: today }
        })
            .sort({ date: 1 })
            .limit(limit)
            .select('name date type isOptional');

        // Format holidays for frontend
        const formattedHolidays = holidays.map(h => ({
            id: h._id,
            name: h.name,
            date: h.date,
            day: h.date.toLocaleDateString('en-US', { weekday: 'long' }),
            month: h.date.toLocaleDateString('en-US', { month: 'short' }),
            dayOfMonth: h.date.getDate(),
            type: h.type,
            isOptional: h.isOptional
        }));

        res.json({ holidays: formattedHolidays });
    } catch (error) {
        console.error('Error fetching upcoming holidays:', error);
        res.status(500).json({ message: 'Error fetching upcoming holidays', error: error.message });
    }
};

// @desc    Get single holiday
// @route   GET /api/holidays/:id
// @access  Private
export const getHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id)
            .populate('createdBy', 'firstName lastName');

        if (!holiday) {
            return res.status(404).json({ message: 'Holiday not found' });
        }

        res.json({ holiday });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holiday', error: error.message });
    }
};

// @desc    Create holiday
// @route   POST /api/holidays
// @access  Private (HR, Admin)
export const createHoliday = async (req, res) => {
    try {
        const { name, date, type, description, isOptional, applicableTo, departments } = req.body;

        const holidayDate = new Date(date);
        const year = holidayDate.getFullYear();

        // Check if holiday already exists on this date
        const existingHoliday = await Holiday.findOne({
            date: holidayDate,
            name: name
        });

        if (existingHoliday) {
            return res.status(400).json({ message: 'A holiday with this name already exists on this date' });
        }

        const holiday = await Holiday.create({
            name,
            date: holidayDate,
            year,
            type: type || 'national',
            description,
            isOptional: isOptional || false,
            applicableTo: applicableTo || 'all',
            departments: departments || [],
            createdBy: req.user._id,
            isActive: true
        });

        // Notify all employees about the new holiday
        const formattedDate = holidayDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        await notifyAllEmployees({
            type: 'holiday_added',
            title: '🎉 New Holiday Announced!',
            message: `${name} on ${formattedDate} has been added to the holiday calendar.${isOptional ? ' (Optional Holiday)' : ''}`,
            data: {
                referenceId: holiday._id,
                referenceModel: 'Holiday',
                actionUrl: '/holidays'
            },
            createdById: req.user._id
        });

        res.status(201).json({ message: 'Holiday created successfully', holiday });
    } catch (error) {
        console.error('Error creating holiday:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Error creating holiday', error: error.message });
    }
};

// @desc    Update holiday
// @route   PUT /api/holidays/:id
// @access  Private (HR, Admin)
export const updateHoliday = async (req, res) => {
    try {
        const { name, date, type, description, isOptional, applicableTo, departments, isActive } = req.body;

        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({ message: 'Holiday not found' });
        }

        // Update fields
        if (name) holiday.name = name;
        if (date) {
            holiday.date = new Date(date);
            holiday.year = holiday.date.getFullYear();
        }
        if (type) holiday.type = type;
        if (description !== undefined) holiday.description = description;
        if (isOptional !== undefined) holiday.isOptional = isOptional;
        if (applicableTo) holiday.applicableTo = applicableTo;
        if (departments) holiday.departments = departments;
        if (isActive !== undefined) holiday.isActive = isActive;

        await holiday.save();

        res.json({ message: 'Holiday updated successfully', holiday });
    } catch (error) {
        console.error('Error updating holiday:', error);
        res.status(500).json({ message: 'Error updating holiday', error: error.message });
    }
};

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
// @access  Private (HR, Admin)
export const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);

        if (!holiday) {
            return res.status(404).json({ message: 'Holiday not found' });
        }

        res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting holiday', error: error.message });
    }
};

// @desc    Bulk create holidays (for seeding)
// @route   POST /api/holidays/bulk
// @access  Private (Admin)
export const bulkCreateHolidays = async (req, res) => {
    try {
        const { holidays } = req.body;

        if (!holidays || !Array.isArray(holidays)) {
            return res.status(400).json({ message: 'Holidays array is required' });
        }

        const createdHolidays = [];

        for (const h of holidays) {
            const holidayDate = new Date(h.date);
            const year = holidayDate.getFullYear();

            // Skip if already exists
            const existing = await Holiday.findOne({ date: holidayDate, name: h.name });
            if (!existing) {
                const holiday = await Holiday.create({
                    name: h.name,
                    date: holidayDate,
                    year,
                    type: h.type || 'national',
                    description: h.description || '',
                    isOptional: h.isOptional || false,
                    applicableTo: 'all',
                    createdBy: req.user._id,
                    isActive: true
                });
                createdHolidays.push(holiday);
            }
        }

        res.status(201).json({
            message: `${createdHolidays.length} holidays created successfully`,
            holidays: createdHolidays
        });
    } catch (error) {
        console.error('Error bulk creating holidays:', error);
        res.status(500).json({ message: 'Error creating holidays', error: error.message });
    }
};

export default {
    getHolidays,
    getUpcomingHolidays,
    getHoliday,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    bulkCreateHolidays
};
