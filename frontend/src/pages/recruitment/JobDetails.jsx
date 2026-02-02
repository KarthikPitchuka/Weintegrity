import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineCalendar,
    HiOutlineLocationMarker,
    HiOutlineCurrencyRupee,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineDocumentText,
    HiOutlineClock,


    HiOutlinePlus,
    HiOutlineX
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STAGES = [
    { id: 'applied', label: 'Applied', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'screening', label: 'Screening', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { id: 'interview', label: 'Interview', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'offered', label: 'Offered', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { id: 'hired', label: 'Hired', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-700' }
];

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [draggedApplicant, setDraggedApplicant] = useState(null);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [newCandidate, setNewCandidate] = useState({
        name: '',
        email: '',
        phone: '',
        resumeUrl: '',
        coverLetter: ''
    });

    useEffect(() => {
        fetchJobDetails();
    }, [id]);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/recruitment/${id}`);
            setJob(response.data.job);
        } catch (error) {
            console.error('Error fetching job details:', error);
            toast.error('Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e, applicant) => {
        setDraggedApplicant(applicant);
        e.dataTransfer.effectAllowed = 'move';
        // Transparent drag image or default
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (!draggedApplicant || draggedApplicant.status === newStatus) return;

        // Optimistic update
        const updatedApplicants = job.applicants.map(app =>
            app._id === draggedApplicant._id ? { ...app, status: newStatus } : app
        );

        setJob(prev => ({ ...prev, applicants: updatedApplicants }));

        try {
            await api.put(`/recruitment/${id}/applicants/${draggedApplicant._id}`, {
                status: newStatus
            });
            toast.success(`Moved to ${STAGES.find(s => s.id === newStatus).label}`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
            fetchJobDetails(); // Revert on error
        } finally {
            setDraggedApplicant(null);
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name || !newCandidate.email) {
            toast.error('Name and Email are required');
            return;
        }

        try {
            await api.post(`/recruitment/${id}/apply`, newCandidate);
            toast.success('Candidate added successfully');
            setShowAddCandidateModal(false);
            setNewCandidate({
                name: '',
                email: '',
                phone: '',
                resumeUrl: '',
                coverLetter: ''
            });
            fetchJobDetails();
        } catch (error) {
            console.error('Error adding candidate:', error);
            toast.error(error.response?.data?.message || 'Failed to add candidate');
        }
    };

    const StatusBadge = ({ status }) => {
        const stage = STAGES.find(s => s.id === status) || STAGES[0];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stage.color}`}>
                {stage.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!job) return <div>Job not found</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex-none">
                <button
                    onClick={() => navigate('/recruitment')}
                    className="flex items-center text-secondary-500 hover:text-primary-600 transition-colors mb-4"
                >
                    <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
                    Back to Jobs
                </button>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">{job.jobTitle}</h1>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary-600">
                            <span className="flex items-center gap-1">
                                <HiOutlineLocationMarker className="w-4 h-4" />
                                {job.location || 'Remote'}
                            </span>
                            <span className="flex items-center gap-1">
                                <HiOutlineClock className="w-4 h-4" />
                                {job.employmentType}
                            </span>
                            {job.salaryRange && (
                                <span className="flex items-center gap-1">
                                    <HiOutlineCurrencyRupee className="w-4 h-4" />
                                    {(job.salaryRange.min / 100000).toFixed(1)} - {(job.salaryRange.max / 100000).toFixed(1)} LPA
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <HiOutlineDocumentText className="w-4 h-4" />
                                {job.applicants?.length || 0} Applicants
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDescriptionModal(true)}
                            className="btn-secondary"
                        >
                            View Description
                        </button>
                        <button
                            onClick={() => setShowAddCandidateModal(true)}
                            className="btn-primary"
                        >
                            <HiOutlinePlus className="w-5 h-5 mr-1" />
                            Add Candidate
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto min-h-0">
                <div className="flex gap-4 h-full min-w-[1200px] pb-4">
                    {STAGES.map(stage => {
                        const stageApplicants = job.applicants?.filter(a => a.status === stage.id) || [];

                        return (
                            <div
                                key={stage.id}
                                className="flex-1 min-w-[280px] bg-secondary-50 rounded-xl flex flex-col max-h-full"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* Column Header */}
                                <div className={`p-3 border-b border-white border-opacity-50 flex justify-between items-center rounded-t-xl ${stage.color.split(' ')[0]}`}>
                                    <h3 className={`font-semibold ${stage.color.split(' ')[2]}`}>{stage.label}</h3>
                                    <span className="bg-white/50 px-2 py-0.5 rounded text-sm font-medium">
                                        {stageApplicants.length}
                                    </span>
                                </div>

                                {/* Drag Area */}
                                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {stageApplicants.map(applicant => (
                                        <div
                                            key={applicant._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, applicant)}
                                            onClick={() => setSelectedApplicant(applicant)}
                                            className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200 hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:border-primary-300 group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-secondary-900 line-clamp-1">{applicant.name}</h4>
                                                {applicant.rating && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded flex items-center">
                                                        ★ {applicant.rating}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center text-xs text-secondary-500">
                                                    <HiOutlineMail className="w-3.5 h-3.5 mr-1.5" />
                                                    <span className="truncate">{applicant.email}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-secondary-500">
                                                    <HiOutlineCalendar className="w-3.5 h-3.5 mr-1.5" />
                                                    {format(new Date(applicant.appliedDate), 'MMM d, yyyy')}
                                                </div>
                                            </div>

                                            {/* Action Hints */}
                                            <div className="mt-3 text-xs text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                                View Details →
                                            </div>
                                        </div>
                                    ))}
                                    {stageApplicants.length === 0 && (
                                        <div className="text-center py-8 text-secondary-400 text-sm border-2 border-dashed border-secondary-200 rounded-lg">
                                            No candidates
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Applicant Details Modal */}
            {selectedApplicant && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-secondary-900">{selectedApplicant.name}</h2>
                                <p className="text-secondary-500 text-sm mt-1">Applied for {job.jobTitle}</p>
                            </div>
                            <button
                                onClick={() => setSelectedApplicant(null)}
                                className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                            >
                                <span className="text-2xl text-secondary-500">×</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status Bar */}
                            <div className="flex items-center justify-between bg-secondary-50 p-4 rounded-xl">
                                <div>
                                    <p className="text-xs text-secondary-500 uppercase font-semibold">Current Stage</p>
                                    <StatusBadge status={selectedApplicant.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-secondary-500 uppercase font-semibold">Applied On</p>
                                    <p className="font-medium text-secondary-900">{format(new Date(selectedApplicant.appliedDate), 'PPP')}</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-secondary-200 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <HiOutlineMail className="text-secondary-400" />
                                        <p className="text-sm font-medium text-secondary-700">Email</p>
                                    </div>
                                    <p className="text-secondary-900 break-all">{selectedApplicant.email}</p>
                                </div>
                                <div className="p-4 border border-secondary-200 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <HiOutlinePhone className="text-secondary-400" />
                                        <p className="text-sm font-medium text-secondary-700">Phone</p>
                                    </div>
                                    <p className="text-secondary-900">{selectedApplicant.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Resume & Cover Letter */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-secondary-900">Application Documents</h3>
                                <div className="flex gap-4">
                                    {selectedApplicant.resumeUrl ? (
                                        <a
                                            href={selectedApplicant.resumeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 px-4 py-3 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors"
                                        >
                                            <HiOutlineDocumentText className="w-5 h-5" />
                                            View Resume
                                        </a>
                                    ) : (
                                        <div className="text-secondary-500 text-sm italic">No resume uploaded</div>
                                    )}
                                </div>
                                {selectedApplicant.coverLetter && (
                                    <div className="bg-secondary-50 p-4 rounded-xl">
                                        <p className="text-xs text-secondary-500 uppercase font-semibold mb-2">Cover Letter</p>
                                        <p className="text-secondary-700 text-sm whitespace-pre-wrap">{selectedApplicant.coverLetter}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-secondary-100 flex justify-end gap-3 bg-secondary-50 rounded-b-2xl">
                            <button
                                onClick={() => setSelectedApplicant(null)}
                                className="btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Job Description Modal */}
            {
                showDescriptionModal && job && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-secondary-900">Job Description</h2>
                                    <p className="text-secondary-500 text-sm mt-1">{job.jobTitle}</p>
                                </div>
                                <button
                                    onClick={() => setShowDescriptionModal(false)}
                                    className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                                >
                                    <HiOutlineX className="w-5 h-5 text-secondary-500" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="font-semibold text-secondary-900 mb-2">Description</h3>
                                    <p className="text-secondary-700 whitespace-pre-wrap">{job.description}</p>
                                </div>
                                {job.requirements && job.requirements.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-secondary-900 mb-2">Requirements</h3>
                                        <ul className="list-disc list-inside space-y-1 text-secondary-700">
                                            {job.requirements.map((req, index) => (
                                                <li key={index}>{req}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {job.responsibilities && job.responsibilities.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-secondary-900 mb-2">Responsibilities</h3>
                                        <ul className="list-disc list-inside space-y-1 text-secondary-700">
                                            {job.responsibilities.map((resp, index) => (
                                                <li key={index}>{resp}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-secondary-100 flex justify-end bg-secondary-50 rounded-b-2xl">
                                <button
                                    onClick={() => setShowDescriptionModal(false)}
                                    className="btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Candidate Modal */}
            {
                showAddCandidateModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-start">
                                <h2 className="text-xl font-bold text-secondary-900">Add Candidate</h2>
                                <button
                                    onClick={() => setShowAddCandidateModal(false)}
                                    className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                                >
                                    <HiOutlineX className="w-5 h-5 text-secondary-500" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="label">Full Name *</label>
                                    <input
                                        type="text"
                                        value={newCandidate.name}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                        className="input"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email Address *</label>
                                    <input
                                        type="email"
                                        value={newCandidate.email}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                                        className="input"
                                        placeholder="e.g. john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={newCandidate.phone}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                                        className="input"
                                        placeholder="e.g. +91 98765 43210"
                                    />
                                </div>
                                <div>
                                    <label className="label">Resume URL</label>
                                    <input
                                        type="url"
                                        value={newCandidate.resumeUrl}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, resumeUrl: e.target.value })}
                                        className="input"
                                        placeholder="e.g. https://drive.google.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Cover Letter / Notes</label>
                                    <textarea
                                        value={newCandidate.coverLetter}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, coverLetter: e.target.value })}
                                        className="input min-h-[100px]"
                                        placeholder="Paste cover letter or initial screening notes..."
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-secondary-100 flex justify-end gap-3 bg-secondary-50 rounded-b-2xl">
                                <button
                                    onClick={() => setShowAddCandidateModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCandidate}
                                    className="btn-primary"
                                >
                                    Add Candidate
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default JobDetails;
