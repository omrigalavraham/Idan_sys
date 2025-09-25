import { Router } from 'express';
import { UserModel } from '../models/User.js';
import { SessionModel } from '../models/Session.js';
import { SystemClientModel } from '../models/SystemClient.js';
import { validateInput } from '../middleware/security.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
const router = Router();
// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
});
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});
// Register new user
router.post('/register', validateInput, async (req, res) => {
    try {
        // Validate input
        const validatedData = registerSchema.parse(req.body);
        const { email, password, first_name, last_name } = validatedData;
        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }
        // Create new user
        const user = await UserModel.create({
            email,
            password,
            first_name,
            last_name,
            role: 'agent'
        });
        // Create session
        const session = await SessionModel.create({
            user_id: user.id,
            device_fingerprint: req.headers['x-device-fingerprint'],
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            expires_in_hours: 24
        });
        // Return user data (without password) and session token
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                email_verified: user.email_verified,
                created_at: user.created_at
            },
            session_token: session.session_token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// Login user
router.post('/login', validateInput, async (req, res) => {
    try {
        // Validate input
        const validatedData = loginSchema.parse(req.body);
        const { email, password } = validatedData;
        // Verify user credentials
        const user = await UserModel.verifyPassword(email, password);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                error: 'Account is deactivated'
            });
        }
        // Create session
        const session = await SessionModel.create({
            user_id: user.id,
            device_fingerprint: req.headers['x-device-fingerprint'],
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            expires_in_hours: 24
        });
        if (!process.env.JWT_SECRET) {
            console.error('JWT secret is not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        // Generate JWT token
        const jwtToken = jwt.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Get client configuration - for non-admin users
        let clientConfig = null;
        if (user.role !== 'admin') {
            try {
                let clientId = user.client_id;
                // If user is an agent and has a manager, get manager's client configuration
                if (user.role === 'agent' && user.manager_id) {
                    const manager = await UserModel.findById(user.manager_id);
                    if (manager && manager.client_id) {
                        clientId = manager.client_id;
                    }
                }
                if (clientId) {
                    const client = await SystemClientModel.findById(clientId);
                    if (client) {
                        clientConfig = {
                            id: client.id,
                            name: client.name,
                            company_name: client.company_name,
                            lead_statuses: client.lead_statuses || [],
                            customer_statuses: client.customer_statuses || [],
                            payment_statuses: client.payment_statuses || [],
                            features: client.features || {},
                            message_templates: client.message_templates || []
                        };
                    }
                }
            }
            catch (error) {
                console.error('Error fetching client configuration:', error);
                // Continue without client config if there's an error
            }
        }
        // Return user data (without password), session token, JWT token, and client configuration
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                email_verified: user.email_verified,
                client_id: user.client_id,
                manager_id: user.manager_id,
                created_at: user.created_at
            },
            session_token: session.session_token,
            access_token: jwtToken,
            client_config: clientConfig
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// Logout user
router.post('/logout', async (req, res) => {
    try {
        const session_token = req.headers['x-session-token'];
        if (!session_token) {
            return res.status(400).json({
                error: 'Session token required'
            });
        }
        // Delete session
        const deleted = await SessionModel.delete(session_token);
        if (deleted) {
            res.json({ message: 'Logout successful' });
        }
        else {
            res.status(404).json({ error: 'Session not found' });
        }
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// Get current user
router.get('/me', async (req, res) => {
    try {
        const session_token = req.headers['x-session-token'];
        if (!session_token) {
            return res.status(401).json({
                error: 'Session token required'
            });
        }
        // Find session
        const session = await SessionModel.findByToken(session_token);
        if (!session) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }
        // Get user data
        const user = await UserModel.findById(session.user_id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        console.log(`Auth /me endpoint called for user ${user.id} (${user.role}), client_id: ${user.client_id}`);
        // Get client configuration - for non-admin users
        let clientConfig = null;
        if (user.role !== 'admin') {
            try {
                let clientId = user.client_id;
                console.log(`Getting client config for user ${user.id} (${user.role}), user.client_id: ${user.client_id}`);
                // If user is an agent and has a manager, get manager's client configuration
                if (user.role === 'agent' && user.manager_id) {
                    const manager = await UserModel.findById(user.manager_id);
                    if (manager && manager.client_id) {
                        clientId = manager.client_id;
                        console.log(`Agent using manager's client_id: ${clientId}`);
                    }
                }
                if (clientId) {
                    console.log(`Looking for client with ID: ${clientId}`);
                    const client = await SystemClientModel.findById(clientId);
                    console.log(`Found client:`, client ? { id: client.id, name: client.name, features: client.features } : 'null');
                    if (client) {
                        clientConfig = {
                            id: client.id,
                            name: client.name,
                            company_name: client.company_name,
                            lead_statuses: client.lead_statuses || [],
                            customer_statuses: client.customer_statuses || [],
                            payment_statuses: client.payment_statuses || [],
                            features: client.features || {},
                            message_templates: client.message_templates || []
                        };
                    }
                }
                else {
                    console.log(`No client_id found for user ${user.id} (${user.role})`);
                }
            }
            catch (error) {
                console.error('Error fetching client configuration:', error);
                // Continue without client config if there's an error
            }
        }
        console.log(`Returning client_config:`, clientConfig ? { id: clientConfig.id, features: clientConfig.features } : 'null');
        // Return user data (without password) and client configuration
        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                email_verified: user.email_verified,
                client_id: user.client_id,
                manager_id: user.manager_id,
                created_at: user.created_at
            },
            client_config: clientConfig
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// Verify session
router.get('/verify', async (req, res) => {
    try {
        const session_token = req.headers['x-session-token'];
        if (!session_token) {
            return res.status(401).json({
                error: 'Session token required'
            });
        }
        // Find session
        const session = await SessionModel.findByToken(session_token);
        if (!session) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }
        res.json({ valid: true });
    }
    catch (error) {
        console.error('Session verification error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
export default router;
