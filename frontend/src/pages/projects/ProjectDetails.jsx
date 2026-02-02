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
    HiOutlineChevronRight
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

    const isHR = ['admin', 'HRManager', 'HRExecutive'].includes(user?.role);
    const employeeId = user?.employeeId || user?._id;
    const isTeamLeader = project?.teamLeader?._id === employeeId;
    const isTeamMember = project?.teamMembers?.some(m => m._id === employeeId);
    const canSubmitUpdate = isTeamLeader || isTeamMember;

    useEffect(() => {
        fetchProject();
        fetchUpdates();
    }, [id]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projects/${id}`);
            setProject(response.data.project);
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
                        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                        <p className="text-slate-500">Project Overview & History</p>
                    </div>
                </div>
                {isHR && (
                    <button onClick={handleDelete} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="Delete Project">
                        <HiOutlineTrash className="w-5 h-5" />
                    </button>
                )}
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
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</p>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        project.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {project.status.replace('-', ' ')}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Priority</p>
                                    <span className={`font-bold capitalize text-sm ${project.priority === 'high' ? 'text-rose-600' :
                                        project.priority === 'medium' ? 'text-amber-600' :
                                            'text-emerald-600'
                                        }`}>
                                        {project.priority}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Client</p>
                                    <p className="font-bold text-slate-800 text-sm truncate">{project.client || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Team Size</p>
                                    <p className="font-bold text-slate-800 text-sm">
                                        {(project.teamMembers?.filter(m => m._id !== project.teamLeader?._id).length || 0) + 1}
                                    </p>
                                </div>
                            </div>
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
                                        className="btn-primary flex items-center gap-2"
                                        disabled={submittingUpdate}
                                    >
                                        {submittingUpdate ? 'Posting...' : (
                                            <>
                                                <HiOutlineCheckCircle className="w-4 h-4" />
                                                Submit Update
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
                                    <p className="text-xs text-slate-400 font-bold uppercase">Started</p>
                                    <p className="font-bold text-slate-800">{new Date(project.startDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineFlag className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Deadline</p>
                                    <p className="font-bold text-slate-800">
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Active Project'}
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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{project.teamLeader?.employeeCode}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members */}
                            {project.teamMembers?.filter(m => m._id !== project.teamLeader?._id).length > 0 && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-3 px-2 tracking-widest">Team Members</p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {project.teamMembers
                                            .filter(member => member._id !== project.teamLeader?._id)
                                            .map((member) => (
                                                <div key={member._id} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center gap-3 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                        {member.personalInfo?.firstName?.[0]}{member.personalInfo?.lastName?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">
                                                            {member.personalInfo?.firstName} {member.personalInfo?.lastName}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{member.employeeCode}</p>
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
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Assigned By</p>
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
