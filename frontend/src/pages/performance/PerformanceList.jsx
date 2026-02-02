import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineChartBar,
    HiOutlineTrendingUp,
    HiOutlineStar,
    HiOutlineClipboardCheck,
    HiOutlineRefresh,
    HiOutlineCalendar
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PerformanceList = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState(null);
    const [reviews, setReviews] = useState([]);

    const isHRRole = ['admin', 'HRManager', 'DepartmentManager'].includes(user?.role);

    useEffect(() => {
        fetchPerformanceData();
    }, []);

    const fetchPerformanceData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/performance').catch(() => ({ data: null }));

            if (response.data?.reviews) {
                setReviews(response.data.reviews);

                // Calculate performance metrics from real data
                const reviewsList = response.data.reviews;
                const totalRevs = reviewsList.length;
                const avgRating = totalRevs > 0
                    ? (reviewsList.reduce((acc, curr) => acc + (curr.overallRating || 0), 0) / totalRevs).toFixed(1)
                    : 0;

                // Calculate goals achievement (assuming structure matches)
                let totalGoals = 0;
                let achievedGoals = 0;
                reviewsList.forEach(review => {
                    if (review.goals && Array.isArray(review.goals)) {
                        totalGoals += review.goals.length;
                        // Check status instead of boolean achieved
                        achievedGoals += review.goals.filter(g =>
                            ['completed', 'exceeded'].includes(g.status)
                        ).length;
                    }
                });

                setPerformanceData({
                    currentRating: avgRating,
                    totalReviews: totalRevs,
                    goalsAchieved: achievedGoals,
                    totalGoals: totalGoals,
                    // improvement logic would require comparing last 2 reviews
                    improvement: totalRevs > 1
                        ? (reviewsList[0].overallRating - reviewsList[1].overallRating).toFixed(1)
                        : "+0.0"
                });
            } else {
                setReviews([]);
                setPerformanceData({
                    currentRating: 0,
                    totalReviews: 0,
                    goalsAchieved: 0,
                    totalGoals: 0,
                    improvement: "+0.0"
                });
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 3.5) return 'text-blue-600';
        if (rating >= 2.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <HiOutlineStar
                    key={i}
                    className={`w-5 h-5 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            );
        }
        return stars;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Performance</h1>
                    <p className="text-secondary-500 mt-1">
                        {isHRRole ? 'Manage employee performance reviews' : 'View your performance reviews and goals'}
                    </p>
                </div>
                <button onClick={fetchPerformanceData} className="btn-secondary btn-sm">
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Performance Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <HiOutlineStar className="w-6 h-6 text-purple-600" />
                                </div>
                                <span className="text-sm text-green-600 font-medium">
                                    {performanceData?.improvement || '+0.0'}
                                </span>
                            </div>
                            <div className="mt-4">
                                <h3 className={`text-2xl font-bold ${getRatingColor(performanceData?.currentRating || 0)}`}>
                                    {performanceData?.currentRating || '-'}/5
                                </h3>
                                <p className="text-sm text-secondary-500">Current Rating</p>
                            </div>
                        </div>

                        <div className="card p-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <HiOutlineClipboardCheck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-2xl font-bold text-secondary-900">
                                    {performanceData?.totalReviews || 0}
                                </h3>
                                <p className="text-sm text-secondary-500">Total Reviews</p>
                            </div>
                        </div>

                        <div className="card p-6">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <HiOutlineTrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-2xl font-bold text-secondary-900">
                                    {performanceData?.goalsAchieved || 0}/{performanceData?.totalGoals || 0}
                                </h3>
                                <p className="text-sm text-secondary-500">Goals Achieved</p>
                            </div>
                        </div>

                        <div className="card p-6">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <HiOutlineCalendar className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-2xl font-bold text-secondary-900">Q1 2025</h3>
                                <p className="text-sm text-secondary-500">Next Review</p>
                            </div>
                        </div>
                    </div>

                    {/* Performance Reviews */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-secondary-100">
                            <h2 className="font-semibold text-secondary-900">Performance Reviews</h2>
                        </div>
                        <div className="divide-y divide-secondary-100">
                            {reviews.length === 0 ? (
                                <div className="p-8 text-center">
                                    <HiOutlineChartBar className="w-12 h-12 mx-auto text-secondary-300" />
                                    <p className="mt-2 text-secondary-500">No performance reviews yet</p>
                                </div>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review._id} className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {review.reviewPeriod?.[0] || 'Q'}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-secondary-900">
                                                        {review.reviewPeriod} Review
                                                    </h3>
                                                    <p className="text-sm text-secondary-500">
                                                        Reviewed by {review.reviewer?.firstName} {review.reviewer?.lastName}
                                                    </p>
                                                    <p className="text-xs text-secondary-400 mt-1">
                                                        Completed on {new Date(review.completedDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <div className="flex items-center gap-1">
                                                        {renderStars(review.overallRating)}
                                                    </div>
                                                    <p className={`text-lg font-bold ${getRatingColor(review.overallRating)}`}>
                                                        {review.overallRating}/5
                                                    </p>
                                                </div>
                                                <span className="badge-success">
                                                    {review.status}
                                                </span>
                                            </div>
                                        </div>
                                        {review.goals && review.goals.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-secondary-100">
                                                <p className="text-sm font-medium text-secondary-700 mb-2">Goals:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {review.goals.map((goal, idx) => {
                                                        const isAchieved = ['completed', 'exceeded'].includes(goal.status);
                                                        return (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium ${isAchieved
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                                    }`}
                                                            >
                                                                {isAchieved ? '✓' : '○'} {goal.title}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <HiOutlineChartBar className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-900">About Performance Reviews</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    Performance reviews are conducted quarterly by your manager.
                                    Goals and targets are set at the beginning of each quarter and reviewed at the end.
                                    All performance data is stored securely in the database.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PerformanceList;
