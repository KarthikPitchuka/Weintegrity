import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineLocationMarker,
    HiOutlineBriefcase,
    HiOutlineCurrencyRupee,
    HiOutlineUsers,
    HiOutlineRefresh,
    HiOutlineX
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { canPerform } from '../../utils/permissions';

const RecruitmentList = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [jobPostings, setJobPostings] = useState([]);
    const [stats, setStats] = useState({
        totalOpenings: 0,
        activeJobs: 0,
        totalApplicants: 0,
        hiredThisMonth: 0
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newJob, setNewJob] = useState({
        title: '',
        department: '',
        location: '',
        employmentType: 'full-time',
        salaryRange: { min: '', max: '', currency: 'INR' },
        openings: 1,
        description: '',
        requirements: ''
    });

    const canCreateJob = canPerform(user?.role, 'recruitment', 'create');

    const departments = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];

    useEffect(() => {
        fetchJobPostings();
    }, []);

    const fetchJobPostings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/recruitment');
            const jobs = response.data?.jobs || [];

            // Transform jobs for display
            const transformedJobs = jobs.map(job => ({
                id: job._id,
                title: job.jobTitle || job.title,
                department: job.department,
                location: job.location || 'Remote',
                type: job.employmentType || 'Full-time',
                salary: job.salaryRange ?
                    `${(job.salaryRange.min / 100000).toFixed(0)}-${(job.salaryRange.max / 100000).toFixed(0)} LPA` :
                    'Not specified',
                openings: job.openings || 1,
                applicants: job.applicants?.length || 0,
                status: job.status || 'open',
                postedDate: job.createdAt
            }));

            setJobPostings(transformedJobs);

            // Calculate stats
            const activeJobs = transformedJobs.filter(j => j.status === 'open').length;
            const totalOpenings = transformedJobs.reduce((acc, j) => acc + (j.status === 'open' ? j.openings : 0), 0);
            const totalApplicants = transformedJobs.reduce((acc, j) => acc + j.applicants, 0);

            setStats({
                totalOpenings,
                activeJobs,
                totalApplicants,
                hiredThisMonth: 0 // Would need additional API call for this
            });
        } catch (error) {
            console.error('Error fetching job postings:', error);
            toast.error('Failed to fetch job postings');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async () => {
        if (!newJob.title || !newJob.department) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            await api.post('/recruitment', {
                jobTitle: newJob.title,
                department: newJob.department,
                location: newJob.location,
                employmentType: newJob.employmentType,
                salaryRange: {
                    min: parseInt(newJob.salaryRange.min) * 100000 || 0,
                    max: parseInt(newJob.salaryRange.max) * 100000 || 0,
                    currency: 'INR'
                },
                openings: parseInt(newJob.openings) || 1,
                description: newJob.description,
                requirements: newJob.requirements.split('\n').filter(r => r.trim())
            });

            toast.success('Job posting created successfully!');
            setShowAddModal(false);
            setNewJob({
                title: '',
                department: '',
                location: '',
                employmentType: 'full-time',
                salaryRange: { min: '', max: '', currency: 'INR' },
                openings: 1,
                description: '',
                requirements: ''
            });
            fetchJobPostings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create job posting');
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.put(`/recruitment/${jobId}`, { status: newStatus });
            toast.success(`Job ${newStatus === 'closed' ? 'closed' : 'updated'} successfully!`);
            fetchJobPostings();
        } catch (error) {
            toast.error('Failed to update job status');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="badge-success">Open</span>;
            case 'on-hold':
                return <span className="badge-warning">On Hold</span>;
            case 'closed':
                return <span className="badge-gray">Closed</span>;
            case 'draft':
                return <span className="text-secondary-500 text-sm font-medium italic">Draft</span>;
            default:
                return <span className="badge-gray capitalize">{status}</span>;
        }
    };

    const filteredJobs = jobPostings.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Recruitment</h1>
                    <p className="text-secondary-500 mt-1">Manage job postings and applications</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchJobPostings} className="btn-secondary btn-sm">
                        <HiOutlineRefresh className="w-4 h-4" />
                    </button>
                    {canCreateJob && (
                        <button onClick={() => setShowAddModal(true)} className="btn-primary">
                            <HiOutlinePlus className="w-5 h-5" />
                            Post New Job
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="on-hold">On Hold</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <p className="text-sm text-secondary-500">Total Openings</p>
                    <p className="text-2xl font-bold text-secondary-900 mt-1">{stats.totalOpenings}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-secondary-500">Active Jobs</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeJobs}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-secondary-500">Total Applicants</p>
                    <p className="text-2xl font-bold text-primary-600 mt-1">{stats.totalApplicants}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-secondary-500">Hired This Month</p>
                    <p className="text-2xl font-bold text-secondary-900 mt-1">{stats.hiredThisMonth}</p>
                </div>
            </div>

            {/* Job Listings */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredJobs.map((job) => (
                        <div key={job.id} className="card p-6 hover:shadow-card-hover transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                                            {job.department[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-secondary-900">{job.title}</h3>
                                            <p className="text-sm text-secondary-500">{job.department}</p>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1 text-sm text-secondary-600">
                                                    <HiOutlineLocationMarker className="w-4 h-4" />
                                                    {job.location}
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-secondary-600">
                                                    <HiOutlineBriefcase className="w-4 h-4" />
                                                    {job.type}
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-secondary-600">
                                                    <HiOutlineCurrencyRupee className="w-4 h-4" />
                                                    {job.salary}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-secondary-900">{job.openings}</p>
                                        <p className="text-xs text-secondary-500">Openings</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center gap-1">
                                            <HiOutlineUsers className="w-4 h-4 text-primary-600" />
                                            <p className="text-2xl font-bold text-primary-600">{job.applicants}</p>
                                        </div>
                                        <p className="text-xs text-secondary-500">Applicants</p>
                                    </div>
                                    <div>
                                        {getStatusBadge(job.status)}
                                    </div>
                                    {canCreateJob && job.status === 'open' && (
                                        <button
                                            onClick={() => handleUpdateStatus(job.id, 'closed')}
                                            className="btn-secondary btn-sm"
                                        >
                                            Close Job
                                        </button>
                                    )}
                                    <Link to={`/recruitment/${job.id}`} className="btn-primary btn-sm">
                                        Manage Candidates
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredJobs.length === 0 && (
                <div className="card p-12 text-center">
                    <HiOutlineBriefcase className="w-12 h-12 mx-auto text-secondary-300" />
                    <h3 className="mt-4 text-lg font-medium text-secondary-900">No jobs found</h3>
                    <p className="mt-2 text-secondary-500">
                        {jobPostings.length === 0 ? 'Create your first job posting to get started' : 'Try adjusting your search criteria'}
                    </p>
                    {canCreateJob && jobPostings.length === 0 && (
                        <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
                            <HiOutlinePlus className="w-5 h-5" />
                            Post New Job
                        </button>
                    )}
                </div>
            )}

            {/* Add Job Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-secondary-900">Post New Job</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Job Title *</label>
                                    <input
                                        type="text"
                                        value={newJob.title}
                                        onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                                        className="input"
                                        placeholder="e.g., Senior Software Developer"
                                    />
                                </div>
                                <div>
                                    <label className="label">Department *</label>
                                    <select
                                        value={newJob.department}
                                        onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                                        className="input"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Location</label>
                                    <input
                                        type="text"
                                        value={newJob.location}
                                        onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                                        className="input"
                                        placeholder="e.g., Bangalore, Remote"
                                    />
                                </div>
                                <div>
                                    <label className="label">Employment Type</label>
                                    <select
                                        value={newJob.employmentType}
                                        onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                                        className="input"
                                    >
                                        <option value="full-time">Full Time</option>
                                        <option value="part-time">Part Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="intern">Intern</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Salary Range (LPA)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={newJob.salaryRange.min}
                                            onChange={(e) => setNewJob({ ...newJob, salaryRange: { ...newJob.salaryRange, min: e.target.value } })}
                                            className="input"
                                            placeholder="Min"
                                        />
                                        <input
                                            type="number"
                                            value={newJob.salaryRange.max}
                                            onChange={(e) => setNewJob({ ...newJob, salaryRange: { ...newJob.salaryRange, max: e.target.value } })}
                                            className="input"
                                            placeholder="Max"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Number of Openings</label>
                                    <input
                                        type="number"
                                        value={newJob.openings}
                                        onChange={(e) => setNewJob({ ...newJob, openings: e.target.value })}
                                        className="input"
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Job Description</label>
                                <textarea
                                    value={newJob.description}
                                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                                    className="input min-h-[100px]"
                                    placeholder="Describe the role and responsibilities..."
                                />
                            </div>
                            <div>
                                <label className="label">Requirements (one per line)</label>
                                <textarea
                                    value={newJob.requirements}
                                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                                    className="input min-h-[100px]"
                                    placeholder="5+ years of experience&#10;Strong communication skills&#10;Bachelor's degree in CS"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-secondary-100 flex gap-3 justify-end">
                            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleCreateJob} className="btn-primary">
                                Post Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecruitmentList;
