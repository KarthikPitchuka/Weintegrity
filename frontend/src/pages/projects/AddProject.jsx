import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineBriefcase,
    HiOutlineCalendar,
    HiOutlineUserGroup,
    HiOutlineFlag,
    HiOutlineCheckCircle
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AddProject = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        client: '',
        startDate: '',
        endDate: '',
        status: 'planned',
        priority: 'medium',
        teamLeader: '',
        teamMembers: []
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setFetchingEmployees(true);
                const response = await api.get('/employees');
                // Extract useful info from employee records
                const emps = response.data.employees.map(emp => ({
                    id: emp._id,
                    name: `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}`,
                    code: emp.employeeCode
                }));
                setEmployees(emps);
            } catch (error) {
                toast.error('Failed to fetch employees');
                console.error(error);
            } finally {
                setFetchingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // If changing team leader, ensure they aren't also in team members
            if (name === 'teamLeader' && value) {
                newData.teamMembers = prev.teamMembers.filter(id => id !== value);
            }
            return newData;
        });
    };

    const handleTeamMemberChange = (empId) => {
        setFormData(prev => {
            const members = prev.teamMembers.includes(empId)
                ? prev.teamMembers.filter(id => id !== empId)
                : [...prev.teamMembers, empId];
            return { ...prev, teamMembers: members };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.startDate || !formData.teamLeader) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            await api.post('/projects', formData);
            toast.success('Project created and assigned successfully!');
            navigate('/projects');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/projects" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                    <HiOutlineArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
                    <p className="text-slate-500">Assign a new project and select the team leadership</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="card p-8 bg-white shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 text-primary-600">
                        <HiOutlineBriefcase className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Project Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="label">Project Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Q1 Financial Audit"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="label">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="input min-h-[100px]"
                                placeholder="Describe the project goals and scope..."
                            />
                        </div>

                        <div>
                            <label className="label">Client Name</label>
                            <input
                                type="text"
                                name="client"
                                value={formData.client}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Acme Corp"
                            />
                        </div>

                        <div>
                            <label className="label">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="input appearance-none"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="card p-8 bg-white shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 text-primary-600">
                        <HiOutlineCalendar className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Timeline</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Start Date *</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">End Date (Optional)</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Team Leadership */}
                <div className="card p-8 bg-white shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 text-primary-600">
                        <HiOutlineUserGroup className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Team Assignment</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="label">Team Leader *</label>
                            <select
                                name="teamLeader"
                                value={formData.teamLeader}
                                onChange={handleChange}
                                className="input appearance-none"
                                required
                            >
                                <option value="">Select Team Leader</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.code})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-slate-500 italic">
                                * The Team Leader will be responsible for submitting periodic project responses and updates.
                            </p>
                        </div>

                        <div>
                            <label className="label mb-3">Team Members (Optional)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-100 custom-scrollbar">
                                {fetchingEmployees ? (
                                    <p className="text-sm text-slate-500 italic">Loading employees...</p>
                                ) : (
                                    employees
                                        .filter(emp => emp.id !== formData.teamLeader)
                                        .map(emp => (
                                            <label
                                                key={emp.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.teamMembers.includes(emp.id)
                                                    ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-primary-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.teamMembers.includes(emp.id)}
                                                    onChange={() => handleTeamMemberChange(emp.id)}
                                                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold truncate">{emp.name}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">{emp.code}</span>
                                                </div>
                                            </label>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 py-4">
                    <button
                        type="button"
                        onClick={() => navigate('/projects')}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary shadow-lg shadow-primary-500/25 px-8"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Creating...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <HiOutlineCheckCircle className="w-5 h-5" />
                                Create Project
                            </div>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProject;
