import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineBriefcase,
    HiOutlineCalendar,
    HiOutlineUserGroup,
    HiOutlineFlag,
    HiOutlineChatAlt2,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineMail,
    HiOutlineIdentification,
    HiOutlineClock,
    HiOutlineChevronRight,
    HiOutlinePaperAirplane,
    HiOutlineSave,
    HiOutlineExclamationCircle,
    HiOutlineShieldCheck
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ProjectDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingUpdates, setFetchingUpdates] = useState(true);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [updateContent, setUpdateContent] = useState('');
    const [localProgress, setLocalProgress] = useState(0);
    const [showRiskForm, setShowRiskForm] = useState(false);
    const [riskFormData, setRiskFormData] = useState({ title: '', description: '', severity: 'low' });
    const [submittingRisk, setSubmittingRisk] = useState(false);

    const isHR = ['admin', 'HRManager', 'HRExecutive'].includes(user?.role);

    // Get the correct employee ID from the user object (handle both populated object or ID string)
    const currentEmployeeId = (typeof user?.employeeId === 'object' ? user?.employeeId?._id : user?.employeeId) || user?._id;

    const isTeamLeader = project?.teamLeader?._id?.toString() === currentEmployeeId?.toString();
    const isTeamMember = project?.teamMembers?.some(m => m._id?.toString() === currentEmployeeId?.toString());
    const canSubmitUpdate = isTeamLeader || isTeamMember || isHR;

    useEffect(() => {
        fetchProject();
        fetchUpdates();
    }, [id]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projects/${id}`);
            const fetchedProject = response.data.project;
            setProject(fetchedProject);
            setLocalProgress(fetchedProject.progress || 0);
        } catch (error) {
            toast.error('Failed to fetch project details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUpdates = async () => {
        try {
            setFetchingUpdates(true);
            const response = await api.get(`/projects/${id}/updates`);
            setUpdates(response.data.updates);
        } catch (error) {
            console.error('Failed to fetch updates:', error);
        } finally {
            setFetchingUpdates(false);
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!updateContent.trim()) {
            toast.error('Please enter the update content');
            return;
        }

        try {
            setSubmittingUpdate(true);
            await api.post(`/projects/${id}/updates`, { content: updateContent });
            toast.success('Update submitted successfully!');
            setUpdateContent('');
            fetchUpdates();
            // Refresh project to get updated official response if TL submitted
            if (isTeamLeader) fetchProject();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit update');
        } finally {
            setSubmittingUpdate(false);
        }
    };

    const handleReviewUpdate = async (updateId) => {
        try {
            await api.patch(`/projects/${id}/updates/${updateId}/review`);
            toast.success('Update marked as reviewed');
            fetchUpdates();
        } catch (error) {
            toast.error('Failed to review update');
        }
    };

    const handleToggleMilestone = async (milestoneId) => {
        try {
            const response = await api.patch(`/projects/${id}/milestones/${milestoneId}/toggle`);
            const updatedProject = response.data.project;
            setProject(updatedProject);
            setLocalProgress(updatedProject.progress || 0);

            const milestone = updatedProject.milestones.find(m => m._id === milestoneId);
            if (milestone.status === 'in-review') {
                toast.success('Submitted for review');
            } else if (milestone.status === 'completed') {
                toast.success('Milestone approved & completed');
            } else {
                toast.success('Milestone status updated');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update milestone');
        }
    };

    const handleProgressUpdate = async (newProgress) => {
        try {
            const response = await api.patch(`/projects/${id}/progress`, { progress: newProgress });
            const updatedProject = response.data.project;
            setProject(updatedProject);
            setLocalProgress(updatedProject.progress || 0);
            toast.success('Progress updated');
        } catch (error) {
            toast.error('Failed to update progress');
            // Revert local progress on failure
            setLocalProgress(project.progress || 0);
        }
    };

    const handleAddRisk = async (e) => {
        e.preventDefault();
        try {
            setSubmittingRisk(true);
            const response = await api.post(`/projects/${id}/risks`, riskFormData);
            setProject(response.data.project);
            setShowRiskForm(false);
            setRiskFormData({ title: '', description: '', severity: 'low' });
            toast.success('Risk reported successfully');
        } catch (error) {
            toast.error('Failed to report risk');
        } finally {
            setSubmittingRisk(false);
        }
    };

    const handleResolveRisk = async (riskId) => {
        try {
            const response = await api.patch(`/projects/${id}/risks/${riskId}/resolve`);
            setProject(response.data.project);
            toast.success('Risk marked as resolved');
        } catch (error) {
            toast.error('Failed to resolve risk');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;

        try {
            await api.delete(`/projects/${id}`);
            toast.success('Project deleted successfully');
            navigate('/projects');
        } catch (error) {
            toast.error('Failed to delete project');
        }
    };

    const calculateDaysLeft = (endDate) => {
        if (!endDate) return null;
        const diffTime = new Date(endDate) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const daysLeft = project ? calculateDaysLeft(project.endDate) : null;

    const getRiskColor = (status) => {
        switch (status) {
            case 'on-track': return 'bg-emerald-500';
            case 'at-risk': return 'bg-amber-500';
            case 'delayed': return 'bg-rose-500';
            default: return 'bg-slate-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="card p-12 text-center bg-white/50 border-dashed border-2 border-slate-200 shadow-none">
                <h3 className="text-xl font-bold text-slate-800">Project Not Found</h3>
                <Link to="/projects" className="btn-primary mt-6 inline-flex">Back to Projects</Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/projects" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                        <HiOutlineArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase">
                                {project.category || 'General'}
                            </span>
                        </div>
                        <p className="text-slate-500">Project Overview & History</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Overall Progress</span>
                        <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-1000"
                                style={{ width: `${localProgress || 0}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 mt-1">{localProgress || 0}%</span>
                    </div>
                    {isHR && (
                        <button onClick={handleDelete} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="Delete Project">
                            <HiOutlineTrash className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Overview Card */}
                    <div className="card p-8 bg-white shadow-sm border border-slate-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        <div className="relative">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 items-center flex gap-2">
                                <HiOutlineBriefcase className="w-5 h-5 text-primary-600" />
                                Project Overview
                            </h3>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {project.description || 'No description provided for this project.'}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Status</p>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${project.status === 'completed' ? 'badge-success' :
                                        project.status === 'in-progress' ? 'badge-warning' :
                                            'badge-info'
                                        }`}>
                                        {project.status.replace('-', ' ')}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Priority</p>
                                    <span className={`font-bold capitalize text-sm ${project.priority === 'high' ? 'text-rose-600' :
                                        project.priority === 'medium' ? 'text-amber-600' :
                                            'text-emerald-600'
                                        }`}>
                                        {project.priority}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Client</p>
                                    <p className="font-bold text-slate-800 text-sm truncate">{project.client || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Team Size</p>
                                    <p className="font-bold text-slate-800 text-sm">
                                        {(project.teamMembers?.filter(m => (m._id?.toString() || m) !== project.teamLeader?._id?.toString()).length || 0) + 1}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div className="card p-5 bg-white border-slate-100 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-slate-600 uppercase mb-2">Days Remaining</span>
                            <span className={`text-2xl font-black ${daysLeft !== null && daysLeft <= 0 && project.status !== 'completed' ? 'text-rose-600' : 'text-slate-900'}`}>
                                {daysLeft !== null ? (daysLeft <= 0 && project.status !== 'completed' ? Math.abs(daysLeft) : daysLeft) : '∞'}
                            </span>
                            <span className={`text-[10px] font-bold ${daysLeft !== null && daysLeft <= 0 && project.status !== 'completed' ? 'text-rose-600' : 'text-slate-500'}`}>
                                {daysLeft !== null && daysLeft <= 0 && project.status !== 'completed' ? 'Days Overdue' : 'Until Deadline'}
                            </span>
                        </div>
                        <div className="card p-5 bg-white border-slate-100 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-slate-600 uppercase mb-2">Project Health</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${getRiskColor(project.riskStatus)}`}></span>
                                <span className="text-sm font-bold text-slate-700 capitalize">
                                    {project.riskStatus?.replace('-', ' ') || 'On Track'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Current Status</span>
                        </div>
                        <div className="card p-5 bg-white border-slate-100 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase mb-2">Task Completion</span>
                            <span className="text-2xl font-black text-indigo-600">
                                {project.milestones?.filter(m => m.status === 'completed').length || 0} / {project.milestones?.length || 0}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">Milestones Done</span>
                        </div>
                    </div>

                    {/* Milestones & Progress Control */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Milestones Card */}
                        <div className="card p-8 bg-white shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 items-center flex gap-2 mb-6">
                                <HiOutlineCheckCircle className="w-5 h-5 text-indigo-600" />
                                Key Milestones
                            </h3>
                            <div className="space-y-4">
                                {project.milestones && project.milestones.length > 0 ? (
                                    project.milestones.map((m) => (
                                        <div key={m._id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={m.status === 'completed'}
                                                    onChange={() => handleToggleMilestone(m._id)}
                                                    disabled={!isHR && !isTeamLeader}
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                                <div>
                                                    <p className={`text-sm font-bold ${m.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                                        {m.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">
                                                        Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No date set'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                m.status === 'in-review' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                {m.status.replace('-', ' ')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No milestones defined.</p>
                                )}
                            </div>
                        </div>

                        {/* Resources & Tags */}
                        <div className="card p-8 bg-white shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 items-center flex gap-2 mb-6">
                                <HiOutlineFlag className="w-5 h-5 text-emerald-600" />
                                Project Resources
                            </h3>
                            <div className="space-y-3">
                                {project.resources && project.resources.length > 0 ? (
                                    project.resources.map((r, idx) => (
                                        <a
                                            key={idx}
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <HiOutlineFlag className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">{r.name}</span>
                                            </div>
                                            <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                                        </a>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No resources added.</p>
                                )}

                                {(isHR || isTeamLeader) && (
                                    <div className="pt-6 border-t border-slate-100 mt-6 group/slider">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest block mb-1">Overall Progress Control</label>
                                                <p className="text-[10px] text-slate-500 font-bold">Click and drag to set, then hit Save</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-lg font-black shadow-lg shadow-indigo-200">
                                                    {localProgress}%
                                                </div>
                                                <button
                                                    onClick={() => handleProgressUpdate(localProgress)}
                                                    className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                                                    title="Save Progress"
                                                >
                                                    <HiOutlineSave className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative h-6 flex items-center">
                                            {/* Custom Stylish Slider Background */}
                                            <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${localProgress}%` }}
                                                ></div>
                                            </div>
                                            {/* Invisible Range Input for Interaction */}
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={localProgress}
                                                onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                                                onMouseUp={() => handleProgressUpdate(localProgress)}
                                                onTouchEnd={() => handleProgressUpdate(localProgress)}
                                                className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
                                            />
                                            {/* Stylized custom thumb */}
                                            <div
                                                className="absolute w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-md z-0 pointer-events-none group-active/slider:scale-125"
                                                style={{ left: `calc(${localProgress}% - 12px)` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Start</span>
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Complete</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Project Risk Register */}
                    <div className="card p-8 bg-white shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 items-center flex gap-2">
                                <HiOutlineExclamationCircle className="w-5 h-5 text-rose-600" />
                                Project Risk Register
                            </h3>
                            <button
                                onClick={() => setShowRiskForm(!showRiskForm)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                            >
                                {showRiskForm ? 'Cancel' : '+ Report Roadblock'}
                            </button>
                        </div>

                        {showRiskForm && (
                            <form onSubmit={handleAddRisk} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Risk Title</label>
                                        <input
                                            type="text"
                                            className="input text-sm"
                                            placeholder="What is the issue?"
                                            value={riskFormData.title}
                                            onChange={(e) => setRiskFormData({ ...riskFormData, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Severity</label>
                                        <select
                                            className="input text-sm"
                                            value={riskFormData.severity}
                                            onChange={(e) => setRiskFormData({ ...riskFormData, severity: e.target.value })}
                                        >
                                            <option value="low">Low Impact</option>
                                            <option value="medium">Medium Impact</option>
                                            <option value="high">Critical / High</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Description</label>
                                    <textarea
                                        className="input text-sm min-h-[80px]"
                                        placeholder="Describe the blocker and potential impact..."
                                        value={riskFormData.description}
                                        onChange={(e) => setRiskFormData({ ...riskFormData, description: e.target.value })}
                                    />
                                </div>
                                <button type="submit" disabled={submittingRisk} className="btn-primary w-full sm:w-auto px-8">
                                    {submittingRisk ? 'Reporting...' : 'Report Risk'}
                                </button>
                            </form>
                        )}

                        <div className="space-y-3">
                            {project.risks && project.risks.length > 0 ? (
                                project.risks.map((risk) => (
                                    <div key={risk._id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${risk.status === 'resolved' ? 'bg-slate-50/50 border-slate-100 opacity-75' :
                                        risk.severity === 'high' ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-100'
                                        }`}>
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`mt-1 p-1.5 rounded-lg ${risk.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                                                risk.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                                                    risk.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {risk.status === 'resolved' ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineExclamationCircle className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={`font-bold text-sm ${risk.status === 'resolved' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{risk.title}</p>
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${risk.severity === 'high' ? 'bg-rose-600 text-white' :
                                                        risk.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                                                        }`}>
                                                        {risk.severity}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-2">{risk.description}</p>
                                                <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-2">
                                                    Reported by {risk.reportedBy?.personalInfo?.firstName || 'System'} • {new Date(risk.reportedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        {risk.status === 'open' && (isHR || isTeamLeader) && (
                                            <button
                                                onClick={() => handleResolveRisk(risk._id)}
                                                className="flex-shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                title="Mark as Resolved"
                                            >
                                                <HiOutlineShieldCheck className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500 font-medium italic">No active risks or roadblocks reported.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Daily Update */}
                    {canSubmitUpdate && (
                        <div className="card p-8 bg-white shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 items-center flex gap-2 mb-6">
                                <HiOutlineChatAlt2 className="w-5 h-5 text-indigo-600" />
                                Post Daily Progress
                            </h3>
                            <form onSubmit={handleUpdateSubmit} className="space-y-4">
                                <textarea
                                    className="input min-h-[120px] bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
                                    placeholder={isTeamLeader ? "Submit your official progress report to HR..." : "Submit your daily update to the Team Leader..."}
                                    value={updateContent}
                                    onChange={(e) => setUpdateContent(e.target.value)}
                                    required
                                />
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-400 italic font-medium">
                                        {isTeamLeader ? 'Visible to HR & Team Members' : 'Will be shared with your Team Leader'}
                                    </p>
                                    <button
                                        type="submit"
                                        className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-200"
                                        disabled={submittingUpdate}
                                    >
                                        {submittingUpdate ? 'Sending...' : (
                                            <>
                                                <HiOutlinePaperAirplane className="w-4 h-4 rotate-90" />
                                                Send Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Project Updates Timeline */}
                    <div className="card p-8 bg-white shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 items-center flex gap-2 mb-8">
                            <HiOutlineClock className="w-5 h-5 text-emerald-600" />
                            Project Timeline
                        </h3>

                        {fetchingUpdates ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : updates.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-slate-400 italic">No updates posted yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 relative">
                                {/* Vertical line */}
                                <div className="absolute top-0 left-4 w-0.5 h-full bg-slate-100 -ml-px"></div>

                                {updates.map((update, index) => (
                                    <div key={update._id} className="relative pl-12">
                                        {/* Dot */}
                                        <div className={`absolute left-4 w-2.5 h-2.5 rounded-full -ml-1 border-2 border-white shadow-sm z-10 ${update.type === 'leader_update' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>

                                        <div className="card p-5 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${update.type === 'leader_update' ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                                                        {update.employee?.personalInfo?.firstName?.[0]}{update.employee?.personalInfo?.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            {update.employee?.personalInfo?.firstName} {update.employee?.personalInfo?.lastName}
                                                            {update.type === 'leader_update' ? (
                                                                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-tight">Team Leader</span>
                                                            ) : update.status === 'reviewed' ? (
                                                                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-tight">Reviewed</span>
                                                            ) : (
                                                                <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-tight">Pending Review</span>
                                                            )}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                                                            <HiOutlineClock className="w-3 h-3" />
                                                            {new Date(update.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isTeamLeader && update.type === 'member_update' && update.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleReviewUpdate(update._id)}
                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors border border-indigo-100"
                                                    >
                                                        Mark as Reviewed
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                {update.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Budget Card (HR Only) */}
                    {isHR && project.budget && (
                        <div className="card p-6 bg-white shadow-sm border border-slate-100 bg-gradient-to-br from-white to-slate-50">
                            <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider">
                                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                                    <HiOutlineBriefcase className="w-4 h-4" />
                                </span>
                                Project Budget
                            </h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900">
                                    {project.budget.currency} {parseFloat(project.budget.amount || 0).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-bold uppercase mt-2">Allocated Resources</p>
                        </div>
                    )}

                    {/* Timeline Card */}
                    <div className="card p-6 bg-white shadow-sm border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider">
                            <HiOutlineCalendar className="w-4 h-4 text-emerald-600" />
                            Timeline & Deadlines
                        </h4>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineCheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 font-bold uppercase">Started</p>
                                    <p className="font-bold text-slate-800">
                                        {new Date(project.startDate).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineFlag className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 font-bold uppercase">Deadline</p>
                                    <p className={`font-bold ${project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB') : 'Active Project'}
                                        {project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' && (
                                            <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Overdue</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Members Card */}
                    <div className="card p-6 bg-white shadow-sm border border-slate-100 overflow-visible">
                        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider">
                            <HiOutlineUserGroup className="w-4 h-4 text-blue-600" />
                            Project Team
                        </h4>

                        <div className="space-y-5">
                            {/* Team Leader */}
                            <div>
                                <p className="text-[10px] font-extrabold text-blue-600 uppercase mb-3 px-2 tracking-widest bg-blue-50 py-1 rounded-md inline-block">Team Leader</p>
                                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                        {project.teamLeader?.personalInfo?.firstName?.[0]}{project.teamLeader?.personalInfo?.lastName?.[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            {project.teamLeader?.personalInfo?.firstName} {project.teamLeader?.personalInfo?.lastName}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">{project.teamLeader?.employeeCode}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members */}
                            {project.teamMembers?.filter(m => (m._id?.toString() || m) !== project.teamLeader?._id?.toString()).length > 0 && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-extrabold text-slate-500 uppercase mb-3 px-2 tracking-widest">Team Members</p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {project.teamMembers
                                            .filter(member => (member._id?.toString() || member) !== project.teamLeader?._id?.toString())
                                            .map((member) => (
                                                <div key={member._id} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center gap-3 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                        {member.personalInfo?.firstName?.[0]}{member.personalInfo?.lastName?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">
                                                            {member.personalInfo?.firstName} {member.personalInfo?.lastName}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-600 uppercase">{member.employeeCode}</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assigned By */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                <HiOutlineIdentification className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase">Assigned By</p>
                                <p className="text-xs font-bold text-slate-700">HR Department</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
