import Training from '../models/Training.js';
import { notifyAllEmployees } from './notificationController.js';

// @desc    Get all trainings
// @route   GET /api/training
// @access  Private
export const getTrainings = async (req, res) => {
    try {
        const { status, category, type, page = 1, limit = 10 } = req.query;

        const query = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (type) query.type = type;

        const trainings = await Training.find(query)
            .populate('createdBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ 'schedule.startDate': -1 });

        const total = await Training.countDocuments(query);

        res.json({
            trainings,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trainings', error: error.message });
    }
};

// @desc    Get training by ID
// @route   GET /api/training/:id
// @access  Private
export const getTraining = async (req, res) => {
    try {
        const training = await Training.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('participants.employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode');

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        res.json({ training });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching training', error: error.message });
    }
};

// @desc    Create training
// @route   POST /api/training
// @access  Private (HR, Admin)
export const createTraining = async (req, res) => {
    try {
        const training = await Training.create({
            ...req.body,
            createdBy: req.user._id
        });

        // Notify all employees about the new training
        const startDate = training.schedule?.startDate
            ? new Date(training.schedule.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'Date TBD';

        await notifyAllEmployees({
            type: 'training_scheduled',
            title: '📚 New Training Session',
            message: `"${training.title}" has been scheduled for ${startDate}. Register now to secure your spot!`,
            data: {
                referenceId: training._id,
                referenceModel: 'Training',
                actionUrl: '/training'
            },
            createdById: req.user._id
        });

        res.status(201).json({ message: 'Training created successfully', training });
    } catch (error) {
        res.status(500).json({ message: 'Error creating training', error: error.message });
    }
};


// @desc    Update training
// @route   PUT /api/training/:id
// @access  Private (HR, Admin)
export const updateTraining = async (req, res) => {
    try {
        const training = await Training.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        res.json({ message: 'Training updated successfully', training });
    } catch (error) {
        res.status(500).json({ message: 'Error updating training', error: error.message });
    }
};

// @desc    Delete training
// @route   DELETE /api/training/:id
// @access  Private (Admin)
export const deleteTraining = async (req, res) => {
    try {
        const training = await Training.findByIdAndDelete(req.params.id);

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        res.json({ message: 'Training deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting training', error: error.message });
    }
};

// @desc    Register for training
// @route   POST /api/training/:id/register
// @access  Private
export const registerForTraining = async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        if (training.status !== 'scheduled') {
            return res.status(400).json({ message: 'Registration is not open for this training' });
        }

        // Use employeeId if available, otherwise use user._id
        const participantIdentifier = req.user.employeeId || req.user._id;

        // Check if already registered
        const alreadyRegistered = training.participants.some(
            p => p.employeeId.toString() === participantIdentifier.toString() ||
                (p.employeeId.toString() === req.user.employeeId?.toString())
        );

        if (alreadyRegistered) {
            return res.status(400).json({ message: 'You are already registered for this training' });
        }

        // Check max participants
        if (training.targetAudience.maxParticipants &&
            training.participants.length >= training.targetAudience.maxParticipants) {
            return res.status(400).json({ message: 'Training is full' });
        }

        training.participants.push({
            employeeId: participantIdentifier,
            registeredOn: new Date()
        });

        await training.save();

        res.json({ message: 'Registered successfully for the training' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering for training', error: error.message });
    }
};

// @desc    Update participant attendance
// @route   PUT /api/training/:id/attendance/:participantId
// @access  Private (HR, Admin)
export const updateParticipantAttendance = async (req, res) => {
    try {
        const { attendanceStatus, completionPercentage } = req.body;

        const training = await Training.findById(req.params.id);

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        const participant = training.participants.id(req.params.participantId);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        if (attendanceStatus) participant.attendanceStatus = attendanceStatus;
        if (completionPercentage !== undefined) participant.completionPercentage = completionPercentage;

        await training.save();

        res.json({ message: 'Attendance updated successfully', participant });
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendance', error: error.message });
    }
};

// @desc    Submit training feedback
// @route   POST /api/training/:id/feedback
// @access  Private
export const submitFeedback = async (req, res) => {
    try {
        const { rating, comments } = req.body;

        const training = await Training.findById(req.params.id);

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        // Use employeeId if available, otherwise use user._id
        const participantIdentifier = req.user.employeeId || req.user._id;

        const participant = training.participants.find(
            p => p.employeeId.toString() === participantIdentifier.toString() ||
                (req.user.employeeId && p.employeeId.toString() === req.user.employeeId.toString())
        );

        if (!participant) {
            return res.status(400).json({ message: 'You are not a participant of this training' });
        }

        participant.feedback = {
            rating,
            comments,
            submittedOn: new Date()
        };

        await training.save();

        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
};

export default {
    getTrainings,
    getTraining,
    createTraining,
    updateTraining,
    deleteTraining,
    registerForTraining,
    updateParticipantAttendance,
    submitFeedback
};
