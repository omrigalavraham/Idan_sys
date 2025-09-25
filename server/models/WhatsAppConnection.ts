import { query } from '../database/connection.js';

/**
 * WhatsApp Connection Model
 * מודל לניהול חיבורי ווטסאפ של מנהלים
 */
export interface WhatsAppConnection {
  id: number;
  manager_id: number;
  wa_access_token: string; // WhatsApp Business API Access Token
  wa_phone_number_id: string; // Phone Number ID
  wa_business_account_id?: string; // Business Account ID (optional)
  wa_app_id?: string; // App ID (optional)
  wa_webhook_verify_token?: string; // Webhook Verify Token (optional)
  is_active: boolean;
  expires_at?: Date;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWhatsAppConnectionData {
  manager_id: number;
  wa_access_token: string;
  wa_phone_number_id: string;
  wa_business_account_id?: string;
  wa_app_id?: string;
  wa_webhook_verify_token?: string;
  expires_at?: Date;
}

export interface UpdateWhatsAppConnectionData {
  wa_access_token?: string;
  wa_phone_number_id?: string;
  wa_business_account_id?: string;
  wa_app_id?: string;
  wa_webhook_verify_token?: string;
  is_active?: boolean;
  expires_at?: Date;
  last_used_at?: Date;
}

export class WhatsAppConnectionModel {
  /**
   * יצירת חיבור ווטסאפ חדש
   */
  static async create(data: CreateWhatsAppConnectionData): Promise<WhatsAppConnection> {
    const {
      manager_id,
      wa_access_token,
      wa_phone_number_id,
      wa_business_account_id,
      wa_app_id,
      expires_at
    } = data;

    const result = await query(
      `INSERT INTO whatsapp_connections 
       (manager_id, wa_access_token, wa_phone_number_id, wa_business_account_id, wa_app_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [manager_id, wa_access_token, wa_phone_number_id, wa_business_account_id, wa_app_id, expires_at]
    );

    return result.rows[0];
  }

  /**
   * עדכון חיבור ווטסאפ קיים
   */
  static async update(id: number, data: UpdateWhatsAppConnectionData): Promise<WhatsAppConnection> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // בניית השאילתה דינמית
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await query(
      `UPDATE whatsapp_connections 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('WhatsApp connection not found');
    }

    return result.rows[0];
  }

  /**
   * עדכון חיבור ווטסאפ לפי manager_id
   */
  static async updateByManagerId(manager_id: number, data: UpdateWhatsAppConnectionData): Promise<WhatsAppConnection> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // בניית השאילתה דינמית
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(manager_id);
    const result = await query(
      `UPDATE whatsapp_connections 
       SET ${fields.join(', ')}
       WHERE manager_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('WhatsApp connection not found for this manager');
    }

    return result.rows[0];
  }

  /**
   * מציאת חיבור ווטסאפ לפי ID
   */
  static async findById(id: number): Promise<WhatsAppConnection | null> {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * מציאת חיבור ווטסאפ לפי manager_id
   */
  static async findByManagerId(manager_id: number): Promise<WhatsAppConnection | null> {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE manager_id = $1',
      [manager_id]
    );

    return result.rows[0] || null;
  }

  /**
   * מציאת חיבור ווטסאפ פעיל לפי manager_id
   */
  static async findActiveByManagerId(manager_id: number): Promise<WhatsAppConnection | null> {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE manager_id = $1 AND is_active = true',
      [manager_id]
    );

    return result.rows[0] || null;
  }

  /**
   * מציאת חיבור ווטסאפ פעיל לפי agent_id (דרך המנהל שלו)
   */
  static async findActiveByAgentId(agent_id: number): Promise<WhatsAppConnection | null> {
    const result = await query(
      `SELECT wc.* FROM whatsapp_connections wc
       JOIN users u ON u.manager_id = wc.manager_id
       WHERE u.id = $1 AND wc.is_active = true`,
      [agent_id]
    );

    return result.rows[0] || null;
  }

  /**
   * מחיקת חיבור ווטסאפ
   */
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM whatsapp_connections WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * מחיקת חיבור ווטסאפ לפי manager_id
   */
  static async deleteByManagerId(manager_id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM whatsapp_connections WHERE manager_id = $1',
      [manager_id]
    );

    return result.rowCount > 0;
  }

  /**
   * רשימת כל החיבורים
   */
  static async findAll(): Promise<WhatsAppConnection[]> {
    const result = await query(
      'SELECT * FROM whatsapp_connections ORDER BY created_at DESC'
    );

    return result.rows;
  }

  /**
   * רשימת חיבורים פעילים
   */
  static async findActive(): Promise<WhatsAppConnection[]> {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE is_active = true ORDER BY created_at DESC'
    );

    return result.rows;
  }

  /**
   * עדכון זמן השימוש האחרון
   */
  static async updateLastUsed(manager_id: number): Promise<void> {
    await query(
      'UPDATE whatsapp_connections SET last_used_at = CURRENT_TIMESTAMP WHERE manager_id = $1',
      [manager_id]
    );
  }

  /**
   * בדיקה אם חיבור קיים ופעיל
   */
  static async isConnectionActive(manager_id: number): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM whatsapp_connections WHERE manager_id = $1 AND is_active = true',
      [manager_id]
    );

    return result.rows.length > 0;
  }

  /**
   * בדיקת תקינות API credentials
   */
  static async validateApiCredentials(access_token: string, phone_number_id: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const axios = (await import('axios')).default;
      
      // בדיקה בסיסית של ה-API
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
          timeout: 10000, // 10 שניות timeout
        }
      );

      if (response.status === 200 && response.data) {
        return { valid: true };
      } else {
        return { valid: false, error: 'Invalid API response' };
      }
    } catch (error: any) {
      console.error('API validation error:', error);
      
      if (error.response?.status === 401) {
        return { valid: false, error: 'Invalid access token' };
      } else if (error.response?.status === 404) {
        return { valid: false, error: 'Invalid phone number ID' };
      } else if (error.code === 'ECONNABORTED') {
        return { valid: false, error: 'Connection timeout' };
      } else {
        return { valid: false, error: error.message || 'Unknown error' };
      }
    }
  }
}
