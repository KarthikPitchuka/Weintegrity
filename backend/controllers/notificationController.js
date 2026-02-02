import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Get Socket.IO instance (will be set from server.js)
let io = null;
export const setSocketIO = (socketIO) => {
    io = socketIO;
};

// Emit notification to specific user
export const emitNotification = (userId, notification) => {
    if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
    }
};

// Emit notification to all users
export const emitToAll = (notification) => {
    if (io) {
        io.emit('notification', notification);
    }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const query = { recipient: req.user._id };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName');

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({
            notifications,
            unreadCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count', error: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification as read', error: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notifications as read', error: error.message });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notification', error: error.message });
    }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
export const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing notifications', error: error.message });
    }
};

// Helper: Create and emit notification
export const createNotification = async ({
    recipientId,
    type,
    title,
    message,
    data = {},
    createdById = null
}) => {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            data,
            createdBy: createdById
        });

        const populatedNotification = await Notification.findById(notification._id)
            .populate('createdBy', 'firstName lastName');

        // Emit real-time notification
        emitNotification(recipientId.toString(), populatedNotification);

        return populatedNotification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// Helper: Create notification for multiple users
export const createBulkNotifications = async ({
    recipientIds,
    type,
    title,
    message,
    data = {},
    createdById = null
}) => {
    try {
        const notifications = await Promise.all(
            recipientIds.map(recipientId =>
                createNotification({
                    recipientId,
                    type,
                    title,
                    message,
                    data,
                    createdById
                })
            )
        );
        return notifications.filter(n => n !== null);
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return [];
    }
};

// Helper: Notify all employees
export const notifyAllEmployees = async ({
    type,
    title,
    message,
    data = {},
    createdById = null
}) => {
    try {
        const users = await User.find({ isActive: true }).select('_id');
        const recipientIds = users.map(u => u._id);
        return await createBulkNotifications({
            recipientIds,
            type,
            title,
            message,
            data,
            createdById
        });
    } catch (error) {
        console.error('Error notifying all employees:', error);
        return [];
    }
};

export default {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    setSocketIO,
    createNotification,
    createBulkNotifications,
    notifyAllEmployees
};
