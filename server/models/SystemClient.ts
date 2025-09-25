import { query } from '../database/connection.js';

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isFinal: boolean;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface CustomerStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface PaymentStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

// כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
// אין צורך ב-interfaces נפרדים

export interface SystemClient {
  id: number;
  name: string;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  is_active: boolean;
  lead_statuses?: LeadStatus[];
  customer_statuses?: CustomerStatus[];
  payment_statuses?: PaymentStatus[];
  features?: Record<string, any>;
  message_templates?: any[]; // תבניות הודעות (ווצאפ/אמייל/סמס)
  created_at: Date;
  updated_at: Date;
}

export interface CreateSystemClientData {
  name: string;
  company_name: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  lead_statuses?: LeadStatus[];
  customer_statuses?: CustomerStatus[];
  payment_statuses?: PaymentStatus[];
  features?: Record<string, any>;
  message_templates?: any[];
}

export class SystemClientModel {
  // Create a new system client
  static async create(clientData: CreateSystemClientData): Promise<SystemClient> {
    const { 
      name,
      company_name,
      primary_color = '#3b82f6',
      secondary_color = '#1e40af',
      logo_url,
      lead_statuses = [],
      customer_statuses = [],
      payment_statuses = [],
      features = {},
      message_templates = []
    } = clientData;
    
    const result = await query(
      `INSERT INTO system_clients (name, company_name, primary_color, secondary_color, logo_url, lead_statuses, customer_statuses, payment_statuses, features, message_templates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, company_name, primary_color, secondary_color, logo_url, JSON.stringify(lead_statuses), JSON.stringify(customer_statuses), JSON.stringify(payment_statuses), JSON.stringify(features), JSON.stringify(message_templates)]
    );
    
    return result.rows[0];
  }

  // Find client by ID (excluding soft deleted)
  static async findById(id: number): Promise<SystemClient | null> {
    // First, ensure deleted_at column exists
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'SELECT * FROM system_clients WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Get all clients with pagination (excluding soft deleted)
  static async findAll(limit = 50, offset = 0): Promise<SystemClient[]> {
    // First, ensure deleted_at column exists
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'SELECT * FROM system_clients WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map((client: any) => ({
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    }));
  }

  // Get active clients only (excluding soft deleted)
  static async findActive(): Promise<SystemClient[]> {
    // First, ensure deleted_at column exists
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'SELECT * FROM system_clients WHERE is_active = true AND deleted_at IS NULL ORDER BY created_at DESC'
    );
    
    return result.rows.map((client: any) => ({
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    }));
  }

  // Update client
  static async update(id: number, updates: Partial<SystemClient>): Promise<SystemClient | null> {
    try {
      console.log('SystemClientModel.update called with:', { id, updates });
      
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const key of Object.keys(updates)) {
        if (key !== 'id' && updates[key as keyof SystemClient] !== undefined) {
        if (key.includes('_statuses') || key === 'features' || key === 'message_templates') {
          // JSON fields
          fields.push(`${key} = $${paramCount}`);
          try {
            const jsonValue = JSON.stringify(updates[key as keyof SystemClient]);
            values.push(jsonValue);
          } catch (jsonError) {
            console.error(`Error stringifying JSON for field ${key}:`, jsonError);
            console.error('Value that failed to stringify:', updates[key as keyof SystemClient]);
            throw new Error(`Invalid JSON data for field ${key}`);
          }
        } else {
            fields.push(`${key} = $${paramCount}`);
            values.push(updates[key as keyof SystemClient]);
          }
          paramCount++;
        }
      }

      console.log('Generated SQL fields:', fields);
      console.log('Generated SQL values:', values);

      if (fields.length === 0) return null;

      values.push(id);
      const queryString = `UPDATE system_clients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}
         RETURNING *`;
      
      console.log('Executing query:', queryString);
      console.log('With values:', values);
      
      const result = await query(queryString, values);

      console.log('Query result:', result.rows);

      if (result.rows.length === 0) return null;
      
      const client = result.rows[0];
      return {
        ...client,
        lead_statuses: client.lead_statuses || [],
        customer_statuses: client.customer_statuses || [],
        payment_statuses: client.payment_statuses || [],
        features: client.features || {},
        message_templates: client.message_templates || []
      };
    } catch (error) {
      console.error('Error in SystemClientModel.update:', error);
      throw error;
    }
  }

  // Delete client
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM system_clients WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Activate client
  static async activate(id: number): Promise<SystemClient | null> {
    const result = await query(
      'UPDATE system_clients SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Deactivate client
  static async deactivate(id: number): Promise<SystemClient | null> {
    const result = await query(
      'UPDATE system_clients SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Get client configuration
  static async getConfiguration(id: number): Promise<{
    lead_statuses: LeadStatus[];
    customer_statuses: CustomerStatus[];
    payment_statuses: PaymentStatus[];
    features: Record<string, any>;
    message_templates: any[];
  } | null> {
    const result = await query(
      'SELECT lead_statuses, customer_statuses, payment_statuses, features, message_templates FROM system_clients WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Update client configuration
  static async updateConfiguration(id: number, config: {
    lead_statuses?: LeadStatus[];
    customer_statuses?: CustomerStatus[];
    payment_statuses?: PaymentStatus[];
    features?: Record<string, any>;
    message_templates?: any[];
  }): Promise<SystemClient | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (config.lead_statuses !== undefined) {
      fields.push(`lead_statuses = $${paramCount}`);
      values.push(JSON.stringify(config.lead_statuses));
      paramCount++;
    }


    if (config.customer_statuses !== undefined) {
      fields.push(`customer_statuses = $${paramCount}`);
      values.push(JSON.stringify(config.customer_statuses));
      paramCount++;
    }

    if (config.payment_statuses !== undefined) {
      fields.push(`payment_statuses = $${paramCount}`);
      values.push(JSON.stringify(config.payment_statuses));
      paramCount++;
    }

    if (config.features !== undefined) {
      fields.push(`features = $${paramCount}`);
      values.push(JSON.stringify(config.features));
      paramCount++;
    }


    if (config.message_templates !== undefined) {
      fields.push(`message_templates = $${paramCount}`);
      values.push(JSON.stringify(config.message_templates));
      paramCount++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE system_clients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Find client by name (excluding soft deleted)
  static async findByName(name: string): Promise<SystemClient | null> {
    // First, ensure deleted_at column exists
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'SELECT * FROM system_clients WHERE name = $1 AND deleted_at IS NULL',
      [name]
    );
    
    if (result.rows.length === 0) return null;
    
    const client = result.rows[0];
    return {
      ...client,
      lead_statuses: client.lead_statuses || [],
      customer_statuses: client.customer_statuses || [],
      payment_statuses: client.payment_statuses || [],
      features: client.features || {},
      message_templates: client.message_templates || []
    };
  }

  // Clean up system clients that were soft deleted more than a month ago
  static async cleanupDeletedClients(): Promise<number> {
    // First, we need to add deleted_at column to system_clients if it doesn't exist
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'DELETE FROM system_clients WHERE deleted_at IS NOT NULL AND deleted_at < CURRENT_TIMESTAMP - INTERVAL \'1 month\''
    );
    
    return result.rowCount || 0;
  }

  // Soft delete system client
  static async softDelete(id: number): Promise<boolean> {
    // First, we need to add deleted_at column to system_clients if it doesn't exist
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'UPDATE system_clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Get count of system clients pending deletion
  static async getPendingDeletionCount(): Promise<number> {
    // First, we need to add deleted_at column to system_clients if it doesn't exist
    await query(`
      ALTER TABLE system_clients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);
    
    const result = await query(
      'SELECT COUNT(*) as count FROM system_clients WHERE deleted_at IS NOT NULL AND deleted_at < CURRENT_TIMESTAMP - INTERVAL \'1 month\''
    );
    
    return parseInt(result.rows[0]?.count || '0');
  }

  // כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
  // אין צורך בפונקציות נפרדות
}
