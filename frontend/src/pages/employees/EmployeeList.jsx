import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineDotsVertical,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineTrash,
    HiOutlineExclamation
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// HR roles that can delete employees
const HR_ROLES = ['admin', 'HRManager', 'HRExecutive', 'hr'];

const EmployeeList = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState({});

    // Check if current user is HR
    const isHR = user && HR_ROLES.includes(user.role);

    const departments = ['all', 'Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // Fetch employees and today's attendance in parallel
            const [employeesRes, attendanceRes] = await Promise.all([
                api.get('/employees'),
                api.get('/attendance', {
                    params: {
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear()
                    }
                }).catch(() => ({ data: { records: [] } }))
            ]);

            // Build a map of today's attendance by employeeId
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const attendanceMap = {};
            (attendanceRes.data?.records || []).forEach(record => {
                const recordDate = new Date(record.date);
                const recordDateStr = recordDate.toISOString().split('T')[0];

                // Only consider today's records
                if (recordDateStr === todayStr) {
                    const empId = record.employeeId?._id || record.employeeId;
                    if (empId) {
                        attendanceMap[empId] = {
                            checkedIn: !!record.checkIn?.time,
                            checkedOut: !!record.checkOut?.time
                        };
                    }
                }
            });

            setTodayAttendance(attendanceMap);

            // Handle both nested (personalInfo) and flat (first_name) data structures
            const fetchedEmployees = employeesRes.data.employees.map(emp => {
                // Determine if data uses nested structure or flat structure
                const firstName = emp.personalInfo?.firstName || emp.first_name || '';
                const lastName = emp.personalInfo?.lastName || emp.last_name || '';
                const email = emp.contactInfo?.email || emp.work_email || '';
                const phone = emp.contactInfo?.phone || emp.phone_number || 'N/A';
                const department = emp.employmentInfo?.department || emp.employment_details?.department_id || 'Unknown';
                const designation = emp.employmentInfo?.designation || 'Employee';

                // Determine active status based on today's attendance
                // Active = checked in but NOT checked out (currently working)
                const attendance = attendanceMap[emp._id];
                const isCurrentlyActive = attendance?.checkedIn && !attendance?.checkedOut;

                return {
                    id: emp._id,
                    name: `${firstName} ${lastName}`.trim() || 'Unknown',
                    email: email,
                    phone: phone,
                    department: department,
                    designation: designation,
                    employeeStatus: emp.status || 'active', // Original employee record status
                    workingStatus: isCurrentlyActive ? 'active' : 'inactive', // Real-time working status
                    avatar: firstName && lastName ? `${firstName[0]}${lastName[0]}` : '??'
                };
            });

            setEmployees(fetchedEmployees);
            setPagination(employeesRes.data.pagination);
        } catch (error) {
            toast.error('Failed to fetch employees');
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (e, employee) => {
        e.preventDefault(); // Prevent navigation to employee details
        e.stopPropagation();
        setEmployeeToDelete(employee);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;

        try {
            setDeleting(true);
            await api.delete(`/employees/${employeeToDelete.id}`);
            toast.success(`${employeeToDelete.name} has been removed successfully`);
            setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
            setShowDeleteModal(false);
            setEmployeeToDelete(null);
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error(error.response?.data?.message || 'Failed to delete employee');
        } finally {
            setDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setEmployeeToDelete(null);
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Employees</h1>
                    <p className="text-secondary-500 mt-1">Manage your organization's workforce</p>
                </div>
                {isHR && (
                    <Link to="/employees/add" className="btn-primary">
                        <HiOutlinePlus className="w-5 h-5" />
                        Add Employee
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
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="relative group">
                            <HiOutlineFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500 group-focus-within:text-primary-600 transition-colors z-10" />
                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="input pl-12 pr-10 appearance-none cursor-pointer"
                            >
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>
                                        {dept === 'all' ? 'All Departments' : dept}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-secondary-200"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-secondary-100">
                                <div className="h-3 bg-secondary-200 rounded w-full mb-2"></div>
                                <div className="h-3 bg-secondary-200 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee) => (
                        <div
                            key={employee.id}
                            className="card p-6 hover:shadow-card-hover transition-all group relative"
                        >
                            <Link
                                to={`/employees/${employee.id}`}
                                className="block"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                                            {employee.avatar}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                                                {employee.name}
                                            </h3>
                                            <p className="text-sm text-secondary-500">{employee.designation}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-secondary-100">
                                    <div className="flex items-center gap-2 text-sm text-secondary-600 mb-2">
                                        <HiOutlineMail className="w-4 h-4" />
                                        {employee.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <HiOutlinePhone className="w-4 h-4" />
                                        {employee.phone}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <span className="badge-info">{employee.department}</span>
                                    <span className={`badge ${employee.workingStatus === 'active' ? 'badge-success' : 'badge-gray'}`}>
                                        {employee.workingStatus === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </Link>

                            {/* Delete button - Only visible to HR */}
                            {isHR && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, employee)}
                                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-red-50 text-secondary-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete Employee"
                                >
                                    <HiOutlineTrash className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredEmployees.length === 0 && (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center">
                        <HiOutlineSearch className="w-8 h-8 text-secondary-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-secondary-900">No employees found</h3>
                    <p className="mt-2 text-secondary-500">Try adjusting your search or filter criteria</p>
                </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-500">
                    Showing {filteredEmployees.length} of {employees.length} employees
                </p>
                <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" disabled>Previous</button>
                    <button className="btn-secondary btn-sm">Next</button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content p-8">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100/50 rounded-full mb-6">
                            <HiOutlineExclamation className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-secondary-900 mb-2">
                            Delete Employee
                        </h3>
                        <p className="text-center text-secondary-600 mb-8">
                            Are you sure you want to delete <strong>{employeeToDelete?.name}</strong>?
                            This action cannot be undone and will also remove their login credentials.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={handleCancelDelete}
                                className="flex-1 btn-secondary"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 btn-danger shadow-red-500/20"
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Deleting...
                                    </div>
                                ) : (
                                    'Delete Employee'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
