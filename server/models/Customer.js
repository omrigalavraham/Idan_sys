import { query } from '../database/connection.js';
export class CustomerModel {
    // Create a new customer
    static async create(customerData) {
        // Clean the data - remove undefined values
        const cleanData = Object.fromEntries(Object.entries(customerData).filter(([_, v]) => v !== undefined));
        const { lead_id, created_by, client_id, full_name, phone, email, status = 'פעיל', address, company_name, company_id, vat_number, assigned_rep, payment_status = 'ממתין לתשלום', billing_frequency = 'חד פעמי', total_amount = 0, start_date, payment_plan, tags = [], custom_fields = {}, notes } = cleanData;
        const result = await query(`INSERT INTO customers (
        lead_id, created_by, client_id, full_name, phone, email, status, 
        address, company_name, company_id, vat_number, assigned_rep, 
        payment_status, billing_frequency, total_amount, start_date, 
        notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`, [
            lead_id || null,
            created_by,
            client_id || null,
            full_name,
            phone || null,
            email || null,
            status,
            address || null,
            company_name || null,
            company_id || null,
            vat_number || null,
            assigned_rep || null,
            payment_status,
            billing_frequency,
            total_amount || 0,
            start_date ? new Date(start_date) : null,
            notes || null
        ]);
        return result.rows[0];
    }
    // Create customer from lead
    static async createFromLead(leadId, customerData) {
        await query('BEGIN');
        try {
            // Get lead data
            const leadResult = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
            if (leadResult.rows.length === 0) {
                throw new Error('Lead not found');
            }
            const lead = leadResult.rows[0];
            // Create customer with lead data
            const customer = await this.create({
                ...customerData,
                lead_id: leadId,
                full_name: customerData.full_name || lead.name,
                phone: customerData.phone || lead.phone,
                email: customerData.email || lead.email
            });
            // Update lead status to indicate conversion
            await query('UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['לקוח קיים', leadId]);
            await query('COMMIT');
            return customer;
        }
        catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    }
    // Find customer by ID
    static async findById(id) {
        const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return null;
        const customer = result.rows[0];
        // Get customer services
        const servicesResult = await query('SELECT * FROM customer_services WHERE customer_id = $1', [id]);
        // Get customer payments
        const paymentsResult = await query('SELECT * FROM payments WHERE customer_id = $1', [id]);
        return {
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {},
            services: servicesResult.rows,
            payments: paymentsResult.rows
        };
    }
    // Get all customers with pagination
    static async findAll(limit = 50, offset = 0) {
        const result = await query('SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        const customers = await Promise.all(result.rows.map(async (customer) => {
            // Get customer services
            const servicesResult = await query('SELECT * FROM customer_services WHERE customer_id = $1', [customer.id]);
            // Get customer payments
            const paymentsResult = await query('SELECT * FROM payments WHERE customer_id = $1', [customer.id]);
            return {
                ...customer,
                payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
                custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {},
                services: servicesResult.rows,
                payments: paymentsResult.rows
            };
        }));
        return customers;
    }
    // Update customer
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const key of Object.keys(updates)) {
            if (key !== 'id' && updates[key] !== undefined) {
                if (key === 'payment_plan' || key === 'custom_fields') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(updates[key]));
                }
                else if (key === 'tags') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                }
                else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                }
                paramCount++;
            }
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        const result = await query(`UPDATE customers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`, values);
        if (result.rows.length === 0)
            return null;
        const customer = result.rows[0];
        return {
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {}
        };
    }
    // Delete customer
    static async delete(id) {
        const result = await query('DELETE FROM customers WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
    // Get customers by status
    static async findByStatus(status) {
        const result = await query('SELECT * FROM customers WHERE status = $1 ORDER BY created_at DESC', [status]);
        return result.rows.map((customer) => ({
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {}
        }));
    }
    // Get customers by assigned representative
    static async findByAssignedTo(assignedTo) {
        const result = await query('SELECT * FROM customers WHERE assigned_rep = $1 ORDER BY created_at DESC', [assignedTo]);
        return result.rows.map((customer) => ({
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {}
        }));
    }
    // Get customers by creator
    static async findByCreatedBy(createdBy) {
        const result = await query('SELECT * FROM customers WHERE created_by = $1 ORDER BY created_at DESC', [createdBy]);
        return result.rows.map((customer) => ({
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {}
        }));
    }
    // Search customers
    static async search(searchTerm) {
        const result = await query(`SELECT * FROM customers 
       WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1
       ORDER BY created_at DESC`, [`%${searchTerm}%`]);
        return result.rows.map((customer) => ({
            ...customer,
            payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
            custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {}
        }));
    }
    // Get customer services
    static async getServices(customerId) {
        const result = await query('SELECT * FROM customer_services WHERE customer_id = $1 ORDER BY id', [customerId]);
        return result.rows;
    }
    // Add service to customer
    static async addService(customerId, serviceData) {
        const result = await query(`INSERT INTO customer_services (customer_id, service_name, amount, tax_type, total, billing_frequency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [customerId, serviceData.service_name, serviceData.amount, serviceData.tax_type, serviceData.total, serviceData.billing_frequency]);
        return result.rows[0];
    }
    // Get customer payments
    static async getPayments(customerId) {
        const result = await query('SELECT * FROM payments WHERE customer_id = $1 ORDER BY id', [customerId]);
        return result.rows;
    }
    // Add payment to customer
    static async addPayment(customerId, paymentData) {
        const result = await query(`INSERT INTO payments (customer_id, total_amount, payment_status, start_date, installments, installment_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [customerId, paymentData.total_amount, paymentData.payment_status, paymentData.start_date, paymentData.installments, paymentData.installment_amount, paymentData.notes]);
        return result.rows[0];
    }
    // Delete customer services
    static async deleteServices(customerId) {
        await query('DELETE FROM customer_services WHERE customer_id = $1', [customerId]);
    }
    // Delete customer payments
    static async deletePayments(customerId) {
        await query('DELETE FROM payments WHERE customer_id = $1', [customerId]);
    }
    // Get customer statistics
    static async getStatistics() {
        const totalResult = await query('SELECT COUNT(*) as total FROM customers');
        const statusResult = await query('SELECT status, COUNT(*) as count FROM customers GROUP BY status');
        const paymentStatusResult = await query('SELECT payment_status, COUNT(*) as count FROM customers GROUP BY payment_status');
        const revenueResult = await query('SELECT SUM(total_amount) as total FROM payments');
        return {
            total: parseInt(totalResult.rows[0].total),
            byStatus: statusResult.rows,
            byPaymentStatus: paymentStatusResult.rows,
            totalRevenue: parseFloat(revenueResult.rows[0].total) || 0
        };
    }
    // Get customers by user or client (for data segregation)
    static async findByUserOrClient(userId, clientId) {
        let result;
        if (clientId) {
            // Get customers created by user or belonging to their client
            result = await query('SELECT * FROM customers WHERE created_by = $1 OR client_id = $2 ORDER BY created_at DESC', [userId, clientId]);
        }
        else {
            // Get only customers created by this user
            result = await query('SELECT * FROM customers WHERE created_by = $1 ORDER BY created_at DESC', [userId]);
        }
        const customers = await Promise.all(result.rows.map(async (customer) => {
            // Get customer services
            const servicesResult = await query('SELECT * FROM customer_services WHERE customer_id = $1', [customer.id]);
            // Get customer payments
            const paymentsResult = await query('SELECT * FROM payments WHERE customer_id = $1', [customer.id]);
            return {
                ...customer,
                payment_plan: customer.payment_plan ? (typeof customer.payment_plan === 'string' ? JSON.parse(customer.payment_plan) : customer.payment_plan) : null,
                custom_fields: customer.custom_fields ? (typeof customer.custom_fields === 'string' ? JSON.parse(customer.custom_fields) : customer.custom_fields) : {},
                services: servicesResult.rows,
                payments: paymentsResult.rows
            };
        }));
        return customers;
    }
}
