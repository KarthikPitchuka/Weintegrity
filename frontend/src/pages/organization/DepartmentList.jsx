import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineOfficeBuilding,
    HiOutlineLocationMarker,
    HiOutlineUserGroup,
    HiOutlineChartBar
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DepartmentList = () => {
    const [departments, setDepartments] = useState([]);
    const [flatDepartments, setFlatDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        parentDepartment: '',
        costCenter: { code: '', name: '' }
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/organization/departments');
            setDepartments(res.data.departments || res.data);
            setFlatDepartments(res.data.flat || res.data);
        } catch (error) {
            toast.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDept) {
                await api.put(`/organization/departments/${editingDept._id}`, formData);
                toast.success('Department updated successfully');
            } else {
                await api.post('/organization/departments', formData);
                toast.success('Department created successfully');
            }
            setShowModal(false);
            setEditingDept(null);
            setFormData({ name: '', code: '', description: '', parentDepartment: '', costCenter: { code: '', name: '' } });
            fetchDepartments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (dept) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            code: dept.code || '',
            description: dept.description || '',
            parentDepartment: dept.parentDepartment?._id || '',
            costCenter: dept.costCenter || { code: '', name: '' }
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            await api.delete(`/organization/departments/${id}`);
            toast.success('Department deactivated');
            fetchDepartments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    const renderDeptTree = (depts, level = 0) => {
        return depts.map(dept => (
            <div key={dept._id}>
                <div
                    className={`flex items-center justify-between p-4 border-b border-secondary-100 hover:bg-secondary-50 transition-colors`}
                    style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${level === 0 ? 'from-primary-500 to-primary-600' : 'from-secondary-400 to-secondary-500'} flex items-center justify-center text-white`}>
                            <HiOutlineOfficeBuilding className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-secondary-900">{dept.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-secondary-500">
                                <span className="badge-info">{dept.code}</span>
                                {dept.costCenter?.code && (
                                    <span>Cost Center: {dept.costCenter.code}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-secondary-500">
                            <HiOutlineUserGroup className="inline w-4 h-4 mr-1" />
                            {dept.employeeCount || 0} employees
                        </span>
                        <button
                            onClick={() => handleEdit(dept)}
                            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                            <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleDelete(dept._id)}
                            className="p-2 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <HiOutlineTrash className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {dept.children?.length > 0 && renderDeptTree(dept.children, level + 1)}
            </div>
        ));
    };

    const filteredDepts = (departments || []).filter(d =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="text-secondary-500 mt-1">Manage organization structure</p>
                </div>
                <button onClick={() => { setEditingDept(null); setShowModal(true); }} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    Add Department
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                            <HiOutlineOfficeBuilding className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{flatDepartments.length}</p>
                            <p className="text-sm text-secondary-500">Total Departments</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <HiOutlineChartBar className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                {(departments || []).filter(d => !d.parentDepartment).length}
                            </p>
                            <p className="text-sm text-secondary-500">Top-Level Departments</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <HiOutlineLocationMarker className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                {flatDepartments.reduce((sum, d) => sum + (d.employeeCount || 0), 0)}
                            </p>
                            <p className="text-sm text-secondary-500">Total Employees</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative group">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500 group-focus-within:text-primary-600 transition-colors z-10" />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12"
                    />
                </div>
            </div>

            {/* Department Tree */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-secondary-100 bg-secondary-50">
                    <h2 className="font-semibold text-secondary-900">Department Hierarchy</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : filteredDepts.length === 0 ? (
                    <div className="p-8 text-center text-secondary-500">
                        No departments found
                    </div>
                ) : (
                    renderDeptTree(filteredDepts)
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">
                            {editingDept ? 'Edit Department' : 'Add Department'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Department Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="input"
                                    placeholder="Auto-generated if empty"
                                />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="label">Parent Department</label>
                                <select
                                    value={formData.parentDepartment}
                                    onChange={(e) => setFormData({ ...formData, parentDepartment: e.target.value })}
                                    className="input"
                                >
                                    <option value="">No Parent (Top Level)</option>
                                    {flatDepartments.filter(d => d._id !== editingDept?._id).map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Cost Center Code</label>
                                    <input
                                        type="text"
                                        value={formData.costCenter.code}
                                        onChange={(e) => setFormData({ ...formData, costCenter: { ...formData.costCenter, code: e.target.value } })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Cost Center Name</label>
                                    <input
                                        type="text"
                                        value={formData.costCenter.name}
                                        onChange={(e) => setFormData({ ...formData, costCenter: { ...formData.costCenter, name: e.target.value } })}
                                        className="input"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    {editingDept ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentList;
