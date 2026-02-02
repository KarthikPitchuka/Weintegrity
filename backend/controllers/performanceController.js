import Performance from '../models/Performance.js';
// 
// @desc    Get performance reviews
// @route   GET /api/performance
// @access  Private
export const getPerformanceReviews = async (req, res) => {
    try {
        const { employeeId, status, reviewType, page = 1, limit = 10 } = req.query;

        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (reviewType) query.reviewType = reviewType;

        // If not admin/hr/manager, only show own reviews
        if (!['admin', 'HRManager', 'HRExecutive', 'DepartmentManager'].includes(req.user.role)) {
            query.employeeId = req.user.employeeId || req.user._id;
        }

        const reviews = await Performance.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('managerAssessment.reviewedBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Performance.countDocuments(query);

        res.json({
            reviews,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching performance reviews', error: error.message });
    }
};

// @desc    Get performance review by ID
// @route   GET /api/performance/:id
// @access  Private
export const getPerformanceReview = async (req, res) => {
    try {
        const review = await Performance.findById(req.params.id)
            .populate('employeeId', 'personalInfo employmentInfo employeeCode')
            .populate('managerAssessment.reviewedBy', 'firstName lastName');

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        res.json({ review });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching performance review', error: error.message });
    }
};

// @desc    Create performance review
// @route   POST /api/performance
// @access  Private (HR, Manager, Admin)
export const createPerformanceReview = async (req, res) => {
    try {
        const review = await Performance.create(req.body);
        res.status(201).json({ message: 'Performance review created successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error creating performance review', error: error.message });
    }
};

// @desc    Update performance review
// @route   PUT /api/performance/:id
// @access  Private
export const updatePerformanceReview = async (req, res) => {
    try {
        const review = await Performance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        res.json({ message: 'Performance review updated successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error updating performance review', error: error.message });
    }
};

// @desc    Submit self assessment
// @route   PUT /api/performance/:id/self-assessment
// @access  Private
export const submitSelfAssessment = async (req, res) => {
    try {
        const { rating, comments } = req.body;

        const review = await Performance.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        review.selfAssessment = {
            rating,
            comments,
            submittedOn: new Date()
        };
        review.status = 'manager-review';

        await review.save();

        res.json({ message: 'Self assessment submitted successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting self assessment', error: error.message });
    }
};

// @desc    Submit manager assessment
// @route   PUT /api/performance/:id/manager-assessment
// @access  Private (Manager, HR, Admin)
export const submitManagerAssessment = async (req, res) => {
    try {
        const { rating, comments, overallRating, performanceBand, strengths, areasOfImprovement } = req.body;

        const review = await Performance.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        review.managerAssessment = {
            rating,
            comments,
            submittedOn: new Date(),
            reviewedBy: req.user._id
        };
        review.overallRating = overallRating;
        review.performanceBand = performanceBand;
        review.strengths = strengths;
        review.areasOfImprovement = areasOfImprovement;
        review.status = 'discussion';

        await review.save();

        res.json({ message: 'Manager assessment submitted successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting manager assessment', error: error.message });
    }
};

// @desc    Complete review with acknowledgement
// @route   PUT /api/performance/:id/acknowledge
// @access  Private
export const acknowledgeReview = async (req, res) => {
    try {
        const { employeeComments } = req.body;

        const review = await Performance.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        review.acknowledgement = {
            acknowledged: true,
            acknowledgedOn: new Date(),
            employeeComments
        };
        review.status = 'completed';

        await review.save();

        res.json({ message: 'Review acknowledged successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error acknowledging review', error: error.message });
    }
};

// @desc    Delete performance review
// @route   DELETE /api/performance/:id
// @access  Private (HR, Admin)
export const deletePerformanceReview = async (req, res) => {
    try {
        const review = await Performance.findByIdAndDelete(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Performance review not found' });
        }

        res.json({ message: 'Performance review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting performance review', error: error.message });
    }
};

export default {
    getPerformanceReviews,
    getPerformanceReview,
    createPerformanceReview,
    updatePerformanceReview,
    submitSelfAssessment,
    submitManagerAssessment,
    acknowledgeReview,
    deletePerformanceReview
};
