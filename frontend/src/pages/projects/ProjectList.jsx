import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineBriefcase,
    HiOutlineClock,
    HiOutlineUserGroup,
    HiOutlineFlag,
    HiOutlineChevronRight
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ProjectList = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });

    const isHR = ['admin', 'HRManager', 'HRExecutive'].includes(user?.role);

    useEffect(() => {
        fetchProjects();
    }, [filterStatus]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterStatus !== 'all') params.status = filterStatus;

            const response = await api.get('/projects', { params });
            setProjects(response.data.projects);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error('Failed to fetch projects');
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'planned': return 'badge-info';
            case 'in-progress': return 'badge-warning';
            case 'completed': return 'badge-success';
            case 'on-hold': return 'badge-gray';
            default: return 'badge-gray';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-rose-500';
            case 'medium': return 'text-amber-500';
            case 'low': return 'text-emerald-500';
            default: return 'text-slate-500';
        }
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Projects</h1>
                    <p className="text-secondary-500 mt-1">Manage and track your organization's projects</p>
                </div>
                {isHR && (
                    <Link to="/projects/add" className="btn-primary">
                        <HiOutlinePlus className="w-5 h-5" />
                        Create Project
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500 group-focus-within:text-primary-600 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="Search projects or clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="relative group">
                            <HiOutlineFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500 group-focus-within:text-primary-600 transition-colors z-10" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input pl-12 pr-10 appearance-none cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="planned">Planned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="on-hold">On Hold</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card p-6 animate-pulse bg-white/50">
                            <div className="h-6 bg-secondary-200 rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-secondary-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-secondary-200 rounded w-2/3 mb-6"></div>
                            <div className="flex justify-between border-t border-secondary-100 pt-4">
                                <div className="h-4 bg-secondary-200 rounded w-1/4"></div>
                                <div className="h-4 bg-secondary-200 rounded w-1/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Link
                            key={project._id}
                            to={`/projects/${project._id}`}
                            className="card group p-6 hover:shadow-xl transition-all border border-transparent hover:border-primary-100 bg-white"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    <HiOutlineBriefcase className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className={getStatusBadgeClass(project.status)}>
                                        {project.status.replace('-', ' ')}
                                    </span>
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                                        {project.category || 'General'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors mb-2 truncate">
                                {project.name}
                            </h3>

                            {project.client && (
                                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                    <span className="font-medium text-slate-700">Client:</span> {project.client}
                                </p>
                            )}

                            {/* Progress Indicator */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
                                    <span className="text-[10px] font-bold text-primary-600">{project.progress || 0}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-primary-600'}`}
                                        style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <HiOutlineClock className="w-4 h-4" />
                                        <span>Deadline:</span>
                                    </div>
                                    <span className={`font-medium ${project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' ? 'text-red-600 flex items-center gap-1' : 'text-slate-700'}`}>
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB') : 'N/A'}
                                        {project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' && (
                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Overdue</span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <HiOutlineUserGroup className="w-4 h-4" />
                                        <span>Team size:</span>
                                    </div>
                                    <span className="font-medium text-slate-700">
                                        {(project.teamMembers?.filter(m => m._id !== project.teamLeader?._id).length || 0) + 1} Members
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <HiOutlineFlag className="w-4 h-4" />
                                        <span>Priority:</span>
                                    </div>
                                    <span className={`font-bold capitalize ${getPriorityColor(project.priority)}`}>
                                        {project.priority}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between text-primary-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>View Details</span>
                                <HiOutlineChevronRight className="w-4 h-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredProjects.length === 0 && (
                <div className="card p-12 text-center bg-white/50 border-dashed border-2 border-slate-200 shadow-none">
                    <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <HiOutlineBriefcase className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No projects found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        We couldn't find any projects matching your criteria. Try adjusting your search or create a new project.
                    </p>
                    {isHR && (
                        <Link to="/projects/add" className="btn-primary mt-6 inline-flex">
                            <HiOutlinePlus className="w-5 h-5 mr-2" />
                            Create Your First Project
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectList;
