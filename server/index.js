import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { validateInput, securityHeaders, preventHPP, corsOptions, addRequestId, logSecurityEvent } from './middleware/security.js';
import { testConnection, initializeDatabase, closePool } from './database/connection.js';
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

// Health checks (these don't need database)
app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
    res.status(200).json({ ready: true });
});

// API placeholder route (doesn't need database)
app.get('/api/hello', (_req, res) => {
    res.json({ message: 'API is running' });
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

        // Initialize database schema FIRST
        await initializeDatabase();
        console.log('✅ Database initialized successfully');

        // NOW import and add all routes that need database access
        const authRoutes = (await import('./routes/auth.js')).default;
        const leadsRoutes = (await import('./routes/leads.js')).default;
        const tasksRoutes = (await import('./routes/tasks.js')).default;
        const remindersRoutes = (await import('./routes/reminders.js')).default;
        const calendarRoutes = (await import('./routes/calendar.js')).default;
        const { createUnifiedEventsRoutes } = await import('./routes/unified-events.js');
        const attendanceRoutes = (await import('./routes/attendance.js')).default;
        const systemClientsRoutes = (await import('./routes/system-clients.js')).default;
        const usersRoutes = (await import('./routes/users.js')).default;
        const customersRoutes = (await import('./routes/customers.js')).default;
        const reportsRoutes = (await import('./routes/reports.js')).default;
        const cleanupRoutes = (await import('./routes/cleanup.js')).default;
        const whatsappRoutes = (await import('./routes/whatsapp.js')).default;

        // Add API routes AFTER database is initialized
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
        app.use('/api/unified-events', createUnifiedEventsRoutes());

        // Serve static frontend from dist in production
        const distPath = path.resolve(__dirname, '../../dist');
        app.use(express.static(distPath));

        // SPA fallback to index.html
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api')) return next();
            res.sendFile(path.join(distPath, 'index.html'));
        });

        // Basic error handler
        app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Start cleanup jobs
        CleanupJobs.start();

        // Start server
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
            console.log(`📊 Database connected successfully`);
            console.log(`🔐 Auth endpoints available at /api/auth`);
            console.log(`🧹 Cleanup jobs started`);
        });

    } catch (error) {
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
