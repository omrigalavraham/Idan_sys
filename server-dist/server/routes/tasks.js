import express from 'express';
import { TaskModel } from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, status, assigned_to } = req.query;
        // Check user role for access control
        let tasks;
        if (req.user.role === 'admin') {
            // Admin can see all tasks
            if (status) {
                tasks = await TaskModel.findByStatus(status);
            }
            else if (assigned_to) {
                tasks = await TaskModel.findByAssignedTo(parseInt(assigned_to));
            }
            else {
                tasks = await TaskModel.findAll(parseInt(limit), parseInt(offset));
            }
        }
        else if (req.user.role === 'manager') {
            // Manager can see tasks assigned to their agents and themselves
            if (status) {
                const allTasks = await TaskModel.findByStatus(status);
                tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
            }
            else if (assigned_to) {
                // Manager can only see tasks assigned to themselves or their agents
                if (parseInt(assigned_to) === req.user.id) {
                    tasks = await TaskModel.findByAssignedTo(parseInt(assigned_to));
                }
                else {
                    // Check if the assigned user is an agent under this manager
                    // For now, allow manager to see tasks assigned to any user (can be refined later)
                    tasks = await TaskModel.findByAssignedTo(parseInt(assigned_to));
                }
            }
            else {
                const allTasks = await TaskModel.findAll(parseInt(limit), parseInt(offset));
                tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
            }
        }
        else {
            // Regular users (agents) see only their own tasks
            if (status) {
                const allTasks = await TaskModel.findByStatus(status);
                tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
            }
            else if (assigned_to) {
                // Only show tasks assigned to the current user
                if (parseInt(assigned_to) === req.user.id) {
                    tasks = await TaskModel.findByAssignedTo(parseInt(assigned_to));
                }
                else {
                    tasks = [];
                }
            }
            else {
                // Get tasks assigned to or created by the current user
                const allTasks = await TaskModel.findAll(parseInt(limit), parseInt(offset));
                tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
            }
        }
        res.json({ tasks, total: tasks.length });
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});
// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const task = await TaskModel.findById(parseInt(id));
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Check if user has permission to view this task
        if (task.assigned_to !== req.user.id && task.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ task });
    }
    catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});
// Create new task
router.post('/', authenticateToken, async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            created_by: req.user.id
        };
        const task = await TaskModel.create(taskData);
        res.status(201).json({ task });
    }
    catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});
// Update task
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // First check if task exists and user has permission
        const existingTask = await TaskModel.findById(parseInt(id));
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Check if user has permission to update this task
        if (existingTask.assigned_to !== req.user.id && existingTask.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const task = await TaskModel.update(parseInt(id), updates);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ task });
    }
    catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});
// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // First check if task exists and user has permission
        const existingTask = await TaskModel.findById(parseInt(id));
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Check if user has permission to delete this task
        if (existingTask.assigned_to !== req.user.id && existingTask.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const deleted = await TaskModel.delete(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});
// Get tasks by lead
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
    try {
        const { leadId } = req.params;
        const allTasks = await TaskModel.findByLeadId(parseInt(leadId));
        // Filter tasks to only show those assigned to or created by the current user
        const tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
        res.json({ tasks });
    }
    catch (error) {
        console.error('Error fetching tasks by lead:', error);
        res.status(500).json({ error: 'Failed to fetch tasks by lead' });
    }
});
// Get tasks by customer
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;
        const allTasks = await TaskModel.findByCustomerId(parseInt(customerId));
        // Filter tasks to only show those assigned to or created by the current user
        const tasks = allTasks.filter(task => task.assigned_to === req.user.id || task.created_by === req.user.id);
        res.json({ tasks });
    }
    catch (error) {
        console.error('Error fetching tasks by customer:', error);
        res.status(500).json({ error: 'Failed to fetch tasks by customer' });
    }
});
export default router;
