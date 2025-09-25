import * as express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { CleanupJobs } from '../jobs/cleanupJobs.js';
const router = express.Router();
// Get cleanup status (admin only)
// @ts-ignore
router.get('/status', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const status = CleanupJobs.getStatus();
        res.json(status);
    }
    catch (error) {
        console.error('Error getting cleanup status:', error);
        res.status(500).json({ error: 'Failed to get cleanup status' });
    }
});
// Manually trigger cleanup (admin only)
// @ts-ignore
router.post('/trigger', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await CleanupJobs.triggerCleanup();
        res.json({
            message: 'Cleanup completed successfully',
            ...result
        });
    }
    catch (error) {
        console.error('Error triggering cleanup:', error);
        res.status(500).json({
            error: 'Failed to trigger cleanup',
            details: error.message
        });
    }
});
// Start cleanup jobs (admin only)
// @ts-ignore
router.post('/start', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        CleanupJobs.start();
        res.json({
            message: 'Cleanup jobs started successfully'
        });
    }
    catch (error) {
        console.error('Error starting cleanup jobs:', error);
        res.status(500).json({ error: 'Failed to start cleanup jobs' });
    }
});
// Stop cleanup jobs (admin only)
// @ts-ignore
router.post('/stop', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        CleanupJobs.stop();
        res.json({
            message: 'Cleanup jobs stopped successfully'
        });
    }
    catch (error) {
        console.error('Error stopping cleanup jobs:', error);
        res.status(500).json({ error: 'Failed to stop cleanup jobs' });
    }
});
export default router;
