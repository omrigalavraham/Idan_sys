import express, { Response } from 'express';
import { SystemClientModel } from '../models/SystemClient.js';
import { authenticateToken, AuthenticatedRequest, withAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all system clients
router.get('/', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active_only, limit = '50', offset = '0' } = req.query;
    
    let clients;
    if (active_only === 'true') {
      clients = await SystemClientModel.findActive();
    } else {
      clients = await SystemClientModel.findAll(parseInt(limit as string as string), parseInt(offset as string as string));
    }
    
    res.json({ clients, total: clients.length });
  } catch (error) {
    console.error('Error fetching system clients:', error);
    res.status(500).json({ error: 'Failed to fetch system clients' });
  }
}));

// Get system client by ID
router.get('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = await SystemClientModel.findById(parseInt(id as string));
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Error fetching system client:', error);
    res.status(500).json({ error: 'Failed to fetch system client' });
  }
}));

// Create new system client
router.post('/', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can create system clients
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can create system clients' });
    }
    
    const client = await SystemClientModel.create(req.body);
    res.status(201).json({ client });
  } catch (error) {
    console.error('Error creating system client:', error);
    res.status(500).json({ error: 'Failed to create system client' });
  }
}));

// Update system client
router.put('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can update system clients
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can update system clients' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Route: Updating system client:', id, 'with data:', updates);
    
    const clientId = parseInt(id as string);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    const client = await SystemClientModel.update(clientId, updates);
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Error updating system client:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to update system client' });
  }
}));

// Delete system client (soft delete)
router.delete('/:id', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can delete system clients
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can delete system clients' });
    }
    
    const { id } = req.params;
    const deleted = await SystemClientModel.softDelete(parseInt(id as string));
    
    if (!deleted) {
      return res.status(404).json({ error: 'System client not found or already deleted' });
    }
    
    res.json({ message: 'System client deleted successfully' });
  } catch (error) {
    console.error('Error deleting system client:', error);
    res.status(500).json({ error: 'Failed to delete system client' });
  }
}));

// Activate system client
router.patch('/:id/activate', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can activate system clients
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can activate system clients' });
    }
    
    const { id } = req.params;
    const client = await SystemClientModel.activate(parseInt(id as string));
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Error activating system client:', error);
    res.status(500).json({ error: 'Failed to activate system client' });
  }
}));

// Deactivate system client
router.patch('/:id/deactivate', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can deactivate system clients
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can deactivate system clients' });
    }
    
    const { id } = req.params;
    const client = await SystemClientModel.deactivate(parseInt(id as string));
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Error deactivating system client:', error);
    res.status(500).json({ error: 'Failed to deactivate system client' });
  }
}));

// Get system client configuration (lead statuses, etc.)
router.get('/:id/config', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await SystemClientModel.getConfiguration(parseInt(id as string));
    
    if (!config) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ config });
  } catch (error) {
    console.error('Error fetching system client configuration:', error);
    res.status(500).json({ error: 'Failed to fetch system client configuration' });
  }
}));

// Update system client configuration
router.put('/:id/config', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can update configurations
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can update configurations' });
    }
    
    const { id } = req.params;
    const { lead_statuses, customer_statuses, payment_statuses, features, message_templates } = req.body;
    
    const client = await SystemClientModel.updateConfiguration(parseInt(id as string), {
      lead_statuses,
      customer_statuses,
      payment_statuses,
      features,
      message_templates
    });
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Error updating system client configuration:', error);
    res.status(500).json({ error: 'Failed to update system client configuration' });
  }
}));

// Get client features
router.get('/:id/features', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await SystemClientModel.getConfiguration(parseInt(id as string));
    
    if (!config) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ features: config.features });
  } catch (error) {
    console.error('Error fetching client features:', error);
    res.status(500).json({ error: 'Failed to fetch client features' });
  }
}));

// Update client features
router.put('/:id/features', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can update features
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can update features' });
    }
    
    const { id } = req.params;
    const { features } = req.body;
    
    const client = await SystemClientModel.updateConfiguration(parseInt(id as string), { features });
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ message: 'Client features updated successfully' });
  } catch (error) {
    console.error('Error updating client features:', error);
    res.status(500).json({ error: 'Failed to update client features' });
  }
}));

// Get workflow rules (placeholder - not implemented yet)
router.get('/:id/workflow', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Workflow rules not implemented yet
    res.json({ rules: [] });
  } catch (error) {
    console.error('Error fetching workflow rules:', error);
    res.status(500).json({ error: 'Failed to fetch workflow rules' });
  }
}));

// Update workflow rules (placeholder - not implemented yet)
router.put('/:id/workflow', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can update workflow rules
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can update workflow rules' });
    }
    
    const { id } = req.params;
    const { rules } = req.body;
    
    // Workflow rules not implemented yet
    res.json({ message: 'Workflow rules updated successfully' });
  } catch (error) {
    console.error('Error updating workflow rules:', error);
    res.status(500).json({ error: 'Failed to update workflow rules' });
  }
}));

// Get message templates
router.get('/:id/templates', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await SystemClientModel.getConfiguration(parseInt(id as string));
    
    if (!config) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ templates: config.message_templates });
  } catch (error) {
    console.error('Error fetching message templates:', error);
    res.status(500).json({ error: 'Failed to fetch message templates' });
  }
}));

// Update message templates
router.put('/:id/templates', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin users can update message templates
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can update message templates' });
    }
    
    const { id } = req.params;
    const { templates } = req.body;
    
    const client = await SystemClientModel.updateConfiguration(parseInt(id as string), { message_templates: templates });
    
    if (!client) {
      return res.status(404).json({ error: 'System client not found' });
    }
    
    res.json({ message: 'Message templates updated successfully' });
  } catch (error) {
    console.error('Error updating message templates:', error);
    res.status(500).json({ error: 'Failed to update message templates' });
  }
}));

// Clean up deleted system clients (admin only)
router.post('/cleanup-deleted', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const deletedCount = await SystemClientModel.cleanupDeletedClients();
    
    res.json({ 
      message: 'System clients cleanup completed successfully',
      deletedClients: deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up deleted system clients:', error);
    res.status(500).json({ error: 'Failed to cleanup deleted system clients' });
  }
}));

// Get count of system clients pending deletion (admin only)
router.get('/pending-deletion-count', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingCount = await SystemClientModel.getPendingDeletionCount();
    
    res.json({ 
      pendingDeletionCount: pendingCount
    });
  } catch (error) {
    console.error('Error getting pending deletion count:', error);
    res.status(500).json({ error: 'Failed to get pending deletion count' });
  }
}));

// Soft delete system client (admin only)
router.delete('/:id/soft', withAuth(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const clientId = parseInt(req.params.id as string);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const success = await SystemClientModel.softDelete(clientId);
    
    if (success) {
      res.json({ message: 'System client soft deleted successfully' });
    } else {
      res.status(404).json({ error: 'System client not found or already deleted' });
    }
  } catch (error) {
    console.error('Error soft deleting system client:', error);
    res.status(500).json({ error: 'Failed to soft delete system client' });
  }
}));

export default router;
