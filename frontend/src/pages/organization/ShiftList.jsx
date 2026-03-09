import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineClock,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineRefresh
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ShiftList = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'regular',
        timing: { startTime: '09:00', endTime: '18:00', graceTime: 15, fullDayHours: 8 },
        workingDays: [1, 2, 3, 4, 5],
        overtime: { allowed: true, overtimeRate: 1.5 },
        color: '#3B82F6'
    });

    const shiftTypes = ['regular', 'night', 'rotational', 'flexible', 'split'];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/organization/shifts');
            setShifts(res.data);
        } catch (error) {
            toast.error('Failed to fetch shifts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/organization/shifts/${editingItem._id}`, formData);
                toast.success('Shift updated');
            } else {
                await api.post('/organization/shifts', formData);
                toast.success('Shift created');
            }
            setShowModal(false);
            setEditingItem(null);
            resetForm();
            fetchShifts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', code: '', type: 'regular',
            timing: { startTime: '09:00', endTime: '18:00', graceTime: 15, fullDayHours: 8 },
            workingDays: [1, 2, 3, 4, 5],
            overtime: { allowed: true, overtimeRate: 1.5 },
            color: '#3B82F6'
        });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code || '',
            type: item.type,
            timing: item.timing || { startTime: '09:00', endTime: '18:00', graceTime: 15, fullDayHours: 8 },
            workingDays: item.workingDays || [1, 2, 3, 4, 5],
            overtime: item.overtime || { allowed: true, overtimeRate: 1.5 },
            color: item.color || '#3B82F6'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/organization/shifts/${id}`);
            toast.success('Shift deactivated');
            fetchShifts();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const toggleWorkingDay = (day) => {
        const days = [...formData.workingDays];
        const idx = days.indexOf(day);
        if (idx > -1) {
            days.splice(idx, 1);
        } else {
            days.push(day);
            days.sort((a, b) => a - b);
        }
        setFormData({ ...formData, workingDays: days });
    };

    const getShiftIcon = (type) => {
        switch (type) {
            case 'night': return <HiOutlineMoon className="w-5 h-5" />;
            case 'rotational': return <HiOutlineRefresh className="w-5 h-5" />;
            default: return <HiOutlineSun className="w-5 h-5" />;
        }
    };

    const filteredItems = shifts.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Shift Management</h1>
                    <p className="text-secondary-500 mt-1">Configure work shifts and timings</p>
                </div>
                <button onClick={() => { setEditingItem(null); resetForm(); setShowModal(true); }} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    Add Shift
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <p className="text-2xl font-bold text-primary-600">{shifts.length}</p>
                    <p className="text-sm text-secondary-500">Total Shifts</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-yellow-600">{shifts.filter(s => s.type === 'regular').length}</p>
                    <p className="text-sm text-secondary-500">Regular Shifts</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-indigo-600">{shifts.filter(s => s.type === 'night').length}</p>
                    <p className="text-sm text-secondary-500">Night Shifts</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-green-600">{shifts.filter(s => s.type === 'flexible').length}</p>
                    <p className="text-sm text-secondary-500">Flexible Shifts</p>
                </div>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative group">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500 group-focus-within:text-primary-600 transition-colors z-10" />
                    <input
                        type="text"
                        placeholder="Search shifts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12"
                    />
                </div>
            </div>

            {/* Shifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="h-6 bg-secondary-200 rounded w-1/2 mb-4"></div>
                            <div className="h-4 bg-secondary-200 rounded w-full"></div>
                        </div>
                    ))
                ) : filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-secondary-500">No shifts found</div>
                ) : (
                    filteredItems.map(shift => (
                        <div key={shift._id} className="card p-6 hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: shift.color }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: shift.color }}>
                                        {getShiftIcon(shift.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-secondary-900">{shift.name}</h3>
                                        <span className="badge-info text-xs">{shift.code}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(shift)} className="p-2 hover:bg-primary-50 rounded-lg text-secondary-500 hover:text-primary-600">
                                        <HiOutlinePencil className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(shift._id)} className="p-2 hover:bg-red-50 rounded-lg text-secondary-500 hover:text-red-600">
                                        <HiOutlineTrash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-secondary-50 rounded-lg">
                                    <HiOutlineClock className="w-5 h-5 text-secondary-500" />
                                    <span className="font-semibold text-secondary-900">
                                        {shift.timing?.startTime} - {shift.timing?.endTime}
                                    </span>
                                    <span className="text-sm text-secondary-500 ml-auto">
                                        {shift.timing?.fullDayHours || 8}h/day
                                    </span>
                                </div>

                                <div className="flex gap-1">
                                    {weekDays.map((day, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 text-center py-1 rounded text-xs font-medium ${shift.workingDays?.includes(i)
                                                ? 'bg-primary-100 text-primary-700'
                                                : 'bg-secondary-100 text-secondary-400'
                                                }`}
                                        >
                                            {day[0]}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between text-sm text-secondary-500">
                                    <span>Grace: {shift.timing?.graceTime || 15} min</span>
                                    <span>OT: {shift.overtime?.allowed ? `${shift.overtime.overtimeRate}x` : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">{editingItem ? 'Edit Shift' : 'Add Shift'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Shift Name *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required />
                                </div>
                                <div>
                                    <label className="label">Type</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input">
                                        {shiftTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Start Time *</label>
                                    <input type="time" value={formData.timing.startTime} onChange={(e) => setFormData({ ...formData, timing: { ...formData.timing, startTime: e.target.value } })} className="input" required />
                                </div>
                                <div>
                                    <label className="label">End Time *</label>
                                    <input type="time" value={formData.timing.endTime} onChange={(e) => setFormData({ ...formData, timing: { ...formData.timing, endTime: e.target.value } })} className="input" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Grace Time (min)</label>
                                    <input type="number" value={formData.timing.graceTime} onChange={(e) => setFormData({ ...formData, timing: { ...formData.timing, graceTime: parseInt(e.target.value) } })} className="input" />
                                </div>
                                <div>
                                    <label className="label">Full Day Hours</label>
                                    <input type="number" value={formData.timing.fullDayHours} onChange={(e) => setFormData({ ...formData, timing: { ...formData.timing, fullDayHours: parseInt(e.target.value) } })} className="input" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Working Days</label>
                                <div className="flex gap-2">
                                    {weekDays.map((day, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => toggleWorkingDay(i)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.workingDays.includes(i)
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Overtime Allowed</label>
                                    <select value={formData.overtime.allowed ? 'yes' : 'no'} onChange={(e) => setFormData({ ...formData, overtime: { ...formData.overtime, allowed: e.target.value === 'yes' } })} className="input">
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Color</label>
                                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="input h-10" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">{editingItem ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftList;
