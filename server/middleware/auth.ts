import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection.js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: 'admin' | 'manager' | 'agent';
    client_id?: number;
  };
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const sessionToken = req.headers['x-session-token'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Minimal auth logs (avoid sensitive data)
    if (!process.env.JWT_SECRET) {
      console.error('JWT secret is not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Get user from database (excluding soft deleted)
    const result = await query(
      'SELECT id, email, role, is_active, client_id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      client_id: user.client_id
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper function to create authenticated route handlers
export const withAuth = (handler: (req: AuthenticatedRequest, res: Response) => Promise<any> | any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    authenticateToken(req, res, (err) => {
      if (err) return next(err);
      handler(req as AuthenticatedRequest, res);
    });
  };
};
