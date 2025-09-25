import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  device_fingerprint?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateSessionData {
  user_id: number;
  device_fingerprint?: string;
  ip_address?: string;
  user_agent?: string;
  expires_in_hours?: number;
}

export class SessionModel {
  // Create a new session
  static async create(sessionData: CreateSessionData): Promise<Session> {
    const { 
      user_id, 
      device_fingerprint, 
      ip_address, 
      user_agent, 
      expires_in_hours = 24 
    } = sessionData;
    
    const session_token = uuidv4();
    const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);
    
    const result = await query(
      `INSERT INTO user_sessions (user_id, session_token, device_fingerprint, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, session_token, device_fingerprint, ip_address, user_agent, expires_at]
    );
    
    return result.rows[0];
  }

  // Find session by token
  static async findByToken(session_token: string): Promise<Session | null> {
    const result = await query(
      'SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [session_token]
    );
    
    return result.rows[0] || null;
  }

  // Find sessions by user ID
  static async findByUserId(user_id: number): Promise<Session[]> {
    const result = await query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC',
      [user_id]
    );
    
    return result.rows;
  }

  // Update session
  static async update(id: number, updates: Partial<Session>): Promise<Session | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE user_sessions SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  // Delete session
  static async delete(session_token: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [session_token]
    );
    
    return result.rowCount > 0;
  }

  // Delete all sessions for a user
  static async deleteAllForUser(user_id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [user_id]
    );
    
    return result.rowCount > 0;
  }

  // Clean up expired sessions
  static async cleanupExpired(): Promise<number> {
    const result = await query(
      'DELETE FROM user_sessions WHERE expires_at <= NOW()'
    );
    
    return result.rowCount || 0;
  }

  // Extend session
  static async extend(session_token: string, hours: number = 24): Promise<Session | null> {
    const expires_at = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    const result = await query(
      'UPDATE user_sessions SET expires_at = $1 WHERE session_token = $2 AND expires_at > NOW() RETURNING *',
      [expires_at, session_token]
    );
    
    return result.rows[0] || null;
  }
}
