import express from 'express';
import { protect } from '../middleware/auth.js';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark single notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Clear all notifications - MUST be before /:id route to avoid matching issues
router.delete('/clear-all', notificationController.clearAllNotifications);

// Delete single notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
