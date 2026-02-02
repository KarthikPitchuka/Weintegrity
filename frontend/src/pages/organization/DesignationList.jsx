import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineBriefcase,
    HiOutlineChevronUp,
    HiOutlineChevronDown,
    HiOutlineCurrencyRupee
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DesignationList = () => {
    const [designations, setDesignations] = useState([]);
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        level: 1,
        category: 'staff',
        jobFamily: 'other',
        grade: '',
        description: ''
    });

    const categories = ['trainee', 'staff', 'junior-management', 'middle-management', 'senior-management', 'executive'];
    const jobFamilies = ['engineering', 'product', 'design', 'sales', 'marketing', 'hr', 'finance', 'operations', 'support', 'leadership', 'other'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [desRes, gradeRes] = await Promise.all([
                api.get('/organization/designations').catch(() => ({ data: [] })),
                api.get('/organization/grades').catch(() => ({ data: [] }))
            ]);
            setDesignations(Array.isArray(desRes.data) ? desRes.data : []);
            setGrades(Array.isArray(gradeRes.data) ? gradeRes.data : []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/organization/designations/${editingItem._id}`, formData);
                toast.success('Designation updated');
            } else {
                await api.post('/organization/designations', formData);
                toast.success('Designation created');
            }
            setShowModal(false);
            setEditingItem(null);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', code: '', level: 1, category: 'staff', jobFamily: 'other', grade: '', description: '' });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code || '',
            level: item.level,
            category: item.category,
            jobFamily: item.jobFamily,
            grade: item.grade?._id || '',
            description: item.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/organization/designations/${id}`);
            toast.success('Designation deactivated');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const filteredItems = designations.filter(d => {
        const matchSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchLevel = filterLevel === 'all' || d.level === parseInt(filterLevel);
        const matchCategory = filterCategory === 'all' || d.category === filterCategory;
        return matchSearch && matchLevel && matchCategory;
    }).sort((a, b) => a.level - b.level);

    const getLevelColor = (level) => {
        if (level <= 2) return 'bg-green-100 text-green-700';
        if (level <= 4) return 'bg-blue-100 text-blue-700';
        if (level <= 6) return 'bg-purple-100 text-purple-700';
        return 'bg-orange-100 text-orange-700';
    };

    const formatCategory = (cat) => cat?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Designations</h1>
                    <p className="text-secondary-500 mt-1">Manage job titles and levels</p>
                </div>
                <button onClick={() => { setEditingItem(null); resetForm(); setShowModal(true); }} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    Add Designation
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Designations', value: designations.length, color: 'primary' },
                    { label: 'Entry Level (1-2)', value: designations.filter(d => d.level <= 2).length, color: 'green' },
                    { label: 'Mid Level (3-5)', value: designations.filter(d => d.level >= 3 && d.level <= 5).length, color: 'blue' },
                    { label: 'Senior Level (6+)', value: designations.filter(d => d.level >= 6).length, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="card p-4">
                        <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                        <p className="text-sm text-secondary-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search designations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Levels</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                            <option key={l} value={l}>Level {l}</option>
                        ))}
                    </select>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{formatCategory(c)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Designations List */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Designation</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Level</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Category</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Job Family</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Grade</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Salary Range</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-secondary-500">No designations found</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                                                    <HiOutlineBriefcase className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-secondary-900">{item.name}</p>
                                                    <p className="text-sm text-secondary-500">{item.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(item.level)}`}>
                                                L{item.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-secondary-700">{formatCategory(item.category)}</td>
                                        <td className="px-4 py-3 text-secondary-700 capitalize">{item.jobFamily?.replace('-', ' ')}</td>
                                        <td className="px-4 py-3">
                                            {item.grade ? (
                                                <span className="badge-info">{item.grade.name}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.grade?.salaryRange ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <HiOutlineCurrencyRupee className="w-4 h-4 text-secondary-400" />
                                                    <span>{(item.grade.salaryRange.minimum / 100000).toFixed(1)}L</span>
                                                    <span className="text-secondary-400">-</span>
                                                    <span>{(item.grade.salaryRange.maximum / 100000).toFixed(1)}L</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleEdit(item)} className="p-2 hover:bg-primary-50 rounded-lg text-secondary-500 hover:text-primary-600">
                                                    <HiOutlinePencil className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-secondary-500 hover:text-red-600">
                                                    <HiOutlineTrash className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">
                            {editingItem ? 'Edit Designation' : 'Add Designation'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Title *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Level *</label>
                                    <input type="number" min={1} max={15} value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="input" required />
                                </div>
                                <div>
                                    <label className="label">Code</label>
                                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Category</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input">
                                        {categories.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Job Family</label>
                                    <select value={formData.jobFamily} onChange={(e) => setFormData({ ...formData, jobFamily: e.target.value })} className="input">
                                        {jobFamilies.map(j => <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Linked Grade</label>
                                <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input">
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g._id} value={g._id}>{g.name} (₹{(g.salaryRange?.minimum / 100000).toFixed(1)}L - ₹{(g.salaryRange?.maximum / 100000).toFixed(1)}L)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} />
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

export default DesignationList;
