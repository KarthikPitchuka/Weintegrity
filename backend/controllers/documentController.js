import Document from '../models/Document.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
    fileFilter: (req, file, cb) => {
        // Allowed file extensions
        const allowedExtensions = /pdf|doc|docx|jpg|jpeg|png|gif/i;
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

        // Allowed mimetypes
        const allowedMimetypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif'
        ];
        const mimetypeValid = allowedMimetypes.includes(file.mimetype);

        if (extname && mimetypeValid) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG, GIF'));
    }
});

// @desc    Get documents
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res) => {
    try {
        const { employeeId, documentType, status, page = 1, limit = 10 } = req.query;

        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (documentType) query.documentType = documentType;
        if (status) query.verificationStatus = status;

        // HR and admin roles can see all documents (including company-wide ones with null employeeId)
        const hrRoles = ['admin', 'HRManager', 'HRExecutive', 'SuperAdmin'];
        if (!hrRoles.includes(req.user.role)) {
            // Regular employees only see their own documents
            if (req.user.employeeId) {
                query.employeeId = req.user.employeeId;
            } else {
                // If no employeeId linked, show company-wide documents only
                query.employeeId = null;
            }
        }

        const documents = await Document.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('uploadedBy', 'firstName lastName')
            .populate('verifiedBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Document.countDocuments(query);

        res.json({
            documents,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents', error: error.message });
    }
};

// @desc    Get document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('employeeId', 'personalInfo employeeCode')
            .populate('uploadedBy', 'firstName lastName')
            .populate('verifiedBy', 'firstName lastName');

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.json({ document });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching document', error: error.message });
    }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private
export const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { employeeId, documentType, category, title, description, isConfidential, validFrom, validUntil, tags } = req.body;

        // Determine employeeId - use provided, fallback to user's linked employee, or leave null for company docs
        let docEmployeeId = employeeId || req.user.employeeId || null;

        const document = await Document.create({
            employeeId: docEmployeeId,
            documentType,
            category: category || 'General',
            title,
            description,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            fileUrl: `/uploads/${req.file.filename}`,
            isConfidential: isConfidential === 'true',
            validFrom,
            validUntil,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            accessibleBy: ['hr', 'admin'],
            uploadedBy: req.user._id
        });

        res.status(201).json({ message: 'Document uploaded successfully', document });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading document', error: error.message });
    }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.json({ message: 'Document updated successfully', document });
    } catch (error) {
        res.status(500).json({ message: 'Error updating document', error: error.message });
    }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (HR, Admin)
export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Permission check: HR/Admin can delete any. Employee can only delete their own.
        const hrRoles = ['admin', 'HRManager', 'HRExecutive', 'SuperAdmin'];
        const isOwner = document.uploadedBy && document.uploadedBy.toString() === req.user._id.toString();

        if (!hrRoles.includes(req.user.role) && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to delete this document' });
        }

        // Delete file from storage
        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Document.findByIdAndDelete(req.params.id);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
};

// @desc    Verify document
// @route   PUT /api/documents/:id/verify
// @access  Private (HR, Admin)
export const verifyDocument = async (req, res) => {
    try {
        const { status, notes } = req.body;

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid verification status' });
        }

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        document.verificationStatus = status;
        document.verifiedBy = req.user._id;
        document.verifiedOn = new Date();
        document.verificationNotes = notes;

        await document.save();

        res.json({ message: `Document ${status} successfully`, document });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying document', error: error.message });
    }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
export const downloadDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.download(filePath, document.originalName);
    } catch (error) {
        res.status(500).json({ message: 'Error downloading document', error: error.message });
    }
};

// @desc    View document (inline for browser)
// @route   GET /api/documents/:id/view
// @access  Private
export const viewDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Set content type based on file type
        const contentType = document.fileType || 'application/octet-stream';

        // Set headers for inline viewing
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: 'Error viewing document', error: error.message });
    }
};

export default {
    getDocuments,
    getDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    verifyDocument,
    downloadDocument,
    viewDocument,
    upload
};
