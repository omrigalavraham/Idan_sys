import { query } from '../database/connection.js';
export class UnifiedEventModel {
    // Get all events for a user
    static async getEventsByUser(userId) {
        console.log('🔍 Model: getEventsByUser called with userId:', userId, 'type:', typeof userId);
        const result = await query(`
      SELECT 
        id,
        title,
        description,
        event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice",
        is_active as "isActive",
        notified,
        customer_id as "customerId",
        customer_name as "customerName",
        lead_id as "leadId",
        task_id as "taskId",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM unified_events 
      WHERE created_by = $1
      ORDER BY start_time ASC
    `, [userId]);
        console.log('🔍 Model: getEventsByUser result:', result.rows.length, 'events');
        console.log('🔍 Model: Raw query result:', result.rows);
        // Return events with properly formatted times
        const events = result.rows.map((row) => ({
            ...row,
            createdAt: row.createdAt ? row.createdAt.toString() : null,
            updatedAt: row.updatedAt ? row.updatedAt.toString() : null
        }));
        return events;
    }
    // Get events by type (reminder, meeting, lead, task)
    static async getEventsByType(userId, eventType) {
        const result = await query(`
      SELECT 
        id,
        title,
        description,
        event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice",
        is_active as "isActive",
        notified,
        customer_id as "customerId",
        customer_name as "customerName",
        lead_id as "leadId",
        task_id as "taskId",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM unified_events 
      WHERE created_by = $1 AND event_type = $2
      ORDER BY start_time ASC
    `, [userId, eventType]);
        // Return events with properly formatted times
        const events = result.rows.map((row) => ({
            ...row,
            createdAt: row.createdAt ? row.createdAt.toString() : null,
            updatedAt: row.updatedAt ? row.updatedAt.toString() : null
        }));
        return events;
    }
    // Get events by date range
    static async getEventsByDateRange(userId, startDate, endDate) {
        const result = await query(`
      SELECT 
        id,
        title,
        description,
        event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice",
        is_active as "isActive",
        notified,
        customer_id as "customerId",
        customer_name as "customerName",
        lead_id as "leadId",
        task_id as "taskId",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM unified_events 
      WHERE created_by = $1 
        AND start_time >= $2 
        AND start_time <= $3
      ORDER BY start_time ASC
    `, [userId, startDate, endDate]);
        // Return events with properly formatted times
        const events = result.rows.map((row) => ({
            ...row,
            createdAt: row.createdAt ? row.createdAt.toString() : null,
            updatedAt: row.updatedAt ? row.updatedAt.toString() : null
        }));
        return events;
    }
    // Get events that need notifications (for reminders)
    static async getEventsForNotification(userId) {
        const result = await query(`
      SELECT 
        id,
        title,
        description,
        event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice",
        is_active as "isActive",
        notified,
        customer_id as "customerId",
        customer_name as "customerName",
        lead_id as "leadId",
        task_id as "taskId",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM unified_events 
      WHERE created_by = $1 
        AND event_type = 'reminder'
        AND is_active = true
        AND notified = false
        AND advance_notice > 0
      ORDER BY start_time ASC
    `, [userId]);
        // Return events with properly formatted times
        const events = result.rows.map((row) => ({
            ...row,
            createdAt: row.createdAt ? row.createdAt.toString() : null,
            updatedAt: row.updatedAt ? row.updatedAt.toString() : null
        }));
        return events;
    }
    // Create new event (for events and reminders)
    static async createEvent(userId, eventData) {
        // For events and reminders, use the time directly (no new Date conversion)
        const startTime = eventData.startTime;
        const endTime = eventData.endTime;
        const result = await query(`
      INSERT INTO unified_events (
        title, description, event_type, start_time, end_time,
        advance_notice, is_active, notified, customer_id, customer_name,
        lead_id, task_id, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING 
        id, title, description, event_type as "eventType",
TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "endTime",
        advance_notice as "advanceNotice", is_active as "isActive",
        notified, customer_id as "customerId", customer_name as "customerName",
        lead_id as "leadId", task_id as "taskId", created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
            eventData.title,
            eventData.description || null,
            eventData.eventType,
            startTime,
            endTime,
            eventData.advanceNotice || 0,
            eventData.isActive !== undefined ? eventData.isActive : true,
            eventData.notified || false,
            eventData.customerId || null,
            eventData.customerName || null,
            eventData.leadId || null,
            eventData.taskId || null,
            userId
        ]);
        // Return event with properly formatted times
        const event = result.rows[0];
        return {
            ...event,
            createdAt: event.createdAt ? event.createdAt.toString() : null,
            updatedAt: event.updatedAt ? event.updatedAt.toString() : null
        };
    }
    // Create new event from lead (special function for leads)
    static async createEventFromLead(userId, eventData) {
        // For leads, parse the ISO strings with new Date (this works perfectly for leads)
        const startTime = new Date(eventData.startTime);
        const endTime = new Date(eventData.endTime);
        const result = await query(`
      INSERT INTO unified_events (
        title, description, event_type, start_time, end_time,
        advance_notice, is_active, notified, customer_id, customer_name,
        lead_id, task_id, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING 
        id, title, description, event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice", is_active as "isActive",
        notified, customer_id as "customerId", customer_name as "customerName",
        lead_id as "leadId", task_id as "taskId", created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
            eventData.title,
            eventData.description || null,
            eventData.eventType,
            startTime,
            endTime,
            eventData.advanceNotice || 0,
            eventData.isActive !== undefined ? eventData.isActive : true,
            eventData.notified || false,
            eventData.customerId || null,
            eventData.customerName || null,
            eventData.leadId || null,
            eventData.taskId || null,
            userId
        ]);
        // Return event with properly formatted times
        const event = result.rows[0];
        return {
            ...event,
            createdAt: event.createdAt ? event.createdAt.toString() : null,
            updatedAt: event.updatedAt ? event.updatedAt.toString() : null
        };
    }
    // Update event
    static async updateEvent(userId, eventId, updates) {
        const setClause = [];
        const values = [];
        let paramIndex = 1;
        // Build dynamic update query
        if (updates.title !== undefined) {
            setClause.push(`title = $${paramIndex++}`);
            values.push(updates.title);
        }
        if (updates.description !== undefined) {
            setClause.push(`description = $${paramIndex++}`);
            values.push(updates.description);
        }
        if (updates.eventType !== undefined) {
            setClause.push(`event_type = $${paramIndex++}`);
            values.push(updates.eventType);
        }
        if (updates.startTime !== undefined) {
            setClause.push(`start_time = $${paramIndex++}`);
            values.push((updates.startTime));
        }
        if (updates.endTime !== undefined) {
            setClause.push(`end_time = $${paramIndex++}`);
            values.push((updates.endTime));
        }
        if (updates.advanceNotice !== undefined) {
            setClause.push(`advance_notice = $${paramIndex++}`);
            values.push(updates.advanceNotice);
        }
        if (updates.isActive !== undefined) {
            setClause.push(`is_active = $${paramIndex++}`);
            values.push(updates.isActive);
        }
        if (updates.notified !== undefined) {
            setClause.push(`notified = $${paramIndex++}`);
            values.push(updates.notified);
        }
        if (updates.customerId !== undefined) {
            setClause.push(`customer_id = $${paramIndex++}`);
            values.push(updates.customerId);
        }
        if (updates.customerName !== undefined) {
            setClause.push(`customer_name = $${paramIndex++}`);
            values.push(updates.customerName);
        }
        if (updates.leadId !== undefined) {
            setClause.push(`lead_id = $${paramIndex++}`);
            values.push(updates.leadId);
        }
        if (updates.taskId !== undefined) {
            setClause.push(`task_id = $${paramIndex++}`);
            values.push(updates.taskId);
        }
        if (setClause.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(eventId, userId); // Add eventId and userId as last parameters
        const result = await query(`
      UPDATE unified_events 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex++} AND created_by = $${paramIndex++}
      RETURNING 
        id, title, description, event_type as "eventType",
TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "endTime",
        advance_notice as "advanceNotice", is_active as "isActive",
        notified, customer_id as "customerId", customer_name as "customerName",
        lead_id as "leadId", task_id as "taskId", created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `, values);
        if (result.rows.length === 0) {
            throw new Error('Event not found or access denied');
        }
        return result.rows[0];
    }
    // Delete event
    static async deleteEvent(userId, eventId) {
        const result = await query(`
      DELETE FROM unified_events 
      WHERE id = $1 AND created_by = $2
    `, [eventId, userId]);
        return result.rowCount > 0;
    }
    // Mark reminder as notified
    static async markAsNotified(userId, eventId) {
        const result = await query(`
      UPDATE unified_events 
      SET notified = true 
      WHERE id = $1 AND created_by = $2 AND event_type = 'reminder'
    `, [eventId, userId]);
        return result.rowCount > 0;
    }
    // Get event by ID
    static async getEventById(userId, eventId) {
        const result = await query(`
      SELECT 
        id,
        title,
        description,
        event_type as "eventType",
        TO_CHAR(start_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "startTime",
        TO_CHAR(end_time, 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' as "endTime",
        advance_notice as "advanceNotice",
        is_active as "isActive",
        notified,
        customer_id as "customerId",
        customer_name as "customerName",
        lead_id as "leadId",
        task_id as "taskId",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM unified_events 
      WHERE id = $1 AND created_by = $2
    `, [eventId, userId]);
        return result.rows[0] || null;
    }
}
