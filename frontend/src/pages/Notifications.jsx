import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineBell,
    HiOutlineCheck,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCalendar,
    HiOutlineCash,
    HiOutlineAcademicCap,
    HiOutlineDocumentText,
    HiOutlineSpeakerphone,
    HiOutlineRefresh
} from 'react-icons/hi';
import { useNotifications } from '../context/NotificationContext';

const Notifications = () => {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
    } = useNotifications();

    const [filter, setFilter] = useState('all'); // all, unread, read

    // Filter notifications
    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
    });

    // Get icon based on notification type
    const getNotificationIcon = (type) => {
        const iconClass = "w-6 h-6";
        switch (type) {
            case 'leave_approved':
                return <HiOutlineCheckCircle className={`${iconClass} text-success-500`} />;
            case 'leave_rejected':
                return <HiOutlineXCircle className={`${iconClass} text-danger-500`} />;
            case 'leave_request':
                return <HiOutlineDocumentText className={`${iconClass} text-primary-500`} />;
            case 'holiday_added':
                return <HiOutlineCalendar className={`${iconClass} text-warning-500`} />;
            case 'payroll_processed':
                return <HiOutlineCash className={`${iconClass} text-success-500`} />;
            case 'training_scheduled':
                return <HiOutlineAcademicCap className={`${iconClass} text-primary-500`} />;
            case 'announcement':
                return <HiOutlineSpeakerphone className={`${iconClass} text-info-500`} />;
            default:
                return <HiOutlineBell className={`${iconClass} text-secondary-500`} />;
        }
    };

    // Get type label
    const getTypeLabel = (type) => {
        const labels = {
            'leave_approved': 'Leave Approved',
            'leave_rejected': 'Leave Rejected',
            'leave_request': 'Leave Request',
            'holiday_added': 'Holiday',
            'payroll_processed': 'Payroll',
            'training_scheduled': 'Training',
            'announcement': 'Announcement',
            'general': 'General'
        };
        return labels[type] || 'Notification';
    };

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }
        if (notification.data?.actionUrl) {
            navigate(notification.data.actionUrl);
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">Notifications</h1>
                        <p className="text-secondary-500 mt-1">
                            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchNotifications(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors ${loading ? 'opacity-50' : ''}`}
                            disabled={loading}
                        >
                            <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            >
                                <HiOutlineCheck className="w-4 h-4" />
                                Mark all as read
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                                Clear all
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'all', label: 'All', count: notifications.length },
                    { key: 'unread', label: 'Unread', count: unreadCount },
                    { key: 'read', label: 'Read', count: notifications.length - unreadCount }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === tab.key
                                ? 'bg-primary-500 text-white'
                                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                            }`}
                    >
                        {tab.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === tab.key
                                ? 'bg-white/20 text-white'
                                : 'bg-secondary-200 text-secondary-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                {loading && notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-secondary-500 mt-4">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <HiOutlineBell className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-secondary-700">No notifications</h3>
                        <p className="text-secondary-500 mt-1">
                            {filter === 'all'
                                ? "You don't have any notifications yet"
                                : filter === 'unread'
                                    ? "No unread notifications"
                                    : "No read notifications"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-100">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`group p-4 hover:bg-secondary-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-primary-50/30' : ''
                                    }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.isRead ? 'bg-primary-100' : 'bg-secondary-100'
                                            }`}>
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-sm ${!notification.isRead ? 'font-semibold text-secondary-900' : 'font-medium text-secondary-700'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${!notification.isRead
                                                            ? 'bg-primary-100 text-primary-700'
                                                            : 'bg-secondary-100 text-secondary-500'
                                                        }`}>
                                                        {getTypeLabel(notification.type)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-secondary-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-secondary-400 mt-2">
                                                    {notification.timeAgo || formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification._id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-secondary-200 transition-all"
                                                        title="Mark as read"
                                                    >
                                                        <HiOutlineCheck className="w-4 h-4 text-secondary-500" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification._id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-danger-100 transition-all"
                                                    title="Delete"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4 text-secondary-400 hover:text-danger-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
