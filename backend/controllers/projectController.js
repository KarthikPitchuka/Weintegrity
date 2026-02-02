import Project from '../models/Project.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import ProjectUpdate from '../models/ProjectUpdate.js';
import { createNotification } from './notificationController.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;

        // If not HR/Admin, only show projects where user is TL or Member
        if (!['admin', 'HRManager', 'HRExecutive'].includes(req.user.role)) {
            const employeeId = req.user.employeeId || req.user._id;
            query.$or = [
                { teamLeader: employeeId },
                { teamMembers: employeeId }
            ];
        }

        const projects = await Project.find(query)
            .populate('teamLeader', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('teamMembers', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('assignedBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .lean();

        // Safeguard: Ensure TL is not in Members for each project
        const processedProjects = projects.map(p => ({
            ...p,
            teamMembers: p.teamMembers.filter(m => m._id.toString() !== p.teamLeader?._id.toString())
        }));

        const total = await Project.countDocuments(query);

        res.json({
            projects: processedProjects,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('teamLeader', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('teamMembers', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('assignedBy', 'firstName lastName')
            .lean();

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Safeguard: Ensure TL is not in Members
        project.teamMembers = project.teamMembers.filter(
            m => m._id.toString() !== project.teamLeader?._id.toString()
        );

        // Check permission: HR/Admin OR TL/Member
        const isHR = ['admin', 'HRManager', 'HRExecutive'].includes(req.user.role);
        const employeeId = req.user.employeeId || req.user._id;
        const isTL = project.teamLeader._id.toString() === employeeId.toString();
        const isMember = project.teamMembers.some(member => member._id.toString() === employeeId.toString());

        if (!isHR && !isTL && !isMember) {
            return res.status(403).json({ message: 'Not authorized to view this project' });
        }

        res.json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching project', error: error.message });
    }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private (HR/Admin)
export const createProject = async (req, res) => {
    try {
        const projectData = {
            ...req.body,
            assignedBy: req.user._id
        };

        // Ensure Team Leader is not in Team Members
        if (projectData.teamLeader && projectData.teamMembers) {
            projectData.teamMembers = projectData.teamMembers.filter(
                id => id.toString() !== projectData.teamLeader.toString()
            );
        }

        const project = await Project.create(projectData);
        await project.populate('teamLeader', 'personalInfo.firstName personalInfo.lastName');

        // Notify Team Leader
        const tlUser = await User.findOne({ employeeId: project.teamLeader });
        if (tlUser) {
            await createNotification({
                recipientId: tlUser._id,
                type: 'project_assigned',
                title: '📂 New Project Assigned',
                message: `You have been assigned as the Team Leader for the project: ${project.name}`,
                data: {
                    referenceId: project._id,
                    referenceModel: 'Project',
                    actionUrl: `/projects/${project._id}`
                },
                createdById: req.user._id
            });
        }

        // Notify Team Members
        for (const memberId of project.teamMembers) {
            const memberUser = await User.findOne({ employeeId: memberId });
            if (memberUser) {
                await createNotification({
                    recipientId: memberUser._id,
                    type: 'project_assigned',
                    title: '📂 New Project Participation',
                    message: `You have been added as a team member for the project: ${project.name}`,
                    data: {
                        referenceId: project._id,
                        referenceModel: 'Project',
                        actionUrl: `/projects/${project._id}`
                    },
                    createdById: req.user._id
                });
            }
        }

        res.status(201).json({ message: 'Project created successfully', project });
    } catch (error) {
        res.status(500).json({ message: 'Error creating project', error: error.message });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (HR/Admin)
export const updateProject = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Ensure Team Leader is not in Team Members if both/either are provided
        if (updateData.teamLeader || updateData.teamMembers) {
            const project = await Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            const tl = updateData.teamLeader || project.teamLeader;
            const members = updateData.teamMembers || project.teamMembers;

            if (tl && members) {
                updateData.teamMembers = members.filter(
                    id => id.toString() !== tl.toString()
                );
            }
        }

        const project = await Project.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project updated successfully', project });
    } catch (error) {
        res.status(500).json({ message: 'Error updating project', error: error.message });
    }
};

// @desc    Submit project update (Any Team Member or Leader)
// @route   POST /api/projects/:id/updates
// @access  Private
export const submitProjectUpdate = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const employeeId = req.user.employeeId || req.user._id;
        const isTL = project.teamLeader.toString() === employeeId.toString();
        const isMember = project.teamMembers.some(id => id.toString() === employeeId.toString());

        if (!isTL && !isMember) {
            return res.status(403).json({ message: 'Only team members can submit updates' });
        }

        const updateType = isTL ? 'leader_update' : 'member_update';

        const update = await ProjectUpdate.create({
            project: project._id,
            user: req.user._id,
            employee: employeeId,
            content: req.body.content,
            type: updateType
        });

        // Automatically change project status to 'in-progress' if it was 'planned'
        if (project.status === 'planned') {
            project.status = 'in-progress';
            await project.save();
        }

        // Notify recipient
        if (!isTL) {
            // Member -> TL
            const tlUser = await User.findOne({ employeeId: project.teamLeader });
            if (tlUser) {
                await createNotification({
                    recipientId: tlUser._id,
                    type: 'project_update',
                    title: '📝 Member Update Received',
                    message: `${req.user.firstName} submitted an update for ${project.name}`,
                    data: { referenceId: project._id, referenceModel: 'Project', actionUrl: `/projects/${project._id}` },
                    createdById: req.user._id
                });
            }
        } else {
            // TL -> HR
            await createNotification({
                recipientId: project.assignedBy,
                type: 'project_response',
                title: '📈 Project Progress Update',
                message: `Team Leader ${req.user.firstName} submitted a progress update for ${project.name}`,
                data: { referenceId: project._id, referenceModel: 'Project', actionUrl: `/projects/${project._id}` },
                createdById: req.user._id
            });

            // Also update the main project response field for quick view
            project.response = {
                content: req.body.content,
                submittedAt: new Date()
            };
            await project.save();
        }

        res.status(201).json({ message: 'Update submitted successfully', update });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting update', error: error.message });
    }
};

// @desc    Get project updates
// @route   GET /api/projects/:id/updates
// @access  Private
export const getProjectUpdates = async (req, res) => {
    try {
        const updates = await ProjectUpdate.find({ project: req.params.id })
            .populate('employee', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .sort({ createdAt: -1 });

        res.json({ updates });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching updates', error: error.message });
    }
};

// @desc    Submit project response (Team Leader only - Official/Final)
// @route   POST /api/projects/:id/response
// @access  Private
export const submitResponse = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Verify if user is the Team Leader
        const employeeId = req.user.employeeId || req.user._id;
        if (project.teamLeader.toString() !== employeeId.toString()) {
            return res.status(403).json({ message: 'Only the Team Leader can submit a project response' });
        }

        project.response = {
            content: req.body.content,
            submittedAt: new Date()
        };

        await project.save();

        // Also track as a leader update
        await ProjectUpdate.create({
            project: project._id,
            user: req.user._id,
            employee: employeeId,
            content: req.body.content,
            type: 'leader_update'
        });

        // Notify Assigner (HR/Admin)
        await createNotification({
            recipientId: project.assignedBy,
            type: 'project_response',
            title: '📝 Project Update Received',
            message: `Team Leader has submitted an update for the project: ${project.name}`,
            data: {
                referenceId: project._id,
                referenceModel: 'Project',
                actionUrl: `/projects/${project._id}`
            },
            createdById: req.user._id
        });

        res.json({ message: 'Response submitted successfully', project });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting response', error: error.message });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (HR/Admin)
export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
};

// @desc    Review project update (Team Leader only)
// @route   PATCH /api/projects/:id/updates/:updateId/review
// @access  Private
export const reviewProjectUpdate = async (req, res) => {
    try {
        const { id, updateId } = req.params;
        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Verify if user is the Team Leader
        const employeeId = req.user.employeeId || req.user._id;
        if (project.teamLeader.toString() !== employeeId.toString()) {
            return res.status(403).json({ message: 'Only the Team Leader can review member updates' });
        }

        const update = await ProjectUpdate.findById(updateId);
        if (!update) return res.status(404).json({ message: 'Update not found' });

        if (update.project.toString() !== id) {
            return res.status(400).json({ message: 'Update does not belong to this project' });
        }

        update.status = 'reviewed';
        await update.save();

        res.json({ message: 'Update marked as reviewed', update });
    } catch (error) {
        res.status(500).json({ message: 'Error reviewing update', error: error.message });
    }
};

export default {
    getProjects,
    getProject,
    createProject,
    updateProject,
    submitResponse,
    submitProjectUpdate,
    getProjectUpdates,
    reviewProjectUpdate,
    deleteProject
};
