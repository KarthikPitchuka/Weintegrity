import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const NotificationContext = createContext(null);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    // Initialize Socket.IO connection
    const initializeSocket = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Disconnect existing socket if any
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current.on('connect', () => {
            console.log('🔌 Connected to notification server');
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('🔌 Disconnected from notification server');
            setConnected(false);
        });

        socketRef.current.on('notification', (notification) => {
            console.log('📩 New notification received:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }
        });

        socketRef.current.on('notification_read', (notificationId) => {
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnected(false);
        });
    }, []);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const response = await api.get('/notifications?limit=20');
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    // Mark single notification as read
    const markAsRead = useCallback(async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            const notification = notifications.find(n => n._id === notificationId);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, [notifications]);

    // Clear all notifications
    const clearAll = useCallback(async () => {
        try {
            await api.delete('/notifications/clear-all');
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    }, []);

    // Request browser notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            initializeSocket();
            fetchNotifications();
            requestNotificationPermission();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [initializeSocket, fetchNotifications, requestNotificationPermission]);

    // Reconnect when token changes
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'token') {
                if (e.newValue) {
                    initializeSocket();
                    fetchNotifications();
                } else {
                    if (socketRef.current) {
                        socketRef.current.disconnect();
                    }
                    setNotifications([]);
                    setUnreadCount(0);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [initializeSocket, fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        loading,
        connected,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        reconnect: initializeSocket
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
