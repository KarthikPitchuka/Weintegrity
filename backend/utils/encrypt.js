import crypto from 'crypto';
import config from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derive encryption key from secret
 */
const deriveKey = (salt) => {
    return crypto.pbkdf2Sync(
        config.encryptionSecret,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        'sha512'
    );
};

/**
 * Encrypt sensitive data
 * @param {string} plaintext - The text to encrypt
 * @returns {string} - Encrypted data as base64 string
 */
export const encrypt = (plaintext) => {
    try {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = deriveKey(salt);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        // Combine salt, iv, tag, and encrypted data
        const combined = Buffer.concat([
            salt,
            iv,
            tag,
            Buffer.from(encrypted, 'hex')
        ]);

        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - The encrypted base64 string
 * @returns {string} - Decrypted plaintext
 */
export const decrypt = (encryptedData) => {
    try {
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract salt, iv, tag, and encrypted data
        const salt = combined.subarray(0, SALT_LENGTH);
        const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

        const key = deriveKey(salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

/**
 * Hash data (one-way, for comparisons)
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
export const hash = (data) => {
    return crypto
        .createHmac('sha256', config.encryptionSecret)
        .update(data)
        .digest('hex');
};

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Random token as hex string
 */
export const generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Mask sensitive data for display
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of characters to show at the end
 * @returns {string} - Masked data
 */
export const maskData = (data, visibleChars = 4) => {
    if (!data || data.length <= visibleChars) return data;

    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);

    return masked + visible;
};

export default { encrypt, decrypt, hash, generateToken, maskData };
