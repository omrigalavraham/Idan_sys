import { query } from '../database/connection.js';

// Legacy interface - now uses unified_events table
export interface Reminder {
  id: number;
  customer_id: number;
  customer_name: string;
  title: string;
  description?: string;
  reminder_date: Date;
  reminder_time: string;
  advance_notice: number; // minutes before to notify
  is_active: boolean;
  notified: boolean;
  created_by: number;
  created_at: Date;
}

export interface CreateReminderData {
  customer_id: number;
  customer_name: string;
  title: string;
  description?: string;
  reminder_date: Date;
  reminder_time: string;
  advance_notice?: number;
  created_by: number;
}

export class ReminderModel {
  // Create a new reminder
  static async create(reminderData: CreateReminderData): Promise<Reminder> {
    const { 
      customer_id,
      customer_name,
      title,
      description,
      reminder_date,
      reminder_time,
      advance_notice = 1440, // 24 hours default
      created_by
    } = reminderData;
    
    // If no customer_id is provided, set it to null to allow the database to handle it
    const finalCustomerId = customer_id ? customer_id : null;
    
    // Convert date and time to timestamp for unified_events
    const start_time = `${reminder_date.toISOString().split('T')[0]}T${reminder_time}`;
    const end_time = start_time; // Same time for reminders

    const result = await query(
      `INSERT INTO unified_events (title, description, event_type, start_time, end_time, advance_notice, is_active, notified, customer_id, customer_name, created_by)
       VALUES ($1, $2, 'reminder', $3, $4, $5, true, false, $6, $7, $8)
       RETURNING id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at`,
      [title, description, start_time, end_time, advance_notice, finalCustomerId, customer_name, created_by]
    );
    
    const event = result.rows[0];
    
    // Convert back to legacy format for compatibility
    return {
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    };
  }

