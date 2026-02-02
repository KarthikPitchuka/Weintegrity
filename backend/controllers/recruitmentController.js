import Recruitment from '../models/Recruitment.js';

// @desc    Get all job postings
// @route   GET /api/recruitment
// @access  Private
export const getJobPostings = async (req, res) => {
    try {
        const { status, department, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (department) query.department = department;

        const jobs = await Recruitment.find(query)
            .populate('createdBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Recruitment.countDocuments(query);

        res.json({
            jobs,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching job postings', error: error.message });
    }
};

// @desc    Get job posting by ID
// @route   GET /api/recruitment/:id
// @access  Private
export const getJobPosting = async (req, res) => {
    try {
        const job = await Recruitment.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('applicants.reviewedBy', 'firstName lastName');

        if (!job) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.json({ job });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching job posting', error: error.message });
    }
};

// @desc    Create job posting
// @route   POST /api/recruitment
// @access  Private (HR, Admin)
export const createJobPosting = async (req, res) => {
    try {
        const job = await Recruitment.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({ message: 'Job posting created successfully', job });
    } catch (error) {
        res.status(500).json({ message: 'Error creating job posting', error: error.message });
    }
};

// @desc    Update job posting
// @route   PUT /api/recruitment/:id
// @access  Private (HR, Admin)
export const updateJobPosting = async (req, res) => {
    try {
        const job = await Recruitment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.json({ message: 'Job posting updated successfully', job });
    } catch (error) {
        res.status(500).json({ message: 'Error updating job posting', error: error.message });
    }
};

// @desc    Delete job posting
// @route   DELETE /api/recruitment/:id
// @access  Private (Admin)
export const deleteJobPosting = async (req, res) => {
    try {
        const job = await Recruitment.findByIdAndDelete(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.json({ message: 'Job posting deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting job posting', error: error.message });
    }
};

// @desc    Add applicant to job posting
// @route   POST /api/recruitment/:id/apply
// @access  Public
export const applyForJob = async (req, res) => {
    try {
        const job = await Recruitment.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        if (job.status !== 'open') {
            return res.status(400).json({ message: 'This job is no longer accepting applications' });
        }

        // Check if already applied
        const alreadyApplied = job.applicants.some(a => a.email === req.body.email);
        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this position' });
        }

        job.applicants.push(req.body);
        await job.save();

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting application', error: error.message });
    }
};

// @desc    Update applicant status
// @route   PUT /api/recruitment/:id/applicants/:applicantId
// @access  Private (HR, Admin)
export const updateApplicantStatus = async (req, res) => {
    try {
        const { status, interviewDate, interviewNotes, rating } = req.body;

        const job = await Recruitment.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        const applicant = job.applicants.id(req.params.applicantId);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        if (status) applicant.status = status;
        if (interviewDate) applicant.interviewDate = interviewDate;
        if (interviewNotes) applicant.interviewNotes = interviewNotes;
        if (rating) applicant.rating = rating;
        applicant.reviewedBy = req.user._id;

        await job.save();

        res.json({ message: 'Applicant status updated successfully', applicant });
    } catch (error) {
        res.status(500).json({ message: 'Error updating applicant status', error: error.message });
    }
};

export default {
    getJobPostings,
    getJobPosting,
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
    applyForJob,
    updateApplicantStatus
};
