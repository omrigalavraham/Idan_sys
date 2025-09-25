import { query } from '../database/connection.js';
export class LeadModel {
    // Create a new lead
    static async create(leadData) {
        const { customer_id = null, name, phone, email, status = 'חדש', source = 'manual', callback_date = null, callback_time = null, assigned_to, client_id, notes } = leadData;
        const result = await query(`INSERT INTO leads (customer_id, name, phone, email, status, source, callback_date, callback_time, assigned_to, client_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [customer_id, name, phone, email, status, source, callback_date, callback_time, assigned_to, client_id, notes]);
        return result.rows[0];
    }
    // Create multiple leads (bulk import)
    static async createBulk(leadsData) {
        if (leadsData.length === 0)
            return [];
        // Use a dedicated client for proper transaction handling
        const { getClient } = await import('../database/connection.js');
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const results = [];
            for (const leadData of leadsData) {
                // First, create or find customer
                let customerId;
                // Check if customer exists by email or phone
                const existingCustomer = await client.query('SELECT id FROM customers WHERE email = $1 OR phone = $2', [leadData.email, leadData.phone]);
                if (existingCustomer.rows.length > 0) {
                    customerId = existingCustomer.rows[0].id;
                }
                else {
                    // Create new customer
                    const customerResult = await client.query(`INSERT INTO customers (full_name, phone, email, status, company_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`, [leadData.name, leadData.phone, leadData.email, 'active', 'Unknown']);
                    customerId = customerResult.rows[0].id;
                }
                // Create lead
                const leadResult = await client.query(`INSERT INTO leads (customer_id, name, phone, email, status, source, callback_date, callback_time, notes, assigned_to, client_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`, [
                    customerId,
                    leadData.name,
                    leadData.phone,
                    leadData.email,
                    leadData.status || 'new',
                    leadData.source || 'excel_import',
                    leadData.followup_date ? new Date(leadData.followup_date) : null,
                    leadData.followup_time || null,
                    leadData.notes || null,
                    leadData.assigned_to || null,
                    leadData.client_id || null
                ]);
                results.push(leadResult.rows[0]);
            }
            await client.query('COMMIT');
            return results;
        }
        catch (error) {
            try {
                await client.query('ROLLBACK');
            }
            catch (_) { }
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Find lead by ID
    static async findById(id) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE id = $1`, [id]);
        return result.rows[0] || null;
    }
    // Get all leads with pagination
    static async findAll(limit = 50, offset = 0) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        return result.rows;
    }
    // Get leads by customer ID
    static async findByCustomerId(customerId) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE customer_id = $1 ORDER BY created_at DESC`, [customerId]);
        return result.rows;
    }
    // Update lead
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const key of Object.keys(updates)) {
            if (key !== 'id' && updates[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        const result = await query(`UPDATE leads SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`, values);
        return result.rows[0] || null;
    }
    // Delete lead
    static async delete(id) {
        const result = await query('DELETE FROM leads WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
    // Get leads by status
    static async findByStatus(status) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE status = $1 ORDER BY created_at DESC`, [status]);
        return result.rows;
    }
    // Search leads
    static async search(searchTerm) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads 
      WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR notes ILIKE $1
      ORDER BY created_at DESC`, [`%${searchTerm}%`]);
        return result.rows;
    }
    // Get leads count by status
    static async getCountByStatus() {
        const result = await query('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
        return result.rows;
    }
    // Get leads by user or client (for data segregation)
    static async findByUserOrClient(userId, clientId) {
        if (clientId) {
            // Get leads assigned to user or belonging to their client
            const result = await query(`SELECT 
          id, customer_id, name, phone, email, status, source, 
          callback_date, 
          TO_CHAR(callback_time, 'HH24:MI') as callback_time,
          potential_value, last_contact, product, amount, closing_date, 
          history, assigned_to, client_id, notes, created_at, updated_at
        FROM leads WHERE assigned_to = $1 OR client_id = $2 ORDER BY created_at DESC`, [userId, clientId]);
            return result.rows;
        }
        else {
            // Get only leads assigned to this user
            const result = await query(`SELECT 
          id, customer_id, name, phone, email, status, source, 
          callback_date, 
          TO_CHAR(callback_time, 'HH24:MI') as callback_time,
          potential_value, last_contact, product, amount, closing_date, 
          history, assigned_to, client_id, notes, created_at, updated_at
        FROM leads WHERE assigned_to = $1 ORDER BY created_at DESC`, [userId]);
            return result.rows;
        }
    }
    // Get leads by assigned user
    static async findByAssignedTo(assignedTo) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE assigned_to = $1 ORDER BY created_at DESC`, [assignedTo]);
        return result.rows;
    }
    // Get leads by assigned user with pagination
    static async findByAssignedToPaginated(assignedTo, limit, offset) {
        // Get total count
        const countResult = await query('SELECT COUNT(*) as total FROM leads WHERE assigned_to = $1', [assignedTo]);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [assignedTo, limit, offset]);
        return { leads: result.rows, total };
    }
    // Get leads by client
    static async findByClientId(clientId) {
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE client_id = $1 ORDER BY created_at DESC`, [clientId]);
        return result.rows;
    }
    // Get total count of leads
    static async getTotalCount() {
        const result = await query('SELECT COUNT(*) FROM leads');
        return parseInt(result.rows[0].count);
    }
    // Get all leads with pagination (for admin)
    static async findAllPaginated(limit, offset) {
        // Get total count
        const countResult = await query('SELECT COUNT(*) as total FROM leads');
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        return { leads: result.rows, total };
    }
    // Get leads by multiple assigned users with pagination (for manager)
    static async findByAssignedToMultiplePaginated(assignedToIds, limit, offset) {
        if (assignedToIds.length === 0) {
            return { leads: [], total: 0 };
        }
        // Create placeholders for the IN clause
        const placeholders = assignedToIds.map((_, index) => `$${index + 1}`).join(',');
        // Get total count
        const countResult = await query(`SELECT COUNT(*) as total FROM leads WHERE assigned_to IN (${placeholders})`, assignedToIds);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const result = await query(`SELECT 
        id, customer_id, name, phone, email, status, source, 
        callback_date, 
        TO_CHAR(callback_time, 'HH24:MI') as callback_time,
        potential_value, last_contact, product, amount, closing_date, 
        history, assigned_to, client_id, notes, created_at, updated_at
      FROM leads WHERE assigned_to IN (${placeholders}) ORDER BY created_at DESC LIMIT $${assignedToIds.length + 1} OFFSET $${assignedToIds.length + 2}`, [...assignedToIds, limit, offset]);
        return { leads: result.rows, total };
    }
}
