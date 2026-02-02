import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineCalendar,
    HiOutlineX,
    HiOutlineExclamation
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const HolidayManagement = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        type: 'national',
        description: '',
        isOptional: false
    });

    const years = [2025, 2026, 2027, 2028];
    const holidayTypes = [
        { value: 'national', label: 'National Holiday' },
        { value: 'regional', label: 'Regional Holiday' },
        { value: 'company', label: 'Company Holiday' },
        { value: 'optional', label: 'Optional Holiday' }
    ];

    useEffect(() => {
        fetchHolidays();
    }, [selectedYear]);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/holidays?year=${selectedYear}`);
            setHolidays(response.data?.holidays || []);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            toast.error('Failed to fetch holidays');
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setSelectedHoliday(null);
        setFormData({
            name: '',
            date: '',
            type: 'national',
            description: '',
            isOptional: false
        });
        setShowModal(true);
    };

    const handleEditClick = (holiday) => {
        setSelectedHoliday(holiday);
        const date = new Date(holiday.date);
        setFormData({
            name: holiday.name,
            date: date.toISOString().split('T')[0],
            type: holiday.type,
            description: holiday.description || '',
            isOptional: holiday.isOptional
        });
        setShowModal(true);
    };

    const handleDeleteClick = (holiday) => {
        setSelectedHoliday(holiday);
        setShowDeleteModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.date) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);

            if (selectedHoliday) {
                // Update existing
                await api.put(`/holidays/${selectedHoliday._id}`, formData);
                toast.success('Holiday updated successfully');
            } else {
                // Create new
                await api.post('/holidays', formData);
                toast.success('Holiday created successfully');
            }

            setShowModal(false);
            fetchHolidays();
        } catch (error) {
            console.error('Error saving holiday:', error);
            toast.error(error.response?.data?.message || 'Failed to save holiday');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedHoliday) return;

        try {
            setSaving(true);
            await api.delete(`/holidays/${selectedHoliday._id}`);
            toast.success('Holiday deleted successfully');
            setShowDeleteModal(false);
            setSelectedHoliday(null);
            fetchHolidays();
        } catch (error) {
            console.error('Error deleting holiday:', error);
            toast.error(error.response?.data?.message || 'Failed to delete holiday');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'national': return 'bg-blue-100 text-blue-700';
            case 'regional': return 'bg-purple-100 text-purple-700';
            case 'company': return 'bg-green-100 text-green-700';
            case 'optional': return 'bg-amber-100 text-amber-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Holiday Management</h1>
                    <p className="text-secondary-500 mt-1">Manage company holidays and calendar</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button onClick={handleAddClick} className="btn-primary">
                        <HiOutlinePlus className="w-5 h-5" />
                        Add Holiday
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <HiOutlineCalendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{holidays.length}</p>
                            <p className="text-sm text-secondary-500">Total Holidays</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <HiOutlineCalendar className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                {holidays.filter(h => h.type === 'national').length}
                            </p>
                            <p className="text-sm text-secondary-500">National</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <HiOutlineCalendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                {holidays.filter(h => h.type === 'regional').length}
                            </p>
                            <p className="text-sm text-secondary-500">Regional</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <HiOutlineCalendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                {holidays.filter(h => h.isOptional).length}
                            </p>
                            <p className="text-sm text-secondary-500">Optional</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Holidays List */}
            <div className="card">
                <div className="px-6 py-4 border-b border-secondary-100">
                    <h2 className="font-semibold text-secondary-900">Holidays for {selectedYear}</h2>
                </div>

                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="w-16 h-16 bg-secondary-200 rounded-lg"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-secondary-200 rounded w-1/4 mb-2"></div>
                                    <div className="h-3 bg-secondary-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : holidays.length === 0 ? (
                    <div className="p-12 text-center">
                        <HiOutlineCalendar className="w-12 h-12 mx-auto text-secondary-400 mb-4" />
                        <h3 className="text-lg font-medium text-secondary-900">No holidays found</h3>
                        <p className="text-secondary-500 mt-1">Add holidays for {selectedYear}</p>
                        <button onClick={handleAddClick} className="btn-primary mt-4">
                            <HiOutlinePlus className="w-5 h-5" />
                            Add First Holiday
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-100">
                        {holidays.map(holiday => (
                            <div key={holiday._id} className="p-4 hover:bg-secondary-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-lg bg-primary-50 flex flex-col items-center justify-center">
                                        <span className="text-xs text-primary-600 uppercase">
                                            {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-bold text-primary-600">
                                            {new Date(holiday.date).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-secondary-900">{holiday.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(holiday.type)}`}>
                                                {holiday.type}
                                            </span>
                                            {holiday.isOptional && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                    Optional
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary-500 mt-1">
                                            {formatDate(holiday.date)}
                                        </p>
                                        {holiday.description && (
                                            <p className="text-sm text-secondary-600 mt-1">{holiday.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditClick(holiday)}
                                            className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600"
                                        >
                                            <HiOutlinePencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(holiday)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-secondary-500 hover:text-red-600"
                                        >
                                            <HiOutlineTrash className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
                            <h2 className="text-xl font-bold text-secondary-900">
                                {selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-secondary-100 rounded-lg"
                            >
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Holiday Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Diwali"
                                    className="input"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Type
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="input"
                                    >
                                        {holidayTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Brief description of the holiday"
                                    rows={3}
                                    className="input resize-none"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isOptional"
                                    name="isOptional"
                                    checked={formData.isOptional}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="isOptional" className="ml-2 text-sm text-secondary-700">
                                    This is an optional/restricted holiday
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 btn-secondary"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : selectedHoliday ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                            <HiOutlineExclamation className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-secondary-900 mb-2">
                            Delete Holiday
                        </h3>
                        <p className="text-center text-secondary-600 mb-6">
                            Are you sure you want to delete <strong>{selectedHoliday?.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 btn-secondary"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 btn-danger"
                                disabled={saving}
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayManagement;
