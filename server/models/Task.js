import { query } from '../database/connection.js';
export class TaskModel {
    // Create a new task
    static async create(taskData) {
        const { title, description, status = 'ממתין', priority = 'בינוני', due_date, assigned_to, lead_id, customer_id, created_by } = taskData;
        const result = await query(`INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, lead_id, customer_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [title, description, status, priority, due_date, assigned_to, lead_id, customer_id, created_by]);
        return result.rows[0];
    }
    // Find task by ID
    static async findById(id) {
        const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    // Get all tasks with pagination
    static async findAll(limit = 50, offset = 0) {
        const result = await query('SELECT * FROM tasks ORDER BY due_date ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows;
    }
    // Update task
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
        const result = await query(`UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`, values);
        return result.rows[0] || null;
    }
    // Delete task
    static async delete(id) {
        const result = await query('DELETE FROM tasks WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
    // Get tasks by status
    static async findByStatus(status) {
        const result = await query('SELECT * FROM tasks WHERE status = $1 ORDER BY due_date ASC', [status]);
        return result.rows;
    }
    // Get tasks by assigned user
    static async findByAssignedTo(assignedTo) {
        const result = await query('SELECT * FROM tasks WHERE assigned_to = $1 ORDER BY due_date ASC', [assignedTo]);
        return result.rows;
    }
    // Get tasks by lead ID
    static async findByLeadId(leadId) {
        const result = await query('SELECT * FROM tasks WHERE lead_id = $1 ORDER BY due_date ASC', [leadId]);
        return result.rows;
    }
    // Get tasks by customer ID
    static async findByCustomerId(customerId) {
        const result = await query('SELECT * FROM tasks WHERE customer_id = $1 ORDER BY due_date ASC', [customerId]);
        return result.rows;
    }
    // Get overdue tasks
    static async findOverdue() {
        const result = await query('SELECT * FROM tasks WHERE due_date < CURRENT_TIMESTAMP AND status != $1 ORDER BY due_date ASC', ['הושלם']);
        return result.rows;
    }
    // Get tasks due today
    static async findDueToday() {
        const result = await query(`SELECT * FROM tasks 
       WHERE DATE(due_date) = CURRENT_DATE AND status != $1 
       ORDER BY due_date ASC`, ['הושלם']);
        return result.rows;
    }
    // Mark task as notified
    static async markAsNotified(id) {
        const result = await query('UPDATE tasks SET notified = true WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
    // Get tasks by user or client (for data segregation)
    static async findByUserOrClient(userId, clientId) {
        if (clientId) {
            // Get tasks assigned to user or from leads/customers belonging to their client
            const result = await query(`SELECT t.* FROM tasks t
         LEFT JOIN leads l ON t.lead_id = l.id
         LEFT JOIN customers c ON t.customer_id = c.id
         WHERE t.assigned_to = $1 OR l.client_id = $2 OR c.client_id = $2
         ORDER BY t.due_date ASC`, [userId, clientId]);
            return result.rows;
        }
        else {
            // Get only tasks assigned to this user
            const result = await query('SELECT * FROM tasks WHERE assigned_to = $1 ORDER BY due_date ASC', [userId]);
            return result.rows;
        }
    }
}
