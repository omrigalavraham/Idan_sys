import { query } from '../database/connection.js';

// Legacy interface - now uses unified_events table
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  event_type: 'lead' | 'task' | 'meeting' | 'reminder';
  start_time: string;
  end_time: string;
  lead_id?: number;
  task_id?: number;
  customer_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  event_type: 'lead' | 'task' | 'meeting' | 'reminder';
  start_time: string;
  end_time: string;
  lead_id?: number;
  task_id?: number;
  customer_id?: number;
  created_by: number;
}

export class CalendarEventModel {
  // Create a new calendar event
  static async create(eventData: CreateCalendarEventData): Promise<CalendarEvent> {
    const { 
      title,
      description,
      event_type,
      start_time,
      end_time,
      lead_id,
      task_id,
      customer_id,
      created_by
    } = eventData;
    
    // Set advance_notice based on event type
    const advance_notice = event_type === 'reminder' || event_type === 'lead' ? 1440 : 0;

    const result = await query(
      `INSERT INTO unified_events (title, description, event_type, start_time, end_time, advance_notice, is_active, notified, lead_id, task_id, customer_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, false, $7, $8, $9, $10)
       RETURNING id, title, description, event_type, start_time, end_time, lead_id, task_id, customer_id, created_by, created_at, updated_at`,
      [title, description, event_type, start_time, end_time, advance_notice, lead_id, task_id, customer_id, created_by]
    );
    
    const event = result.rows[0];
    
    // Return timestamps as strings to avoid timezone conversion
    return {
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    };
  }

  // Find event by ID
  static async findById(id: number): Promise<CalendarEvent | null> {
    const result = await query(
      `SELECT id, title, description, event_type, start_time, end_time, lead_id, task_id, customer_id, created_by, created_at, updated_at
       FROM unified_events WHERE id = $1`,
      [id]
    );
    
    const event = result.rows[0];
    if (!event) return null;
    
    // Return timestamps as strings to avoid timezone conversion
    return {
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    };
  }

  // Get all events with pagination
  static async findAll(limit = 100, offset = 0): Promise<CalendarEvent[]> {
    const result = await query(
      `SELECT id, title, description, event_type, start_time, end_time, lead_id, task_id, customer_id, created_by, created_at, updated_at
       FROM unified_events ORDER BY start_time ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Update event
  static async update(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    console.log('🔍 MODEL UPDATE - Event ID:', id);
    console.log('🔍 MODEL UPDATE - Updates received:', updates);
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const key of Object.keys(updates)) {
      if (key !== 'id' && updates[key as keyof CalendarEvent] !== undefined) {
        console.log(`🔍 MODEL UPDATE - Processing field: ${key} = ${updates[key as keyof CalendarEvent]} (type: ${typeof updates[key as keyof CalendarEvent]})`);
        fields.push(`${key} = $${paramCount}`);
        
        // Store time fields as strings to avoid timezone conversion
        values.push(updates[key as keyof CalendarEvent]);
        paramCount++;
      }
    }

    console.log('🔍 MODEL UPDATE - Fields to update:', fields);
    console.log('🔍 MODEL UPDATE - Values:', values);

    if (fields.length === 0) return null;

    values.push(id);
    const queryString = `UPDATE calendar_events SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`;
    
    console.log('🔍 MODEL UPDATE - Query:', queryString);
    console.log('🔍 MODEL UPDATE - Final values:', values);
    
    const result = await query(queryString, values);

    console.log('🔍 MODEL UPDATE - Result:', result.rows[0]);
    const event = result.rows[0];
    if (!event) return null;
    
    // Return timestamps as strings to avoid timezone conversion
    return {
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    };
  }

  // Delete event
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM calendar_events WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Get events by date range
  static async findByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE start_time >= $1 AND end_time <= $2 ORDER BY start_time ASC',
      [startDate, endDate]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by type
  static async findByType(eventType: string): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE event_type = $1 ORDER BY start_time ASC',
      [eventType]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by lead ID
  static async findByLeadId(leadId: number): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE lead_id = $1 ORDER BY start_time ASC',
      [leadId]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by task ID
  static async findByTaskId(taskId: number): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE task_id = $1 ORDER BY start_time ASC',
      [taskId]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by customer ID
  static async findByCustomerId(customerId: number): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE customer_id = $1 ORDER BY start_time ASC',
      [customerId]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by creator
  static async findByCreatedBy(createdBy: number): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE created_by = $1 ORDER BY start_time ASC',
      [createdBy]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get today's events
  static async findToday(): Promise<CalendarEvent[]> {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE DATE(start_time) = CURRENT_DATE 
       ORDER BY start_time ASC`
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get upcoming events (next 7 days)
  static async findUpcoming(): Promise<CalendarEvent[]> {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE start_time >= CURRENT_TIMESTAMP 
         AND start_time <= CURRENT_TIMESTAMP + INTERVAL '7 days'
       ORDER BY start_time ASC`
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events for a specific month
  static async findByMonth(year: number, month: number): Promise<CalendarEvent[]> {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE EXTRACT(YEAR FROM start_time) = $1 
         AND EXTRACT(MONTH FROM start_time) = $2
       ORDER BY start_time ASC`,
      [year, month]
    );
    
    // Return timestamps as strings to avoid timezone conversion
    return result.rows.map((event: any) => ({
      ...event,
      start_time: event.start_time ? event.start_time.toString() : null,
      end_time: event.end_time ? event.end_time.toString() : null,
      created_at: event.created_at ? event.created_at.toString() : null,
      updated_at: event.updated_at ? event.updated_at.toString() : null
    }));
  }

  // Get events by user or client (for data segregation)
  static async findByUserOrClient(userId: number, clientId?: number): Promise<CalendarEvent[]> {
    if (clientId) {
      // Get events created by user or related to their client's leads/customers
      const result = await query(
        `SELECT DISTINCT e.* FROM calendar_events e
         LEFT JOIN leads l ON e.lead_id = l.id
         LEFT JOIN customers c ON e.customer_id = c.id
         WHERE e.created_by = $1 OR l.client_id = $2 OR c.client_id = $2
         ORDER BY e.start_time ASC`,
        [userId, clientId]
      );
      
      // Return timestamps as strings to avoid timezone conversion
      return result.rows.map((event: any) => ({
        ...event,
        start_time: event.start_time ? event.start_time.toString() : null,
        end_time: event.end_time ? event.end_time.toString() : null,
        created_at: event.created_at ? event.created_at.toString() : null,
        updated_at: event.updated_at ? event.updated_at.toString() : null
      }));
    } else {
      // Get only events created by this user
      const result = await query(
        'SELECT * FROM calendar_events WHERE created_by = $1 ORDER BY start_time ASC',
        [userId]
      );
      
      // Return timestamps as strings to avoid timezone conversion
      return result.rows.map((event: any) => ({
        ...event,
        start_time: event.start_time ? event.start_time.toString() : null,
        end_time: event.end_time ? event.end_time.toString() : null,
        created_at: event.created_at ? event.created_at.toString() : null,
        updated_at: event.updated_at ? event.updated_at.toString() : null
      }));
    }
  }
}
