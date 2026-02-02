import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineCalendar,
    HiOutlineUser,
    HiOutlineDocumentText,
    HiOutlineDesktopComputer,
    HiOutlineKey,
    HiOutlineAcademicCap,
    HiOutlineUserGroup,
    HiOutlineCog,
    HiOutlineClipboardCheck,
    HiOutlineLogout
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const OnboardingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/onboarding/${id}`);
            setItem(res.data);
        } catch (error) {
            toast.error('Failed to fetch details');
        } finally {
            setLoading(false);
        }
    };

    const updateTaskStatus = async (taskId, status) => {
        try {
            await api.put(`/onboarding/${id}/task`, { taskId, status });
            toast.success('Task updated');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const updateClearance = async (department, cleared) => {
        try {
            await api.put(`/onboarding/${id}/clearance`, { department, cleared });
            toast.success(`${department} clearance ${cleared ? 'granted' : 'revoked'}`);
            fetchDetails();
        } catch (error) {
            toast.error('Failed to update clearance');
        }
    };

    const completeProcess = async () => {
        try {
            await api.put(`/onboarding/${id}/complete`);
            toast.success('Process completed');
            navigate('/onboarding');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cannot complete process');
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'documentation': HiOutlineDocumentText,
            'it-setup': HiOutlineDesktopComputer,
            'access-provisioning': HiOutlineKey,
            'training': HiOutlineAcademicCap,
            'introduction': HiOutlineUserGroup,
            'asset-assignment': HiOutlineCog,
            'compliance': HiOutlineClipboardCheck,
            'knowledge-transfer': HiOutlineDocumentText,
            'exit-formalities': HiOutlineLogout,
            'clearance': HiOutlineCheck
        };
        return icons[category] || HiOutlineDocumentText;
    };

    const getCategoryColor = (category) => {
        const colors = {
            'documentation': 'bg-blue-100 text-blue-600',
            'it-setup': 'bg-purple-100 text-purple-600',
            'access-provisioning': 'bg-green-100 text-green-600',
            'training': 'bg-yellow-100 text-yellow-600',
            'introduction': 'bg-pink-100 text-pink-600',
            'asset-assignment': 'bg-indigo-100 text-indigo-600',
            'clearance': 'bg-orange-100 text-orange-600',
            'exit-formalities': 'bg-red-100 text-red-600'
        };
        return colors[category] || 'bg-secondary-100 text-secondary-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="text-center py-12">
                <p className="text-secondary-500">Process not found</p>
            </div>
        );
    }

    const completedTasks = item.tasks?.filter(t => t.status === 'completed').length || 0;
    const totalTasks = item.tasks?.length || 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/onboarding')} className="p-2 hover:bg-secondary-100 rounded-lg">
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="page-title">
                            {item.employee?.personalInfo?.firstName} {item.employee?.personalInfo?.lastName}
                        </h1>
                        <p className="text-secondary-500 capitalize">{item.type} Process</p>
                    </div>
                </div>
                {item.status !== 'completed' && (
                    <button onClick={completeProcess} className="btn-primary">
                        <HiOutlineCheck className="w-5 h-5" />
                        Complete Process
                    </button>
                )}
            </div>

            {/* Progress Overview */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-secondary-900">Overall Progress</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-secondary-100 text-secondary-700'
                        }`}>
                        {item.status?.replace('-', ' ')}
                    </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-4 bg-secondary-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                            style={{ width: `${item.overallProgress}%` }}
                        />
                    </div>
                    <span className="text-2xl font-bold text-primary-600">{item.overallProgress}%</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-secondary-50 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-900">{completedTasks}</p>
                        <p className="text-sm text-secondary-500">Completed</p>
                    </div>
                    <div className="p-3 bg-secondary-50 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-900">{totalTasks - completedTasks}</p>
                        <p className="text-sm text-secondary-500">Pending</p>
                    </div>
                    <div className="p-3 bg-secondary-50 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-900 flex items-center justify-center gap-1">
                            <HiOutlineCalendar className="w-5 h-5" />
                            {new Date(item.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-secondary-500">Start Date</p>
                    </div>
                    <div className="p-3 bg-secondary-50 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-900">
                            {item.employee?.employeeCode || 'N/A'}
                        </p>
                        <p className="text-sm text-secondary-500">Employee ID</p>
                    </div>
                </div>
            </div>

            {/* Offboarding Clearances */}
            {item.type === 'offboarding' && (
                <div className="card p-6">
                    <h2 className="font-semibold text-secondary-900 mb-4">Department Clearances</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['manager', 'hr', 'finance', 'it', 'admin'].map(dept => {
                            const clearance = item.offboarding?.clearance?.[dept];
                            return (
                                <div key={dept} className={`p-4 rounded-xl text-center border-2 ${clearance?.cleared
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-secondary-200'
                                    }`}>
                                    <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${clearance?.cleared ? 'bg-green-500 text-white' : 'bg-secondary-200 text-secondary-500'
                                        }`}>
                                        {clearance?.cleared ? <HiOutlineCheck className="w-5 h-5" /> : <HiOutlineX className="w-5 h-5" />}
                                    </div>
                                    <p className="font-semibold capitalize text-secondary-900">{dept}</p>
                                    {clearance?.cleared ? (
                                        <p className="text-xs text-green-600 mt-1">Cleared</p>
                                    ) : (
                                        <button
                                            onClick={() => updateClearance(dept, true)}
                                            className="text-xs text-primary-600 hover:text-primary-700 mt-1"
                                        >
                                            Grant Clearance
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tasks by Category */}
            <div className="space-y-4">
                {Object.entries(item.tasksByCategory || {}).map(([category, tasks]) => {
                    const CategoryIcon = getCategoryIcon(category);
                    const completedInCategory = tasks.filter(t => t.status === 'completed').length;

                    return (
                        <div key={category} className="card overflow-hidden">
                            <div className={`p-4 flex items-center justify-between ${getCategoryColor(category)}`}>
                                <div className="flex items-center gap-3">
                                    <CategoryIcon className="w-6 h-6" />
                                    <h3 className="font-semibold capitalize">{category.replace('-', ' ')}</h3>
                                </div>
                                <span className="text-sm font-medium">
                                    {completedInCategory}/{tasks.length} completed
                                </span>
                            </div>
                            <div className="divide-y divide-secondary-100">
                                {tasks.sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => (
                                    <div key={task._id} className="p-4 flex items-center justify-between hover:bg-secondary-50">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateTaskStatus(task._id, task.status === 'completed' ? 'pending' : 'completed')}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-secondary-300 hover:border-primary-500'
                                                    }`}
                                            >
                                                {task.status === 'completed' && <HiOutlineCheck className="w-4 h-4" />}
                                            </button>
                                            <div>
                                                <p className={`font-medium ${task.status === 'completed' ? 'text-secondary-400 line-through' : 'text-secondary-900'}`}>
                                                    {task.title}
                                                </p>
                                                {task.completedOn && (
                                                    <p className="text-xs text-secondary-500">
                                                        Completed on {new Date(task.completedOn).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                task.priority === 'critical' ? 'bg-red-500 text-white' :
                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-secondary-100 text-secondary-700'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OnboardingDetails;
