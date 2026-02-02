import { useState, useEffect } from 'react';
import { HiOutlineAcademicCap, HiOutlineSearch, HiOutlinePlay, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TrainingList = () => {
    const { user } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrainings();
    }, []);

    const fetchTrainings = async () => {
        try {
            const response = await api.get('/training');
            setTrainings(response.data.trainings || []);
        } catch (error) {
            console.error('Error fetching trainings:', error);
            // toast.error('Failed to load trainings'); // Suppress error on init if db empty
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (trainingId) => {
        try {
            await api.post(`/training/${trainingId}/register`);
            toast.success('Successfully registered for training');
            fetchTrainings(); // Refresh data
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        }
    };

    const getMyStatus = (training) => {
        // Use employeeId or user._id to find participant record
        const myId = user.employeeId || user._id;
        const participant = training.participants?.find(p => p.employeeId === myId || p.employeeId?._id === myId);

        if (!participant) return null;

        return {
            status: participant.attendanceStatus || 'registered',
            progress: participant.completionPercentage || 0
        };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'attended': return 'text-green-600 bg-green-50';
            case 'ongoing': return 'text-blue-600 bg-blue-50';
            case 'registered': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Training & Development</h1>
                    <p className="text-secondary-500 mt-1">Enhance your skills with our training programs</p>
                </div>
                <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        className="input pl-10 w-full md:w-64"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
            ) : trainings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <HiOutlineAcademicCap className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900">No trainings available</h3>
                    <p className="text-gray-500">Check back later for new courses.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trainings.map(training => {
                        const myStats = getMyStatus(training);
                        const isRegistered = !!myStats;

                        return (
                            <div key={training._id} className="card hover:shadow-card-hover transition-shadow overflow-hidden group flex flex-col h-full">
                                <div className="h-40 bg-gray-100 relative overflow-hidden">
                                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isRegistered ? 'from-primary-600 to-primary-800' : 'from-gray-600 to-gray-800'}`}>
                                        <HiOutlineAcademicCap className="w-16 h-16 text-white/20" />
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(isRegistered ? myStats.status : training.status)}`}>
                                            {isRegistered ? myStats.status : training.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg text-gray-900 mb-2">{training.title}</h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{training.description}</p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                        {training.schedule?.duration && (
                                            <div className="flex items-center gap-1">
                                                <HiOutlineClock className="w-4 h-4" />
                                                {training.schedule.duration} hours
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <HiOutlineAcademicCap className="w-4 h-4" />
                                            {training.category}
                                        </div>
                                    </div>

                                    {/* Progress Bar if registered */}
                                    {isRegistered && (
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-gray-700">Progress</span>
                                                <span className="text-gray-500">{myStats.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${myStats.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => !isRegistered && handleRegister(training._id)}
                                        disabled={isRegistered && myStats.status !== 'completed'}
                                        className={`w-full flex items-center justify-center gap-2 btn ${isRegistered
                                                ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                                                : 'btn-primary'
                                            }`}
                                    >
                                        {isRegistered ? (
                                            <>
                                                <HiOutlineCheckCircle className="w-5 h-5" />
                                                {myStats.status === 'completed' ? 'Completed' : 'Registered'}
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlinePlay className="w-5 h-5" />
                                                Register Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default TrainingList;