  // Find reminder by ID
  static async findById(id: number): Promise<Reminder | null> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events WHERE id = $1 AND event_type = 'reminder'`,
      [id]
    );
    
    if (!result.rows[0]) return null;
    
    const event = result.rows[0];
    return {
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    };
  }

  // Get all reminders with pagination
  static async findAll(limit = 50, offset = 0): Promise<Reminder[]> {
    const result = await query(
      `SELECT 
         id, 
         title, 
         description, 
         DATE(start_time) AS reminder_date,
         TO_CHAR(start_time, 'HH24:MI') AS reminder_time,
         advance_notice, 
         is_active, 
         notified, 
         customer_id, 
         customer_name, 
         created_by, 
         created_at
       FROM unified_events 
       WHERE event_type = 'reminder'
       ORDER BY start_time ASC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: event.reminder_date,   // תאריך נקי (YYYY-MM-DD)
      reminder_time: event.reminder_time,   // שעה נקייה (HH:MM)
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }
  

  // Update reminder
  static async update(id: number, updates: Partial<Reminder>): Promise<Reminder | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Convert legacy fields to unified_events format
    for (const key of Object.keys(updates)) {
      if (key !== 'id' && updates[key as keyof Reminder] !== undefined) {
        if (key === 'reminder_date' || key === 'reminder_time') {
          // Handle date/time updates by combining them
          if (key === 'reminder_date') {
            const time = updates.reminder_time || '00:00';
            const start_time = `${(updates[key] as Date).toISOString().split('T')[0]}T${time}`;
            fields.push(`start_time = $${paramCount}`, `end_time = $${paramCount}`);
            values.push(start_time, start_time);
            paramCount++;
          }
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key as keyof Reminder]);
          paramCount++;
        }
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE unified_events SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND event_type = 'reminder'
       RETURNING id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at`,
      values
    );

    if (!result.rows[0]) return null;

    const event = result.rows[0];
    return {
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    };
  }

  // Delete reminder
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM unified_events WHERE id = $1 AND event_type = \'reminder\'',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Get reminders by customer ID
  static async findByCustomerId(customerId: number): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events WHERE customer_id = $1 AND event_type = 'reminder' ORDER BY start_time ASC`,
      [customerId]
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Get reminders by creator
  static async findByCreatedBy(createdBy: number): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events WHERE created_by = $1 AND event_type = 'reminder' ORDER BY start_time ASC`,
      [createdBy]
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Get active reminders
  static async findActive(): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events WHERE is_active = true AND event_type = 'reminder' ORDER BY start_time ASC`
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Get due reminders (considering advance notice)
  static async findDue(): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events 
       WHERE is_active = true 
         AND notified = false
         AND event_type = 'reminder'
         AND (
           EXTRACT(EPOCH FROM (start_time - NOW())) / 60
         ) <= advance_notice
       ORDER BY start_time ASC`
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Get overdue reminders
  static async findOverdue(): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events 
       WHERE is_active = true 
         AND event_type = 'reminder'
         AND start_time < NOW()
       ORDER BY start_time ASC`
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Get today's reminders
  static async findToday(): Promise<Reminder[]> {
    const result = await query(
      `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
       FROM unified_events 
       WHERE is_active = true 
         AND event_type = 'reminder'
         AND DATE(start_time) = CURRENT_DATE
       ORDER BY start_time ASC`
    );
    
    return result.rows.map((event: any) => ({
      id: event.id,
      customer_id: event.customer_id,
      customer_name: event.customer_name,
      title: event.title,
      description: event.description,
      reminder_date: new Date(event.start_time.split('T')[0]),
      reminder_time: event.start_time.split('T')[1],
      advance_notice: event.advance_notice,
      is_active: event.is_active,
      notified: event.notified,
      created_by: event.created_by,
      created_at: event.created_at
    }));
  }

  // Mark reminder as notified
  static async markAsNotified(id: number): Promise<boolean> {
    const result = await query(
      'UPDATE unified_events SET notified = true WHERE id = $1 AND event_type = \'reminder\'',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Deactivate reminder (mark as completed)
  static async deactivate(id: number): Promise<boolean> {
    const result = await query(
      'UPDATE unified_events SET is_active = false WHERE id = $1 AND event_type = \'reminder\'',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Get reminders by user or client (for data segregation)
  static async findByUserOrClient(userId: number, clientId?: number): Promise<Reminder[]> {
    if (clientId) {
      // Get reminders created by user or from customers belonging to their client
      const result = await query(
        `SELECT ue.id, ue.title, ue.description, ue.start_time, ue.advance_notice, ue.is_active, ue.notified, ue.customer_id, ue.customer_name, ue.created_by, ue.created_at
         FROM unified_events ue
         LEFT JOIN customers c ON ue.customer_id = c.id
         WHERE ue.created_by = $1 OR c.client_id = $2
         AND ue.event_type = 'reminder'
         ORDER BY ue.start_time ASC`,
        [userId, clientId]
      );
      return result.rows.map((event: any) => ({
        id: event.id,
        customer_id: event.customer_id,
        customer_name: event.customer_name,
        title: event.title,
        description: event.description,
        reminder_date: new Date(event.start_time.split('T')[0]),
        reminder_time: event.start_time.split('T')[1],
        advance_notice: event.advance_notice,
        is_active: event.is_active,
        notified: event.notified,
        created_by: event.created_by,
        created_at: event.created_at
      }));
    } else {
      // Get only reminders created by this user
      const result = await query(
        `SELECT id, title, description, start_time, advance_notice, is_active, notified, customer_id, customer_name, created_by, created_at
         FROM unified_events WHERE created_by = $1 AND event_type = 'reminder' ORDER BY start_time ASC`,
        [userId]
      );
      return result.rows.map((event: any) => ({
        id: event.id,
        customer_id: event.customer_id,
        customer_name: event.customer_name,
        title: event.title,
        description: event.description,
        reminder_date: new Date(event.start_time.split('T')[0]),
        reminder_time: event.start_time.split('T')[1],
        advance_notice: event.advance_notice,
        is_active: event.is_active,
        notified: event.notified,
        created_by: event.created_by,
        created_at: event.created_at
      }));
    }
  }
}
