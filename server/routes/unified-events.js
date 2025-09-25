import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { UnifiedEventModel } from '../models/UnifiedEvent.js';
const router = express.Router();
export function createUnifiedEventsRoutes() {
    // Get all events for authenticated user
    // @ts-ignore
    router.get('/', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const { type, start_date, end_date } = req.query;
            console.log('🔍 Server: Fetching events for userId:', userId, 'type:', type, 'userId type:', typeof userId);
            let events;
            if (type) {
                // Get events by type
                events = await UnifiedEventModel.getEventsByType(userId, type);
                console.log('🔍 Server: getEventsByType result:', events.length, 'events');
            }
            else if (start_date && end_date) {
                // Get events by date range
                events = await UnifiedEventModel.getEventsByDateRange(userId, start_date, end_date);
                console.log('🔍 Server: getEventsByDateRange result:', events.length, 'events');
            }
            else {
                // Get all events
                events = await UnifiedEventModel.getEventsByUser(userId);
                console.log('🔍 Server: getEventsByUser result:', events.length, 'events');
            }
            console.log('🔍 Server: Final events to send:', events);
            res.json({ events });
        }
        catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ error: 'שגיאה בטעינת האירועים' });
        }
    });
    // Get events for notifications (reminders only)
    // @ts-ignore
    router.get('/notifications', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const events = await UnifiedEventModel.getEventsForNotification(userId);
            res.json({ events });
        }
        catch (error) {
            console.error('Error fetching events for notifications:', error);
            res.status(500).json({ error: 'שגיאה בטעינת אירועים להתראות' });
        }
    });
    // Get specific event by ID
    // @ts-ignore
    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const eventId = parseInt(req.params.id);
            if (isNaN(eventId)) {
                return res.status(400).json({ error: 'מזהה אירוע לא תקין' });
            }
            const event = await UnifiedEventModel.getEventById(userId, eventId);
            if (!event) {
                return res.status(404).json({ error: 'אירוע לא נמצא' });
            }
            res.json({ event });
        }
        catch (error) {
            console.error('Error fetching event:', error);
            res.status(500).json({ error: 'שגיאה בטעינת האירוע' });
        }
    });
    // Create new event
    // @ts-ignore
    router.post('/', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const eventData = req.body;
            // Validate required fields
            if (!eventData.title || !eventData.eventType || !eventData.startTime || !eventData.endTime) {
                return res.status(400).json({
                    error: 'נא למלא את כל השדות הנדרשים: כותרת, סוג אירוע, זמן התחלה וזמן סיום'
                });
            }
            // Validate event type
            const validTypes = ['reminder', 'meeting', 'lead', 'task'];
            if (!validTypes.includes(eventData.eventType)) {
                return res.status(400).json({
                    error: 'סוג אירוע לא תקין. סוגים מותרים: reminder, meeting, lead, task'
                });
            }
            const event = await UnifiedEventModel.createEvent(userId, eventData);
            res.status(201).json({ event });
        }
        catch (error) {
            console.error('Error creating event:', error);
            res.status(500).json({ error: 'שגיאה ביצירת האירוע' });
        }
    });
    // Update event
    // @ts-ignore
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const eventId = parseInt(req.params.id);
            const updates = req.body;
            if (isNaN(eventId)) {
                return res.status(400).json({ error: 'מזהה אירוע לא תקין' });
            }
            // Validate event type if provided
            if (updates.eventType) {
                const validTypes = ['reminder', 'meeting', 'lead', 'task'];
                if (!validTypes.includes(updates.eventType)) {
                    return res.status(400).json({
                        error: 'סוג אירוע לא תקין. סוגים מותרים: reminder, meeting, lead, task'
                    });
                }
            }
            const event = await UnifiedEventModel.updateEvent(userId, eventId, updates);
            res.json({ event });
        }
        catch (error) {
            console.error('Error updating event:', error);
            if (error instanceof Error && error.message === 'Event not found or access denied') {
                res.status(404).json({ error: 'אירוע לא נמצא או אין הרשאה לעריכה' });
            }
            else {
                res.status(500).json({ error: 'שגיאה בעדכון האירוע' });
            }
        }
    });
    // Delete event
    // @ts-ignore
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const eventId = parseInt(req.params.id);
            if (isNaN(eventId)) {
                return res.status(400).json({ error: 'מזהה אירוע לא תקין' });
            }
            const deleted = await UnifiedEventModel.deleteEvent(userId, eventId);
            if (!deleted) {
                return res.status(404).json({ error: 'אירוע לא נמצא או אין הרשאה למחיקה' });
            }
            res.json({ message: 'האירוע נמחק בהצלחה' });
        }
        catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({ error: 'שגיאה במחיקת האירוע' });
        }
    });
    // Mark reminder as notified
    // @ts-ignore
    router.patch('/:id/notified', authenticateToken, async (req, res) => {
        try {
            const userId = parseInt(req.user.id);
            const eventId = parseInt(req.params.id);
            if (isNaN(eventId)) {
                return res.status(400).json({ error: 'מזהה אירוע לא תקין' });
            }
            const updated = await UnifiedEventModel.markAsNotified(userId, eventId);
            if (!updated) {
                return res.status(404).json({ error: 'אירוע לא נמצא או אינו מסוג תזכורת' });
            }
            res.json({ message: 'התזכורת סומנה כמועברת' });
        }
        catch (error) {
            console.error('Error marking event as notified:', error);
            res.status(500).json({ error: 'שגיאה בעדכון התזכורת' });
        }
    });
    return router;
}
