import express from 'express';
import { CalendarEventModel } from '../models/CalendarEvent.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Get all calendar events
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, event_type, limit = 100, offset = 0 } = req.query;
        let events;
        if (req.user.role === 'admin') {
            // Admin sees all events
            if (start_date && end_date) {
                events = await CalendarEventModel.findByDateRange(new Date(start_date), new Date(end_date));
            }
            else if (event_type) {
                events = await CalendarEventModel.findByType(event_type);
            }
            else {
                events = await CalendarEventModel.findAll(parseInt(limit), parseInt(offset));
            }
        }
        else {
            // Regular users see only events they created or from their client
            events = await CalendarEventModel.findByUserOrClient(req.user.id, req.user.client_id);
        }
        res.json({ events, total: events.length });
    }
    catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});
// Get event by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const event = await CalendarEventModel.findById(parseInt(id));
        if (!event) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }
        res.json({ event });
    }
    catch (error) {
        console.error('Error fetching calendar event:', error);
        res.status(500).json({ error: 'Failed to fetch calendar event' });
    }
});
// Create new calendar event
router.post('/', authenticateToken, async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            created_by: req.user.id
        };
        const event = await CalendarEventModel.create(eventData);
        res.status(201).json({ event });
    }
    catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ error: 'Failed to create calendar event' });
    }
});
// Update calendar event
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const event = await CalendarEventModel.update(parseInt(id), updates);
        if (!event) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }
        res.json({ event });
    }
    catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ error: 'Failed to update calendar event' });
    }
});
// Delete calendar event
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CalendarEventModel.delete(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ error: 'Calendar event not found' });
        }
        res.json({ message: 'Calendar event deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ error: 'Failed to delete calendar event' });
    }
});
// Get events by lead
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
    try {
        const { leadId } = req.params;
        const events = await CalendarEventModel.findByLeadId(parseInt(leadId));
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching events by lead:', error);
        res.status(500).json({ error: 'Failed to fetch events by lead' });
    }
});
// Get events by customer
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;
        const events = await CalendarEventModel.findByCustomerId(parseInt(customerId));
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching events by customer:', error);
        res.status(500).json({ error: 'Failed to fetch events by customer' });
    }
});
// Get events by user
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const events = await CalendarEventModel.findByCreatedBy(parseInt(userId));
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching events by user:', error);
        res.status(500).json({ error: 'Failed to fetch events by user' });
    }
});
// Get today's events
router.get('/today/all', authenticateToken, async (req, res) => {
    try {
        const events = await CalendarEventModel.findToday();
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching today\'s events:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s events' });
    }
});
export default router;
