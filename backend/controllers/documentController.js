import Document from '../models/Document.js';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import stream from 'stream';
import fs from 'fs';

// Ensure environment variables are loaded so MONGODB_URI is available
dotenv.config();

let gridfsBucket;
const getGridFSBucket = () => {
    if (gridfsBucket) return gridfsBucket;
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
        return gridfsBucket;
    }
    return null;
};

// Configure multer to use memory buffer
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /pdf|doc|docx|jpg|jpeg|png|gif/i;
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

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

        // HR and admin roles can see all documents
        const hrRoles = ['admin', 'HRManager', 'HRExecutive', 'SuperAdmin'];
        if (!hrRoles.includes(req.user.role)) {
            if (req.user.employeeId) {
                query.employeeId = req.user.employeeId;
            } else {
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
        let docEmployeeId = employeeId || req.user.employeeId || null;

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);

        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ message: 'Database file stream not initialized' });
        }

        const uploadStream = bucket.openUploadStream(filename, {
            contentType: req.file.mimetype,
            metadata: {
                originalname: req.file.originalname
            }
        });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(uploadStream);

        uploadStream.on('error', (error) => {
            return res.status(500).json({ message: 'Error uploading stream to GridFS', error: error.message });
        });

        uploadStream.on('finish', async () => {
            try {
                const document = await Document.create({
                    employeeId: docEmployeeId,
                    documentType,
                    category: category || 'General',
                    title,
                    description,
                    fileName: filename,
                    originalName: req.file.originalname,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    fileUrl: `/api/documents/files/${filename}`,
                    isConfidential: isConfidential === 'true',
                    validFrom,
                    validUntil,
                    tags: tags ? tags.split(',').map(t => t.trim()) : [],
                    accessibleBy: ['hr', 'admin'],
                    uploadedBy: req.user._id
                });
                return res.status(201).json({ message: 'Document uploaded successfully', document });
            } catch (err) {
                return res.status(500).json({ message: 'Error creating document record', error: err.message });
            }
        });

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
// @access  Private
export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const hrRoles = ['admin', 'HRManager', 'HRExecutive', 'SuperAdmin'];
        const isOwner = document.uploadedBy && document.uploadedBy.toString() === req.user._id.toString();

        if (!hrRoles.includes(req.user.role) && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to delete this document' });
        }

        // Delete from GridFS
        const bucket = getGridFSBucket();
        if (bucket && document.fileName && !document.fileUrl?.startsWith('/uploads/')) {
            const files = await mongoose.connection.db.collection('uploads.files')
                .find({ filename: document.fileName }).toArray();
            if (files.length > 0) {
                await bucket.delete(files[0]._id);
            }
        } else if (document.fileUrl?.startsWith('/uploads/')) {
            // Delete local file
            const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Document.findByIdAndDelete(req.params.id);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
};

// @desc    Verify document
// @route   PUT /api/documents/:id/verify
// @access  Private
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

        if (document.fileUrl && document.fileUrl.startsWith('/uploads/') && !document.fileUrl.includes('/api/')) {
            const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);
            if (fs.existsSync(filePath)) {
                res.set('Content-Type', document.fileType || 'application/octet-stream');
                res.set('Content-Disposition', `attachment; filename="${document.originalName}"`);
                return res.download(filePath, document.originalName);
            }
        }

        const bucket = getGridFSBucket();
        if (bucket) {
            res.set('Content-Type', document.fileType || 'application/octet-stream');
            res.set('Content-Disposition', `attachment; filename="${document.originalName}"`);

            const downloadStream = bucket.openDownloadStreamByName(document.fileName);
            downloadStream.on('error', () => {
                res.status(404).json({ message: 'File stream not found in DB' })
            });
            downloadStream.pipe(res);
        } else {
            res.status(500).json({ message: 'Database file stream not initialized' });
        }
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

        const contentType = document.fileType || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

        if (document.fileUrl && document.fileUrl.startsWith('/uploads/') && !document.fileUrl.includes('/api/')) {
            const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);
            if (fs.existsSync(filePath)) {
                const fileStream = fs.createReadStream(filePath);
                return fileStream.pipe(res);
            }
        }

        const bucket = getGridFSBucket();
        if (bucket) {
            const downloadStream = bucket.openDownloadStreamByName(document.fileName);
            downloadStream.on('error', () => {
                res.status(404).json({ message: 'File stream not found in DB' })
            });
            downloadStream.pipe(res);
        } else {
            res.status(500).json({ message: 'Database file stream not initialized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error viewing document', error: error.message });
    }
};

// @desc    Serve file directly by filename
// @route   GET /api/documents/files/:filename
// @access  Private
export const serveFileByName = async (req, res) => {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ message: 'Database file stream not initialized' });
        }

        const files = await mongoose.connection.db.collection('uploads.files').find({ filename: req.params.filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.setHeader('Content-Type', files[0].contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${files[0].filename}"`);

        const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
        downloadStream.on('error', () => {
            res.status(404).json({ message: 'Error streaming file' })
        });
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: 'Error serving file by name', error: error.message });
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
    serveFileByName,
    upload
};
