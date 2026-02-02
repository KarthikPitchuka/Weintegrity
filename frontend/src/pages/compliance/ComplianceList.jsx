import { useState, useEffect } from 'react';
import { HiOutlineClipboardCheck, HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineClock, HiOutlinePlus, HiOutlineX, HiOutlineEye } from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ComplianceList = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        complianceScore: 0,
        pendingTasks: 0,
        upcomingAudits: 0
    });
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Check if user has HR privileges
    const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(user?.role);

    useEffect(() => {
        if (user) {
            fetchComplianceData();
            if (isHR) {
                fetchEmployees();
            }
        }
    }, [user]);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchComplianceData = async () => {
        setLoading(true);
        try {
            let score = 0;
            let pendingTasksCount = 0;
            let upcomingAuditsCount = 0;

            // Only fetch dashboard stats if HR
            if (isHR) {
                const dashboardRes = await api.get('/compliance/dashboard');
                const dashboardData = dashboardRes.data;

                const total = dashboardData.totalItems || 1;
                const compliantCount = dashboardData.byStatus?.find(s => s._id === 'compliant')?.count || 0;
                score = Math.round((compliantCount / total) * 100);
                pendingTasksCount = dashboardData.nonCompliantItems?.length || 0;
                upcomingAuditsCount = dashboardData.upcomingRenewals?.length || 0;
            }

            // Fetch compliance items for list
            const itemsRes = await api.get('/compliance');
            const items = itemsRes.data.items || [];

            // Transform items to tasks format
            const complianceTasks = items.map(item => ({
                id: item._id,
                title: item.title,
                deadline: item.renewalDate || item.effectiveDate,
                priority: item.riskLevel === 'high' ? 'high' : item.riskLevel === 'medium' ? 'medium' : 'low',
                status: item.overallStatus === 'compliant' ? 'completed' : 'pending',
                category: item.category,
                responsiblePerson: item.responsiblePerson,
                requirements: item.requirements || []
            }));

            setStats({
                complianceScore: score,
                pendingTasks: pendingTasksCount,
                upcomingAudits: upcomingAuditsCount
            });
            setTasks(complianceTasks);

        } catch (error) {
            console.error('Error fetching compliance data:', error);
            // toast.error('Failed to fetch compliance data');
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        type: 'policy',
        category: 'hr',
        effectiveDate: new Date().toISOString().split('T')[0],
        riskLevel: 'medium',
        description: '',
        responsiblePerson: ''
    });

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await api.post('/compliance', newItem);
            toast.success('Compliance item added successfully');
            setShowAddModal(false);
            setNewItem({
                title: '',
                type: 'policy',
                category: 'hr',
                effectiveDate: new Date().toISOString().split('T')[0],
                riskLevel: 'medium',
                description: '',
                responsiblePerson: ''
            });
            fetchComplianceData();
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error('Failed to add compliance item');
        }
    };

    const handleMarkAsCompliant = async (taskId) => {
        try {
            await api.put(`/compliance/${taskId}`, { overallStatus: 'compliant' });
            toast.success('Task marked as compliant');
            setShowDetailModal(false);
            setSelectedItem(null);
            fetchComplianceData();
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        }
    };

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [updateForm, setUpdateForm] = useState({
        status: '',
        evidence: '',
        notes: ''
    });
    const [selectedReqIndex, setSelectedReqIndex] = useState(null);

    const handleViewDetails = (task) => {
        setSelectedItem(task);
        setShowDetailModal(true);
        setSelectedReqIndex(null); // Reset selection
    };

    const handleUpdateRequirement = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/compliance/${selectedItem.id}/requirements/${selectedReqIndex}`, {
                status: updateForm.status,
                completedDate: updateForm.status === 'completed' ? new Date() : null,
                evidence: updateForm.evidence ? [updateForm.evidence] : [],
                notes: updateForm.notes
            });
            toast.success('Requirement updated');

            // Refresh local state or refetch all
            fetchComplianceData();
            setShowDetailModal(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update requirement');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Compliance</h1>
                    <p className="text-secondary-500 mt-1">Manage compliance tasks and regulatory requirements</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchComplianceData} className="btn-secondary btn-sm">Refresh</button>
                    {isHR && (
                        <button onClick={() => setShowAddModal(true)} className="btn-primary">
                            <HiOutlinePlus className="w-5 h-5 mr-1" />
                            Add Compliance
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {/* Stats Cards - Only visible to HR */}
                    {isHR && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <HiOutlineCheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Compliance Score</p>
                                        <h3 className="text-2xl font-bold text-green-900">{stats.complianceScore}%</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="card p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <HiOutlineExclamation className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-orange-800">Non-Compliant Items</p>
                                        <h3 className="text-2xl font-bold text-orange-900">{stats.pendingTasks}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <HiOutlineClipboardCheck className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-800">Upcoming Renewals</p>
                                        <h3 className="text-2xl font-bold text-blue-900">{stats.upcomingAudits}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tasks List */}
                    <div className="card">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="font-bold text-lg text-gray-900">Compliance Items</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {tasks.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No compliance items found.
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                                            <div>
                                                <h3 className={`font-medium ${task.status === 'completed' ? 'text-gray-900' : 'text-gray-900'}`}>{task.title}</h3>
                                                <p className="text-sm text-secondary-500 flex items-center gap-1 mt-1">
                                                    <HiOutlineClock className="w-4 h-4" />
                                                    Due {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-xs">{task.category}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {task.responsiblePerson && (
                                                <div className="text-sm text-secondary-500 text-right">
                                                    <span className="text-xs block text-secondary-400">Assigned to</span>
                                                    <span className="font-medium text-secondary-700">
                                                        {task.responsiblePerson.firstName} {task.responsiblePerson.lastName}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                {task.status === 'completed' ? (
                                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Compliant</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">Pending</span>
                                                        {/* Show update button if assigned to current user */}
                                                        {task.responsiblePerson && task.responsiblePerson._id === user._id && (
                                                            <button
                                                                onClick={() => handleViewDetails(task)}
                                                                className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition theme-transition"
                                                            >
                                                                <HiOutlineEye className="w-3 h-3" />
                                                                Update
                                                            </button>
                                                        )}
                                                        {/* Fallback View Details for others */}
                                                        {(!task.responsiblePerson || task.responsiblePerson._id !== user._id) && (
                                                            <button
                                                                onClick={() => handleViewDetails(task)}
                                                                className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-50 text-secondary-600 text-xs font-semibold hover:bg-secondary-100 transition theme-transition"
                                                            >
                                                                View
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* View/Update Detail Modal */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-semibold text-secondary-900">{selectedItem.title}</h3>
                                <p className="text-xs text-secondary-500 uppercase tracking-wide">{selectedItem.category} • {selectedItem.priority} priority</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Requirement List */}
                            <div>
                                <h4 className="font-semibold text-secondary-900 mb-3">Requirements</h4>
                                {selectedItem.requirements && selectedItem.requirements.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedItem.requirements.map((req, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border ${req.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-secondary-200'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-secondary-900">{req.title || `Requirement #${idx + 1}`}</p>
                                                        <p className="text-sm text-secondary-600 mt-1">{req.description}</p>
                                                        {req.notes && <p className="text-xs text-secondary-500 mt-2 bg-secondary-50 p-2 rounded">Note: {req.notes}</p>}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            req.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-secondary-100 text-secondary-600'
                                                            }`}>
                                                            {req.status}
                                                        </span>
                                                        {/* Update Button */}
                                                        {selectedItem.responsiblePerson && selectedItem.responsiblePerson._id === user._id && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReqIndex(idx);
                                                                    setUpdateForm({
                                                                        status: req.status || 'pending',
                                                                        evidence: req.evidence?.[0] || '',
                                                                        notes: req.notes || ''
                                                                    });
                                                                }}
                                                                className="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
                                                            >
                                                                Update Status
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 space-y-4">
                                        <p className="text-sm text-secondary-500 italic">No specific requirements listed.</p>
                                        {selectedItem.responsiblePerson && selectedItem.responsiblePerson._id === user._id && selectedItem.status !== 'completed' && (
                                            <button
                                                onClick={() => handleMarkAsCompliant(selectedItem.id)}
                                                className="btn-primary"
                                            >
                                                Mark as Finished
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Update Form Section (Only visible when a requirement is selected for update) */}
                            {selectedReqIndex !== null && (
                                <div className="mt-6 p-5 bg-secondary-50 rounded-xl border border-secondary-200 animate-fadeIn">
                                    <h4 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs">
                                            {selectedReqIndex + 1}
                                        </span>
                                        Update Requirement
                                    </h4>
                                    <form onSubmit={handleUpdateRequirement} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Status</label>
                                                <select
                                                    value={updateForm.status}
                                                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                                    className="input"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in-progress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Evidence (URL/Link)</label>
                                                <input
                                                    type="text"
                                                    value={updateForm.evidence}
                                                    onChange={(e) => setUpdateForm({ ...updateForm, evidence: e.target.value })}
                                                    className="input"
                                                    placeholder="https://drive.google.com/..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Notes / Comments</label>
                                            <textarea
                                                value={updateForm.notes}
                                                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                                                className="input min-h-[80px]"
                                                placeholder="Added details regarding completion..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button type="button" onClick={() => setSelectedReqIndex(null)} className="btn-secondary btn-sm">Cancel</button>
                                            <button type="submit" className="btn-primary btn-sm">Save Update</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Compliance Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                            <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-secondary-900">Add Compliance Item</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                    <HiOutlineX className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddItem} className="p-6 space-y-4">
                                <div>
                                    <label className="label">Title *</label>
                                    <input
                                        type="text"
                                        value={newItem.title}
                                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                        className="input"
                                        required
                                        placeholder="e.g., Annual Data Privacy Audit"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Type</label>
                                        <select
                                            value={newItem.type}
                                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                            className="input"
                                        >
                                            <option value="policy">Policy</option>
                                            <option value="regulation">Regulation</option>
                                            <option value="audit">Audit</option>
                                            <option value="certification">Certification</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Category</label>
                                        <select
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                            className="input"
                                        >
                                            <option value="hr">HR</option>
                                            <option value="legal">Legal</option>
                                            <option value="safety">Safety</option>
                                            <option value="financial">Financial</option>
                                            <option value="data-privacy">Data Privacy</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Effective Date *</label>
                                        <input
                                            type="date"
                                            value={newItem.effectiveDate}
                                            onChange={(e) => setNewItem({ ...newItem, effectiveDate: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Risk Level</label>
                                        <select
                                            value={newItem.riskLevel}
                                            onChange={(e) => setNewItem({ ...newItem, riskLevel: e.target.value })}
                                            className="input"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Assign To</label>
                                    <select
                                        value={newItem.responsiblePerson}
                                        onChange={(e) => setNewItem({ ...newItem, responsiblePerson: e.target.value })}
                                        className="input"
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => {
                                            const name = emp.personalInfo ? `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}` : (emp.firstName || 'Unknown');
                                            const dept = emp.employmentInfo ? emp.employmentInfo.department : (emp.department || 'N/A');
                                            // The value should be the User ID if available, as notifications are sent to Users.
                                            // If userId (ref) is populated or present, use it.
                                            // Backend Employee model has userId field.
                                            // getEmployees populates nothing by default in controller, but let's check what `emp.user` logic was trying to do.
                                            // emp.userId is the field in schema.
                                            const userIdValue = (typeof emp.userId === 'object' ? emp.userId?._id : emp.userId) || emp._id;

                                            return (
                                                <option key={emp._id} value={userIdValue}>
                                                    {name} ({dept})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="input min-h-[80px]"
                                        placeholder="Brief description of requirements..."
                                    />
                                </div>
                                <div className="pt-4 flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Add Item
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ComplianceList;
