import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_management',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'default_secret_change_me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // Encryption
    encryptionSecret: process.env.ENCRYPTION_SECRET || 'default_encryption_key_32_chars!',

    // Email
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },

    // File Upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    uploadPath: process.env.UPLOAD_PATH || './uploads'
};

export default config;
