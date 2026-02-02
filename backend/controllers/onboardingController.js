import Onboarding from '../models/Onboarding.js';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';

// Default onboarding tasks template
const defaultOnboardingTasks = [
    { category: 'documentation', title: 'Collect ID proof copies', priority: 'high', order: 1 },
    { category: 'documentation', title: 'Collect address proof', priority: 'high', order: 2 },
    { category: 'documentation', title: 'Collect educational certificates', priority: 'medium', order: 3 },
    { category: 'documentation', title: 'Collect previous employment documents', priority: 'medium', order: 4 },
    { category: 'documentation', title: 'Complete background verification', priority: 'high', order: 5 },
    { category: 'it-setup', title: 'Create email account', priority: 'high', order: 6 },
    { category: 'it-setup', title: 'Setup laptop/workstation', priority: 'high', order: 7 },
    { category: 'it-setup', title: 'Configure VPN access', priority: 'medium', order: 8 },
    { category: 'access-provisioning', title: 'Create HRMS account', priority: 'high', order: 9 },
    { category: 'access-provisioning', title: 'Grant project tool access', priority: 'medium', order: 10 },
    { category: 'asset-assignment', title: 'Issue ID card', priority: 'high', order: 11 },
    { category: 'asset-assignment', title: 'Assign laptop', priority: 'high', order: 12 },
    { category: 'training', title: 'Complete HR orientation', priority: 'high', order: 13 },
    { category: 'training', title: 'Complete security training', priority: 'medium', order: 14 },
    { category: 'introduction', title: 'Team introduction', priority: 'medium', order: 15 },
    { category: 'introduction', title: 'Manager one-on-one', priority: 'medium', order: 16 }
];

const defaultOffboardingTasks = [
    { category: 'knowledge-transfer', title: 'Document ongoing work', priority: 'high', order: 1 },
    { category: 'knowledge-transfer', title: 'Transfer responsibilities', priority: 'high', order: 2 },
    { category: 'knowledge-transfer', title: 'Handover pending tasks', priority: 'high', order: 3 },
    { category: 'clearance', title: 'Manager clearance', priority: 'high', order: 4 },
    { category: 'clearance', title: 'HR clearance', priority: 'high', order: 5 },
    { category: 'clearance', title: 'Finance clearance', priority: 'high', order: 6 },
    { category: 'clearance', title: 'IT clearance', priority: 'high', order: 7 },
    { category: 'clearance', title: 'Admin clearance', priority: 'medium', order: 8 },
    { category: 'exit-formalities', title: 'Conduct exit interview', priority: 'medium', order: 9 },
    { category: 'exit-formalities', title: 'Return laptop', priority: 'high', order: 10 },
    { category: 'exit-formalities', title: 'Return ID card', priority: 'high', order: 11 },
    { category: 'exit-formalities', title: 'Return access card', priority: 'high', order: 12 },
    { category: 'exit-formalities', title: 'Revoke email access', priority: 'high', order: 13 },
    { category: 'exit-formalities', title: 'Revoke system access', priority: 'high', order: 14 },
    { category: 'exit-formalities', title: 'Calculate final settlement', priority: 'high', order: 15 },
    { category: 'exit-formalities', title: 'Generate relieving letter', priority: 'medium', order: 16 },
    { category: 'exit-formalities', title: 'Generate experience letter', priority: 'medium', order: 17 }
];

