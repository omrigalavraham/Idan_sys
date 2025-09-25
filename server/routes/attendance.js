import express from 'express';
import { AttendanceModel } from '../models/Attendance.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Get all attendance records
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, start_date, end_date, limit = 50, offset = 0 } = req.query;
        let records;
        if (req.user.role === 'admin') {
            // Admin sees all attendance records
            if (user_id && start_date && end_date) {
                records = await AttendanceModel.findByUserAndDateRange(parseInt(user_id), new Date(start_date), new Date(end_date));
            }
            else if (user_id) {
                records = await AttendanceModel.findByUserId(parseInt(user_id));
            }
            else {
                records = await AttendanceModel.findAll(parseInt(limit), parseInt(offset));
            }
        }
        else {
            // Regular users see only their own attendance records
            if (start_date && end_date) {
                records = await AttendanceModel.findByUserAndDateRange(req.user.id, new Date(start_date), new Date(end_date));
            }
            else {
                records = await AttendanceModel.findByUserId(req.user.id);
            }
        }
        res.json({ records, total: records.length });
    }
    catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});
// Get attendance record by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const record = await AttendanceModel.findById(parseInt(id));
        if (!record) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json({ record });
    }
    catch (error) {
        console.error('Error fetching attendance record:', error);
        res.status(500).json({ error: 'Failed to fetch attendance record' });
    }
});
// Clock in
router.post('/clock-in', authenticateToken, async (req, res) => {
    try {
        const { notes } = req.body;
        const userId = req.user.id;
        // Check if user already clocked in today
        const existingRecord = await AttendanceModel.findTodayRecord(userId);
        if (existingRecord && !existingRecord.clock_out) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }
        const record = await AttendanceModel.clockIn(userId, notes);
        res.status(201).json({ record });
    }
    catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ error: 'Failed to clock in' });
    }
});
// Clock out
router.patch('/clock-out', authenticateToken, async (req, res) => {
    try {
        const { notes } = req.body;
        const userId = req.user.id;
        const record = await AttendanceModel.clockOut(userId, notes);
        if (!record) {
            return res.status(400).json({ error: 'No active clock-in record found for today' });
        }
        res.json({ record });
    }
    catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ error: 'Failed to clock out' });
    }
});
// Update attendance record
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const record = await AttendanceModel.update(parseInt(id), updates);
        if (!record) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json({ record });
    }
    catch (error) {
        console.error('Error updating attendance record:', error);
        res.status(500).json({ error: 'Failed to update attendance record' });
    }
});
// Delete attendance record
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await AttendanceModel.delete(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json({ message: 'Attendance record deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting attendance record:', error);
        res.status(500).json({ error: 'Failed to delete attendance record' });
    }
});
// Get current user's today record
router.get('/today/current', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const record = await AttendanceModel.findTodayRecord(userId);
        res.json({ record });
    }
    catch (error) {
        console.error('Error fetching today\'s record:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s record' });
    }
});
// Get user's monthly summary
router.get('/summary/:userId/:year/:month', authenticateToken, async (req, res) => {
    try {
        const { userId, year, month } = req.params;
        const summary = await AttendanceModel.getMonthlySummary(parseInt(userId), parseInt(year), parseInt(month));
        res.json({ summary });
    }
    catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({ error: 'Failed to fetch monthly summary' });
    }
});
export default router;
