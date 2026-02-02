import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineEye,
    HiOutlineUpload,
    HiOutlineSearch,
    HiOutlineFolder,
    HiOutlinePlus,
    HiOutlineX,
    HiOutlineDocument,
    HiOutlineTrash
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DocumentList = () => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All Documents');
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [viewBlobUrl, setViewBlobUrl] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(null);

    const isHR = ['admin', 'HRManager', 'HRExecutive', 'SuperAdmin'].includes(user?.role);

    const [newItem, setNewItem] = useState({
        title: '',
        category: 'General',
        file: null
    });

    const categories = ['All Documents', 'Policy', 'Benefits', 'General'];
    const uploadCategories = ['Policy', 'Benefits', 'General', 'Personal', 'Other'];

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        return () => {
            if (viewBlobUrl) {
                window.URL.revokeObjectURL(viewBlobUrl);
            }
        };
    }, [viewBlobUrl]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/documents');
            // Ensure we handle both array response or object with documents array
            const docs = Array.isArray(response.data) ? response.data : (response.data.documents || []);
            setDocuments(docs);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to fetch documents');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setNewItem({ ...newItem, file: e.target.files[0] });
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newItem.file || !newItem.title) {
            toast.error('Please provide a title and select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', newItem.file);
        formData.append('title', newItem.title);
        formData.append('category', newItem.category);
        formData.append('documentType', 'other'); // Default type
        formData.append('isConfidential', false);

        setUploadLoading(true);
        try {
            await api.post('/documents', formData);
            toast.success('Document uploaded successfully');
            setShowUploadModal(false);
            setNewItem({ title: '', category: 'General', file: null });
            fetchDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload document');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleView = async (doc) => {
        setSelectedDocument(doc);
        setShowViewModal(true);
        setViewLoading(true);
        setViewBlobUrl(null);

        try {
            const response = await api.get(`/documents/${doc._id}/view`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
            setViewBlobUrl(url);
        } catch (error) {
            console.error('Error viewing document:', error);
            toast.error('Failed to load document preview');
        } finally {
            setViewLoading(false);
        }
    };

    const handleDownload = async (doc) => {
        try {
            toast.loading('Downloading...', { id: 'download' });

            // Use API to download with authentication
            const response = await api.get(`/documents/${doc._id}/download`, {
                responseType: 'blob'
            });

            // Create blob URL and trigger download
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.originalName || doc.title || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Document downloaded', { id: 'download' });
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download document', { id: 'download' });
        }
    };

    const handleDelete = async (doc) => {
        if (!window.confirm(`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`)) {
            return;
        }

        setDeleteLoading(doc._id);
        try {
            await api.delete(`/documents/${doc._id}`);
            toast.success('Document deleted successfully');
            fetchDocuments();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete document');
        } finally {
            setDeleteLoading(null);
        }
    };

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'All Documents' || (doc.category || 'General') === activeTab;
        return matchesSearch && matchesTab;
    });

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (filename) => {
        if (!filename) return <HiOutlineDocument className="w-5 h-5 text-gray-500" />;
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') return <HiOutlineDocumentText className="w-5 h-5 text-red-500" />;
        if (['doc', 'docx'].includes(ext)) return <HiOutlineDocumentText className="w-5 h-5 text-blue-500" />;
        if (['xls', 'xlsx'].includes(ext)) return <HiOutlineDocumentText className="w-5 h-5 text-green-500" />;
        return <HiOutlineDocument className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Documents</h1>
                    <p className="text-secondary-500 mt-1">Access important company documents and policies</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <HiOutlinePlus className="w-5 h-5" />
                        <span>Upload</span>
                    </button>
                </div>
            </div>

            {/* Folders/Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((folder, idx) => (
                    <div
                        key={idx}
                        onClick={() => setActiveTab(folder)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTab === folder
                            ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-primary-300 text-gray-600 hover:shadow-sm'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <HiOutlineFolder className={`w-6 h-6 ${activeTab === folder ? 'text-primary-600' : 'text-yellow-500'}`} />
                            <span className="font-medium">{folder}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Document List */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th className="text-left py-4 px-6 text-gray-500 font-medium bg-gray-50/50">Name</th>
                                <th className="text-left py-4 px-6 text-gray-500 font-medium bg-gray-50/50">Category</th>
                                <th className="text-left py-4 px-6 text-gray-500 font-medium bg-gray-50/50">Date Modified</th>
                                <th className="text-left py-4 px-6 text-gray-500 font-medium bg-gray-50/50">Size</th>
                                <th className="text-right py-4 px-6 text-gray-500 font-medium bg-gray-50/50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-gray-500">
                                        No documents found in this category.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map(doc => (
                                    <tr key={doc._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-white flex items-center justify-center transition-colors border border-gray-100 group-hover:border-gray-200">
                                                    {getFileIcon(doc.fileName)}
                                                </div>
                                                <span className="font-medium text-gray-900">{doc.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${doc.category === 'Policy' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                doc.category === 'Benefits' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                {doc.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-gray-500 text-sm">
                                            {doc.updatedAt ? format(new Date(doc.updatedAt), 'yyyy-MM-dd') : '-'}
                                        </td>
                                        <td className="py-4 px-6 text-gray-500 text-sm">{formatSize(doc.fileSize)}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleView(doc)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <HiOutlineEye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <HiOutlineDownload className="w-5 h-5" />
                                                </button>
                                                {(isHR || (doc.uploadedBy && (doc.uploadedBy._id === user._id || doc.uploadedBy === user._id))) && (
                                                    <button
                                                        onClick={() => handleDelete(doc)}
                                                        disabled={deleteLoading === doc._id}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deleteLoading === doc._id ? (
                                                            <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <HiOutlineTrash className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-scaleIn">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <HiOutlineX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="label">Document Title *</label>
                                <input
                                    type="text"
                                    value={newItem.title}
                                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Employee Handbook"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Category *</label>
                                <select
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                    className="input"
                                >
                                    {uploadCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">File *</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-primary-400 hover:bg-gray-50 transition-all cursor-pointer relative">
                                    <div className="space-y-1 text-center">
                                        <HiOutlineUpload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 hover:text-primary-500">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} required />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 5MB</p>
                                        {newItem.file && (
                                            <p className="text-sm text-primary-600 font-medium mt-2">Selected: {newItem.file.name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={uploadLoading} className="btn-primary">
                                    {uploadLoading ? 'Uploading...' : 'Upload Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Document Modal */}
            {showViewModal && selectedDocument && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-xl animate-scaleIn">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.title}</h3>
                                <p className="text-sm text-gray-500">
                                    {selectedDocument.originalName || selectedDocument.fileName} • {formatSize(selectedDocument.fileSize)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(selectedDocument)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                                    title="Download"
                                >
                                    <HiOutlineDownload className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewBlobUrl(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <HiOutlineX className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden bg-gray-50 relative">
                            {viewLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                </div>
                            ) : viewBlobUrl ? (
                                selectedDocument.fileType?.startsWith('image/') ? (
                                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                                        <img src={viewBlobUrl} alt={selectedDocument.title} className="max-w-full max-h-full object-contain shadow-sm rounded" />
                                    </div>
                                ) : selectedDocument.fileType === 'application/pdf' ? (
                                    <iframe
                                        src={viewBlobUrl}
                                        className="w-full h-full border-0"
                                        title={selectedDocument.title}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                        <HiOutlineDocument className="w-16 h-16 mb-2 opacity-50" />
                                        <p>Preview not available for this file type.</p>
                                        <button
                                            onClick={() => handleDownload(selectedDocument)}
                                            className="mt-4 btn-primary"
                                        >
                                            Download to View
                                        </button>
                                    </div>
                                )
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                    <HiOutlineDocument className="w-16 h-16 mb-2 opacity-50" />
                                    <p>Unable to preview this file type.</p>
                                    <button
                                        onClick={() => handleDownload(selectedDocument)}
                                        className="mt-4 btn-primary"
                                    >
                                        Download to View
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center text-sm text-gray-500">
                            <div>
                                Uploaded by {selectedDocument.uploadedBy?.firstName} {selectedDocument.uploadedBy?.lastName} on {selectedDocument.createdAt ? format(new Date(selectedDocument.createdAt), 'MMM dd, yyyy') : '-'}
                            </div>
                            {selectedDocument.description && (
                                <div className="max-w-md truncate" title={selectedDocument.description}>
                                    {selectedDocument.description}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentList;
