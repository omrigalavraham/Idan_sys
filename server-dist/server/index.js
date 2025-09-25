import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { validateInput, securityHeaders, preventHPP, corsOptions, addRequestId, logSecurityEvent } from './middleware/security.js';
import { testConnection, initializeDatabase, closePool } from './database/connection.js';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import tasksRoutes from './routes/tasks.js';
import remindersRoutes from './routes/reminders.js';
import calendarRoutes from './routes/calendar.js';
import { createUnifiedEventsRoutes } from './routes/unified-events.js';
import attendanceRoutes from './routes/attendance.js';
import systemClientsRoutes from './routes/system-clients.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';
import reportsRoutes from './routes/reports.js';
import cleanupRoutes from './routes/cleanup.js';
import whatsappRoutes from './routes/whatsapp.js';
import { CleanupJobs } from './jobs/cleanupJobs.js';
// Load environment variables
dotenv.config();
// __dirname emulation for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Trust proxy if behind a load balancer (Render/Heroku/NGINX)
app.set('trust proxy', 1);
// Core middlewares
app.use(addRequestId);
app.use(securityHeaders);
app.use(preventHPP);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(validateInput);
app.use(logSecurityEvent);
// Health checks
app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/readyz', (_req, res) => {
    res.status(200).json({ ready: true });
});
// Removed insecure public endpoints for deleted users
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/system-clients', systemClientsRoutes);
app.use('/api/clients', systemClientsRoutes); // Alias for frontend compatibility
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
// API placeholder route
app.get('/api/hello', (_req, res) => {
    res.json({ message: 'API is running' });
});
// Serve static frontend from dist in production
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
// SPA fallback to index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api'))
        return next();
    res.sendFile(path.join(distPath, 'index.html'));
});
// Basic error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }
        // Initialize database schema
        await initializeDatabase();
        // Add unified events routes after database initialization
        app.use('/api/unified-events', createUnifiedEventsRoutes());
        // Start cleanup jobs
        CleanupJobs.start();
        // Start server
        app.listen(PORT, HOST, () => {
            // eslint-disable-next-line no-console
            console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
            console.log(`📊 Database connected successfully`);
            console.log(`🔐 Auth endpoints available at /api/auth`);
            console.log(`🧹 Cleanup jobs started`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    CleanupJobs.stop();
    await closePool();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    CleanupJobs.stop();
    await closePool();
    process.exit(0);
});
startServer();
