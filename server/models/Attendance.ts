import { query } from '../database/connection.js';

export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: Date;
  clock_in: Date;
  clock_out?: Date;
  total_hours?: number;
  notes?: string;
  created_at: Date;
}

export interface CreateAttendanceData {
  user_id: number;
  notes?: string;
}

export interface MonthlySummary {
  user_id: number;
  year: number;
  month: number;
  total_days: number;
  total_hours: number;
  average_hours_per_day: number;
  records: AttendanceRecord[];
}

export class AttendanceModel {
  // Clock in
  static async clockIn(userId: number, notes?: string): Promise<AttendanceRecord> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const result = await query(
      `INSERT INTO attendance_records (user_id, date, clock_in, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, today, now, notes]
    );
    
    const record = result.rows[0];
    return {
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    };
  }

  // Clock out
  static async clockOut(userId: number, notes?: string): Promise<AttendanceRecord | null> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find today's record without clock_out
    const existingRecord = await query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND date = $2 AND clock_out IS NULL',
      [userId, today]
    );
    
    if (existingRecord.rows.length === 0) {
      return null;
    }
    
    const record = existingRecord.rows[0];
    const clockInTime = new Date(record.clock_in);
    const totalHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    const result = await query(
      `UPDATE attendance_records 
       SET clock_out = $1, total_hours = $2, notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [now, totalHours, notes, record.id]
    );
    
    const updatedRecord = result.rows[0];
    return {
      ...updatedRecord,
      clock_in: updatedRecord.clock_in ? new Date(updatedRecord.clock_in).toISOString() : null,
      clock_out: updatedRecord.clock_out ? new Date(updatedRecord.clock_out).toISOString() : null,
      created_at: updatedRecord.created_at ? new Date(updatedRecord.created_at).toISOString() : null
    };
  }

  // Find record by ID
  static async findById(id: number): Promise<AttendanceRecord | null> {
    const result = await query(
      'SELECT * FROM attendance_records WHERE id = $1',
      [id]
    );
    
    const record = result.rows[0];
    if (!record) return null;

    return {
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    };
  }

  // Get all records with pagination
  static async findAll(limit = 50, offset = 0): Promise<AttendanceRecord[]> {
    const result = await query(
      'SELECT * FROM attendance_records ORDER BY date DESC, clock_in DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
  }

  // Update record
  static async update(id: number, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const key of Object.keys(updates)) {
      if (key !== 'id' && updates[key as keyof AttendanceRecord] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        let value = updates[key as keyof AttendanceRecord];
        
        // Convert ISO strings to Date objects for timestamp fields
        if ((key === 'clock_in' || key === 'clock_out') && typeof value === 'string') {
          value = new Date(value);
        }
        
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE attendance_records SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    const record = result.rows[0];
    if (!record) return null;

    // Convert timestamps to ISO strings for consistent frontend handling
    return {
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    };
  }

  // Delete record
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM attendance_records WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Get records by user ID
  static async findByUserId(userId: number): Promise<AttendanceRecord[]> {
    const result = await query(
      'SELECT * FROM attendance_records WHERE user_id = $1 ORDER BY date DESC, clock_in DESC',
      [userId]
    );
    
    return result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
  }

  // Get records by user and date range
  static async findByUserAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    const result = await query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
      [userId, startDate, endDate]
    );
    
    return result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
  }

  // Get today's record for a user
  static async findTodayRecord(userId: number): Promise<AttendanceRecord | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND date = $2',
      [userId, today]
    );
    
    const record = result.rows[0];
    if (!record) return null;

    return {
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    };
  }

  // Get monthly summary for a user
  static async getMonthlySummary(userId: number, year: number, month: number): Promise<MonthlySummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const result = await query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND date >= $2 AND date <= $3 
       ORDER BY date ASC`,
      [userId, startDate, endDate]
    );
    
    const records = result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
    
    const totalDays = records.length;
    const totalHours = records.reduce((sum: number, record: any) => sum + (record.total_hours || 0), 0);
    const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    
    return {
      user_id: userId,
      year,
      month,
      total_days: totalDays,
      total_hours: totalHours,
      average_hours_per_day: averageHoursPerDay,
      records
    };
  }

  // Get all users' attendance for a specific date
  static async findByDate(date: Date): Promise<AttendanceRecord[]> {
    const result = await query(
      'SELECT * FROM attendance_records WHERE date = $1 ORDER BY clock_in ASC',
      [date]
    );
    
    return result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
  }

  // Get incomplete records (clocked in but not out)
  static async findIncompleteRecords(): Promise<AttendanceRecord[]> {
    const result = await query(
      'SELECT * FROM attendance_records WHERE clock_out IS NULL ORDER BY clock_in DESC'
    );
    
    return result.rows.map((record: any) => ({
      ...record,
      clock_in: record.clock_in ? new Date(record.clock_in).toISOString() : null,
      clock_out: record.clock_out ? new Date(record.clock_out).toISOString() : null,
      created_at: record.created_at ? new Date(record.created_at).toISOString() : null
    }));
  }

  // Calculate total hours for a user in a date range
  static async getTotalHours(userId: number, startDate: Date, endDate: Date): Promise<number> {
    const result = await query(
      `SELECT SUM(total_hours) as total FROM attendance_records 
       WHERE user_id = $1 AND date >= $2 AND date <= $3 AND total_hours IS NOT NULL`,
      [userId, startDate, endDate]
    );
    
    return parseFloat(result.rows[0].total) || 0;
  }
}
