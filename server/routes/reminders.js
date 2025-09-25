import express from 'express';
import { ReminderModel } from '../models/Reminder.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Get all reminders
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, active_only } = req.query;
        let reminders;
        if (req.user.role === 'admin') {
            // Admin sees all reminders
            if (active_only === 'true') {
                reminders = await ReminderModel.findActive();
            }
            else {
                reminders = await ReminderModel.findAll(parseInt(limit), parseInt(offset));
            }
        }
        else {
            // Regular users see only reminders they created or from their client
            reminders = await ReminderModel.findByUserOrClient(req.user.id, req.user.client_id);
        }
        res.json({ reminders, total: reminders.length });
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});
// Get reminder by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const reminder = await ReminderModel.findById(parseInt(id));
        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        res.json({ reminder });
    }
    catch (error) {
        console.error('Error fetching reminder:', error);
        res.status(500).json({ error: 'Failed to fetch reminder' });
    }
});
// Create new reminder
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { customer_id, customer_name, title, description, reminder_date, reminder_time, advance_notice } = req.body;
        // Validate required fields
        if (!customer_name || !title || !reminder_date || !reminder_time) {
            return res.status(400).json({ error: 'Missing required fields: customer_name, title, reminder_date, reminder_time' });
        }
        // If customer_id is provided, validate it exists
        if (customer_id) {
            const { query } = await import('../database/connection.js');
            const customerCheck = await query('SELECT id FROM customers WHERE id = $1', [customer_id]);
            if (customerCheck.rows.length === 0) {
                return res.status(400).json({ error: `Customer with ID ${customer_id} does not exist` });
            }
        }
        const reminderData = {
            customer_id,
            customer_name,
            title,
            description,
            reminder_date,
            reminder_time,
            advance_notice: advance_notice || 1440,
            created_by: req.user.id
        };
        const reminder = await ReminderModel.create(reminderData);
        res.status(201).json({ reminder });
    }
    catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});
// Update reminder
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const reminder = await ReminderModel.update(parseInt(id), updates);
        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        res.json({ reminder });
    }
    catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({ error: 'Failed to update reminder' });
    }
});
// Delete reminder
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ReminderModel.delete(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        res.json({ message: 'Reminder deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});
// Get reminders by customer
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;
        const reminders = await ReminderModel.findByCustomerId(parseInt(customerId));
        res.json({ reminders });
    }
    catch (error) {
        console.error('Error fetching reminders by customer:', error);
        res.status(500).json({ error: 'Failed to fetch reminders by customer' });
    }
});
// Get due reminders
router.get('/due/now', authenticateToken, async (req, res) => {
    try {
        const reminders = await ReminderModel.findDue();
        res.json({ reminders });
    }
    catch (error) {
        console.error('Error fetching due reminders:', error);
        res.status(500).json({ error: 'Failed to fetch due reminders' });
    }
});
// Mark reminder as notified
router.patch('/:id/notified', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await ReminderModel.markAsNotified(parseInt(id));
        if (!success) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        res.json({ message: 'Reminder marked as notified' });
    }
    catch (error) {
        console.error('Error marking reminder as notified:', error);
        res.status(500).json({ error: 'Failed to mark reminder as notified' });
    }
});
export default router;
