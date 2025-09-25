import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { CleanupJobs } from '../jobs/cleanupJobs.js';

const router = express.Router();

// Define a type for Authenticated Request
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: 'admin' | 'manager' | 'agent';
  };
}

// Get cleanup status (admin only)
// @ts-ignore
router.get('/status', authenticateToken, async (req: any, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const status = CleanupJobs.getStatus();
    
    res.json(status);
  } catch (error: any) {
    console.error('Error getting cleanup status:', error);
    res.status(500).json({ error: 'Failed to get cleanup status' });
  }
});

// Manually trigger cleanup (admin only)
// @ts-ignore
router.post('/trigger', authenticateToken, async (req: any, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await CleanupJobs.triggerCleanup();
    
    res.json({
      message: 'Cleanup completed successfully',
      ...result
    });
  } catch (error: any) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to trigger cleanup',
      details: error.message 
    });
  }
});

// Start cleanup jobs (admin only)
// @ts-ignore
router.post('/start', authenticateToken, async (req: any, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    CleanupJobs.start();
    
    res.json({ 
      message: 'Cleanup jobs started successfully'
    });
  } catch (error: any) {
    console.error('Error starting cleanup jobs:', error);
    res.status(500).json({ error: 'Failed to start cleanup jobs' });
  }
});

// Stop cleanup jobs (admin only)
// @ts-ignore
router.post('/stop', authenticateToken, async (req: any, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    CleanupJobs.stop();
    
    res.json({ 
      message: 'Cleanup jobs stopped successfully'
    });
  } catch (error: any) {
    console.error('Error stopping cleanup jobs:', error);
    res.status(500).json({ error: 'Failed to stop cleanup jobs' });
  }
});

export default router;