// Create onboarding/offboarding process
export const createOnboarding = async (req, res) => {
    try {
        const { employee, type, startDate } = req.body;

        // Check if employee exists
        const emp = await Employee.findById(employee);
        if (!emp) return res.status(404).json({ message: 'Employee not found' });

        // Check for existing active process
        const existing = await Onboarding.findOne({
            employee,
            type,
            status: { $in: ['not-started', 'in-progress'] }
        });
        if (existing) {
            return res.status(400).json({ message: `Active ${type} process already exists` });
        }

        // Create with default tasks
        const tasks = type === 'onboarding' ? defaultOnboardingTasks : defaultOffboardingTasks;

        const onboarding = new Onboarding({
            employee,
            type,
            startDate,
            tasks: tasks.map(t => ({ ...t, status: 'pending' })),
            status: 'in-progress',
            createdBy: req.user._id,
            ...(type === 'onboarding' ? { onboarding: { joiningDate: startDate } } : {}),
            ...(type === 'offboarding' ? { offboarding: { lastWorkingDate: req.body.lastWorkingDate, exitType: req.body.exitType } } : {})
        });

        await onboarding.save();

        // Audit log
        await AuditLog.log({
            action: type === 'onboarding' ? 'employee-onboarded' : 'employee-offboarded',
            entity: { type: 'Onboarding', id: onboarding._id, name: `${type} - ${emp.personalInfo?.firstName}` },
            performedBy: { userId: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
            module: 'employees',
            severity: 'info'
        });

        res.status(201).json(onboarding);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all onboarding/offboarding
export const getOnboardings = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const onboardings = await Onboarding.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName employmentInfo.department')
            .populate('createdBy', 'name email')
            .sort({ startDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Onboarding.countDocuments(query);
        res.json({ onboardings, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single onboarding
export const getOnboardingById = async (req, res) => {
    try {
        const onboarding = await Onboarding.findById(req.params.id)
            .populate('employee', 'employeeCode personalInfo contactInfo employmentInfo')
            .populate('tasks.assignedTo', 'name email')
            .populate('tasks.completedBy', 'name')
            .populate('onboarding.reportingManager', 'personalInfo.firstName personalInfo.lastName')
            .populate('onboarding.buddy', 'personalInfo.firstName personalInfo.lastName')
            .populate('offboarding.knowledgeTransfer.transferredTo', 'personalInfo.firstName personalInfo.lastName');

        if (!onboarding) return res.status(404).json({ message: 'Not found' });

        const tasksByCategory = onboarding.getTasksByCategory();
        res.json({ ...onboarding.toObject(), tasksByCategory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update task status
export const updateTask = async (req, res) => {
    try {
        const { taskId, status, comments } = req.body;
        const onboarding = await Onboarding.findById(req.params.id);
        if (!onboarding) return res.status(404).json({ message: 'Not found' });

        const task = onboarding.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = status;
        task.comments = comments;
        if (status === 'completed') {
            task.completedOn = new Date();
            task.completedBy = req.user._id;
        }

        await onboarding.save();
        res.json(onboarding);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update clearance (offboarding)
export const updateClearance = async (req, res) => {
    try {
        const { department, cleared, remarks } = req.body;
        const onboarding = await Onboarding.findById(req.params.id);
        if (!onboarding || onboarding.type !== 'offboarding') {
            return res.status(404).json({ message: 'Offboarding not found' });
        }

        if (!onboarding.offboarding.clearance) onboarding.offboarding.clearance = {};

        onboarding.offboarding.clearance[department] = {
            cleared,
            clearedOn: new Date(),
            clearedBy: req.user._id,
            remarks
        };

        // Update corresponding task
        const clearanceTask = onboarding.tasks.find(t =>
            t.title.toLowerCase().includes(department) && t.category === 'clearance'
        );
        if (clearanceTask) {
            clearanceTask.status = cleared ? 'completed' : 'pending';
            if (cleared) {
                clearanceTask.completedOn = new Date();
                clearanceTask.completedBy = req.user._id;
            }
        }

        await onboarding.save();
        res.json(onboarding);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Complete onboarding/offboarding
export const completeProcess = async (req, res) => {
    try {
        const onboarding = await Onboarding.findById(req.params.id);
        if (!onboarding) return res.status(404).json({ message: 'Not found' });

        // Check if all mandatory tasks are completed
        const pendingTasks = onboarding.tasks.filter(t =>
            t.priority === 'high' && t.status !== 'completed' && t.status !== 'skipped'
        );

        if (pendingTasks.length > 0) {
            return res.status(400).json({
                message: 'Cannot complete: Pending high-priority tasks',
                pendingTasks: pendingTasks.map(t => t.title)
            });
        }

        onboarding.status = 'completed';
        onboarding.actualCompletionDate = new Date();

        await onboarding.save();
        res.json(onboarding);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get dashboard stats
export const getStats = async (req, res) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [onboardingStats, offboardingStats] = await Promise.all([
            Onboarding.aggregate([
                { $match: { type: 'onboarding' } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Onboarding.aggregate([
                { $match: { type: 'offboarding' } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const upcomingJoiners = await Onboarding.countDocuments({
            type: 'onboarding',
            'onboarding.joiningDate': { $gte: now },
            status: 'in-progress'
        });

        const upcomingExits = await Onboarding.countDocuments({
            type: 'offboarding',
            'offboarding.lastWorkingDate': { $gte: now },
            status: 'in-progress'
        });

        res.json({
            onboarding: onboardingStats,
            offboarding: offboardingStats,
            upcomingJoiners,
            upcomingExits
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
