const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with email, name, role
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            email: user.email,
            name: user.name,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
function extractToken(req) {
    // Try Authorization header first
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    // Also check for token in query string (fallback)
    if (req.query && req.query.token) {
        return req.query.token;
    }
    
    return null;
}

module.exports = {
    generateToken,
    verifyToken,
    extractToken
};

