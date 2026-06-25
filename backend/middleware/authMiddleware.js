const { verifyToken, extractToken } = require('../utils/jwt');

/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticate = (req, res, next) => {
    try {
        // Log for debugging
        console.log('[Auth] Request headers:', {
            authorization: req.headers.authorization ? 'Bearer ***' : 'missing',
            'content-type': req.headers['content-type']
        });

        const token = extractToken(req);
        
        if (!token) {
            console.log('[Auth] No token found in request');
            return res.status(401).json({ message: 'No token provided. Please log in.' });
        }

        console.log('[Auth] Token extracted, verifying...');
        const decoded = verifyToken(token);
        console.log('[Auth] Token verified for user:', decoded.email, 'role:', decoded.role);
        
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        console.error('[Auth] Authentication error:', error.message);
        return res.status(401).json({ message: error.message || 'Invalid or expired token' });
    }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
};

module.exports = {
    authenticate,
    requireAdmin
};

