import jwt from 'jsonwebtoken';
import { query } from '../database/connection.js';
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const sessionToken = req.headers['x-session-token'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        console.log('Auth middleware - Headers:', {
            authorization: authHeader,
            sessionToken: sessionToken,
            userAgent: req.headers['user-agent']
        });
        if (!token) {
            console.log('Auth middleware - No access token provided');
            return res.status(401).json({ error: 'Access token required' });
        }
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Auth middleware - Decoded token:', { userId: decoded.userId, email: decoded.email });
        // Get user from database (excluding soft deleted)
        const result = await query('SELECT id, email, role, is_active, client_id FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.userId]);
        if (result.rows.length === 0) {
            console.log('Auth middleware - User not found for ID:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        console.log('Auth middleware - User found:', { id: user.id, email: user.email, role: user.role });
        if (!user.is_active) {
            console.log('Auth middleware - User account inactive:', user.id);
            return res.status(401).json({ error: 'User account is inactive' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            client_id: user.client_id
        };
        console.log('Auth middleware - Authentication successful for user:', user.id);
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// Helper function to create authenticated route handlers
export const withAuth = (handler) => {
    return (req, res, next) => {
        authenticateToken(req, res, (err) => {
            if (err)
                return next(err);
            handler(req, res);
        });
    };
};
