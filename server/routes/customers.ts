import express, { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { CustomerModel } from '../models/Customer.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../database/connection.js';

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { limit = '50', offset = '0', status, assigned_to } = req.query;
    
    // All users (including admins) see only customers they created
    let customers;
    if (status) {
      const allCustomers = await CustomerModel.findByStatus(status as string);
      customers = allCustomers.filter(customer => customer.created_by === req.user.id);
    } else if (assigned_to) {
      // Only show customers created by the current user
      const allCustomers = await CustomerModel.findByAssignedTo(assigned_to as string);
      customers = allCustomers.filter(customer => customer.created_by === req.user.id);
    } else {
      customers = await CustomerModel.findByCreatedBy(req.user.id);
    }
    
    // Ensure each customer has services and payments data
    const customersWithRelations = await Promise.all(customers.map(async (customer: any) => {
      const services = await CustomerModel.getServices(customer.id);
      const payments = await CustomerModel.getPayments(customer.id);
      
      return {
        ...customer,
        services,
        payments
      };
    }));
    
    res.json({ customers: customersWithRelations, total: customersWithRelations.length });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get customer by ID
router.get('/:id', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await CustomerModel.findById(parseInt(id as string));
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if user has permission to view this customer
    if (customer.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // The findById method already includes services and payments
    res.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const customerData = {
      lead_id: req.body.leadId,
      full_name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      status: req.body.status || 'פעיל',
      address: req.body.address,
      company_name: req.body.company,
      vat_number: req.body.vatNumber,
      assigned_rep: req.body.assignedTo,
      payment_status: req.body.paymentStatus || 'ממתין לתשלום',
      billing_frequency: req.body.billingFrequency || 'חד פעמי',
      total_amount: req.body.totalAmount || 0,
      start_date: req.body.startDate,
      payment_type: req.body.paymentType || 'amount',
      payment_value: req.body.paymentValue || 0,
      payment_vat_included: req.body.paymentVatIncluded || false,
      notes: req.body.notes,
      created_by: req.user.id,
      client_id: req.user.client_id || null
    };
    
    const customer = await CustomerModel.create(customerData);
    
    // Update lead status if created from a lead
    if (req.body.leadId) {
      try {
        // Import LeadModel to update the lead
        const { LeadModel } = await import('../models/Lead.js');
        await LeadModel.update(parseInt(req.body.leadId as string), {
          status: 'הומר ללקוח',
          customer_id: customer.id
        });
      } catch (leadError) {
        console.error('Error updating lead status:', leadError);
        // Continue without failing the customer creation
      }
    }
    
    // Handle products as services if provided
    if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
      try {
        for (const product of req.body.products) {
          if (product && product.trim()) {
            await CustomerModel.addService(customer.id, {
              service_name: product.trim(),
              amount: req.body.totalAmount ? (req.body.totalAmount / req.body.products.length) : 0,
              tax_type: req.body.vatType || 'plus',
              total: req.body.totalAmount || 0,
              billing_frequency: customerData.billing_frequency
            });
          }
        }
      } catch (serviceError) {
        console.error('Error adding services:', serviceError);
        // Continue without failing the customer creation
      }
    }
    
    // Handle payment if provided
    if (req.body.totalAmount && req.body.totalAmount > 0) {
      try {
        if (req.body.payments && req.body.payments.length > 0) {
          // Use payments data from request
          const payment = req.body.payments[0];
          await CustomerModel.addPayment(customer.id, {
            total_amount: payment.total_amount || req.body.totalAmount,
            payment_status: payment.payment_status || customerData.payment_status,
            start_date: payment.start_date ? new Date(payment.start_date) : new Date(),
            installments: payment.installments || 1,
            installment_amount: payment.installment_amount || (req.body.totalAmount / (payment.installments || 1)),
            payment_type: payment.payment_type || customerData.payment_type,
            payment_value: payment.payment_value || customerData.payment_value,
            vat_included: payment.vat_included || customerData.payment_vat_included,
            notes: payment.notes || `תשלום עבור: ${req.body.products?.join(', ') || 'שירות'}`
          });
        } else {
          // Fallback to paymentPlan or default values
          const installments = req.body.paymentPlan?.numberOfPayments || 1;
          const installmentAmount = req.body.paymentPlan?.monthlyAmount || (req.body.totalAmount / installments);
          const startDate = req.body.paymentPlan?.firstPaymentDate || customerData.start_date;

          await CustomerModel.addPayment(customer.id, {
            total_amount: req.body.totalAmount,
            payment_status: customerData.payment_status,
            start_date: startDate ? new Date(startDate) : new Date(),
            installments: installments,
            installment_amount: installmentAmount,
            payment_type: customerData.payment_type,
            payment_value: customerData.payment_value,
            vat_included: customerData.payment_vat_included,
            notes: `תשלום עבור: ${req.body.products?.join(', ') || 'שירות'}`
          });
        }
      } catch (paymentError) {
        console.error('Error adding payment:', paymentError);
        // Continue without failing the customer creation
      }
    }
    
    res.status(201).json({ customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ 
      error: 'Failed to create customer', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Update customer request:', { id, updates });
    
    // Validate ID
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }
    
    const customerId = parseInt(id as string);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }
    
    // First check if customer exists and user has permission
    const existingCustomer = await CustomerModel.findById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if user has permission to update this customer
    if (existingCustomer.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    
    // Filter out fields that don't belong to the customers table
    const customerUpdates = {
      full_name: updates.name,
      email: updates.email,
      phone: updates.phone,
      address: updates.address,
      company_name: updates.company,
      vat_number: updates.vatNumber,
      assigned_rep: updates.assignedTo,
      status: updates.status,
      payment_status: updates.paymentStatus,
      total_amount: updates.totalAmount,
      billing_frequency: updates.billingFrequency,
      start_date: updates.startDate,
      payment_type: updates.paymentType,
      payment_value: updates.paymentValue,
      payment_vat_included: updates.paymentVatIncluded,
      notes: updates.notes,
      vat_type: updates.vatType,
      payment_plan: updates.paymentPlan,
      tags: updates.tags,
      custom_fields: updates.customFields
    };
    
    // Remove undefined values
    Object.keys(customerUpdates).forEach(key => {
      if (customerUpdates[key as keyof typeof customerUpdates] === undefined) {
        delete customerUpdates[key as keyof typeof customerUpdates];
      }
    });
    
    // Handle services update
    if (updates.products && Array.isArray(updates.products)) {
      // Delete existing services
      await CustomerModel.deleteServices(customerId);
      
      // Add new services
      for (const product of updates.products) {
        if (product && product.trim()) {
          await CustomerModel.addService(customerId, {
            service_name: product.trim(),
            amount: updates.totalAmount ? (updates.totalAmount / updates.products.length) : 0,
            tax_type: updates.vatType || 'plus',
            total: updates.totalAmount || 0,
            billing_frequency: updates.billingFrequency || 'חד פעמי'
          });
        }
      }
    }
    
    // Handle payment plan update
    if (updates.payments && updates.payments.length > 0) {
      // Delete existing payments
      await CustomerModel.deletePayments(customerId);
      
      // Add new payment plan
      const payment = updates.payments[0];
      const totalAmount = payment.total_amount || updates.totalAmount || 0;
      
      if (totalAmount > 0) {
        await CustomerModel.addPayment(customerId, {
          total_amount: totalAmount,
          payment_status: payment.payment_status || updates.paymentStatus || 'ממתין לתשלום',
          start_date: payment.start_date ? new Date(payment.start_date) : new Date(),
          installments: payment.installments || 1,
          installment_amount: payment.installment_amount || (totalAmount / (payment.installments || 1)),
          payment_type: payment.payment_type || updates.paymentType || 'amount',
          payment_value: payment.payment_value || updates.paymentValue || 0,
          vat_included: payment.vat_included || updates.paymentVatIncluded || false,
          notes: payment.notes || `תשלום עבור: ${updates.products?.join(', ') || 'שירות'}`
        });
      }
    }
    
    const customer = await CustomerModel.update(customerId, customerUpdates);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ 
      error: 'Failed to update customer',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if customer exists and user has permission
    const existingCustomer = await CustomerModel.findById(parseInt(id as string));
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if user has permission to delete this customer
    if (existingCustomer.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await CustomerModel.delete(parseInt(id as string));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Search customers
router.get('/search/:term', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { term } = req.params;
    const allCustomers = await CustomerModel.search(term);
    // Filter customers to only show those created by the current user
    const customers = allCustomers.filter(customer => customer.created_by === req.user.id);
    res.json({ customers, total: customers.length });
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// Get customer services
router.get('/:id/services', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const services = await CustomerModel.getServices(parseInt(id as string));
    res.json({ services });
  } catch (error) {
    console.error('Error fetching customer services:', error);
    res.status(500).json({ error: 'Failed to fetch customer services' });
  }
});

// Add service to customer
router.post('/:id/services', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;
    
    const service = await CustomerModel.addService(parseInt(id as string), serviceData);
    res.status(201).json({ service });
  } catch (error) {
    console.error('Error adding customer service:', error);
    res.status(500).json({ error: 'Failed to add customer service' });
  }
});

// Get customer payments
router.get('/:id/payments', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const payments = await CustomerModel.getPayments(parseInt(id as string));
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ error: 'Failed to fetch customer payments' });
  }
});

// Add payment to customer
router.post('/:id/payments', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;
    
    const payment = await CustomerModel.addPayment(parseInt(id as string), paymentData);
    res.status(201).json({ payment });
  } catch (error) {
    console.error('Error adding customer payment:', error);
    res.status(500).json({ error: 'Failed to add customer payment' });
  }
});

// Convert lead to customer
router.post('/convert-from-lead/:leadId', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Extract products and totalAmount for separate handling
    const { products, totalAmount, vatType, paymentPlan, paymentType, paymentValue, paymentVatIncluded, ...customerFields } = req.body;
    
    // Remove any undefined or null values and fix field names
    const customerData = {
      full_name: customerFields.full_name || customerFields.name,
      phone: customerFields.phone,
      email: customerFields.email,
      status: customerFields.status || 'פעיל',
      address: customerFields.address,
      company_name: customerFields.company_name || customerFields.company,
      vat_number: customerFields.vat_number || customerFields.vatNumber,
      assigned_rep: customerFields.assigned_rep || customerFields.assignedTo,
      payment_status: customerFields.payment_status || customerFields.paymentStatus || 'ממתין לתשלום',
      billing_frequency: customerFields.billing_frequency || customerFields.billingFrequency || 'חד פעמי',
      total_amount: totalAmount || 0,
      start_date: customerFields.start_date || customerFields.startDate,
      payment_type: paymentType || 'amount',
      payment_value: paymentValue || 0,
      payment_vat_included: paymentVatIncluded || false,
      notes: customerFields.notes,
      created_by: req.user.id,
      client_id: req.user.client_id || null,
      lead_id: parseInt(leadId as string),
      payment_plan: paymentPlan || customerFields.payment_plan
    };
    
    const customer = await CustomerModel.createFromLead(parseInt(leadId as string), customerData);
    
    // Handle products as services if provided
    if (products && Array.isArray(products) && products.length > 0) {
      for (const product of products) {
        if (product.trim()) {
          await CustomerModel.addService(customer.id, {
            service_name: product.trim(),
            amount: totalAmount ? (totalAmount / products.length) : 0,
            tax_type: vatType || 'plus',
            total: totalAmount || 0,
            billing_frequency: customerData.billing_frequency || 'חד פעמי'
          });
        }
      }
    }
    
    // Handle payment plan if provided
    if (totalAmount && totalAmount > 0) {
      await CustomerModel.addPayment(customer.id, {
        total_amount: totalAmount,
        payment_status: customerData.payment_status || 'ממתין לתשלום',
        start_date: customerData.start_date ? new Date(customerData.start_date) : new Date(),
        installments: req.body.payment_plan?.numberOfPayments || 1,
        installment_amount: req.body.payment_plan?.monthlyAmount || totalAmount,
        payment_type: paymentType || 'amount',
        payment_value: paymentValue || 0,
        vat_included: paymentVatIncluded || false,
        notes: `תשלום עבור: ${products?.join(', ') || 'שירות'}`
      });
    }
    
    res.status(201).json({ customer });
  } catch (error) {
    console.error('Error converting lead to customer:', error);
    res.status(500).json({ error: 'Failed to convert lead to customer' });
  }
});

// Get customers by status
router.get('/status/:status', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { status } = req.params;
    const allCustomers = await CustomerModel.findByStatus(status);
    // Filter customers to only show those created by the current user
    const customers = allCustomers.filter(customer => customer.created_by === req.user.id);
    res.json({ customers, total: customers.length });
  } catch (error) {
    console.error('Error fetching customers by status:', error);
    res.status(500).json({ error: 'Failed to fetch customers by status' });
  }
});

// Get customer statistics
router.get('/stats/summary', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    // Get statistics only for customers created by the current user
    const userCustomers = await CustomerModel.findByCreatedBy(req.user.id);
    
    const statusCounts: { [key: string]: number } = {};
    const paymentStatusCounts: { [key: string]: number } = {};
    let totalRevenue = 0;
    
    userCustomers.forEach(customer => {
      // Count by status
      const status = customer.status || 'לא מוגדר';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count by payment status
      const paymentStatus = customer.payment_status || 'לא מוגדר';
      paymentStatusCounts[paymentStatus] = (paymentStatusCounts[paymentStatus] || 0) + 1;
      
      // Calculate total revenue from payments
      if ((customer as any).payments && Array.isArray((customer as any).payments)) {
        (customer as any).payments.forEach((payment: any) => {
          totalRevenue += payment.total_amount || 0;
        });
      }
    });
    
    const stats = {
      total: userCustomers.length,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byPaymentStatus: Object.entries(paymentStatusCounts).map(([payment_status, count]) => ({ payment_status, count })),
      totalRevenue
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    res.status(500).json({ error: 'Failed to fetch customer statistics' });
  }
});

// Export customers to Excel
router.get('/export', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    // All users (including admins) export only customers they created
    const customers = await CustomerModel.findByCreatedBy(req.user.id);

    // Transform data for Excel export
    const exportData = customers.map(customer => ({
      'מזהה': customer.id,
      'שם מלא': customer.full_name,
      'טלפון': customer.phone,
      'אימייל': customer.email,
      'כתובת': customer.address,
      'חברה': customer.company_name,
      'מס\' עוסק': customer.vat_number,
      'נציג מטפל': customer.assigned_rep,
      'סטטוס': customer.status,
      'סטטוס תשלום': customer.payment_status,
      'תדירות חיוב': customer.billing_frequency,
      'תאריך התחלה': customer.start_date,
      'הערות': customer.notes,
      'תאריך יצירה': customer.created_at
    }));

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, // מזהה
      { wch: 25 }, // שם מלא
      { wch: 15 }, // טלפון
      { wch: 30 }, // אימייל
      { wch: 40 }, // כתובת
      { wch: 20 }, // חברה
      { wch: 15 }, // מס' עוסק
      { wch: 20 }, // נציג מטפל
      { wch: 15 }, // סטטוס
      { wch: 20 }, // סטטוס תשלום
      { wch: 15 }, // תדירות חיוב
      { wch: 15 }, // תאריך התחלה
      { wch: 40 }, // הערות
      { wch: 20 }  // תאריך יצירה
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'לקוחות');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

// TEMPORARY: Fix existing customers client_id
router.post('/fix-client-ids', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can fix client IDs' });
    }
    
    console.log('🔄 Fixing existing customers client_id...');
    
    // Update all customers that don't have client_id and were created by admin user
    const result = await query(
      'UPDATE customers SET client_id = 2 WHERE client_id IS NULL AND created_by = $1 RETURNING id, full_name, client_id',
      [req.user.id]
    );
    
    console.log('Updated customers:', result.rows);
    
    res.json({ 
      message: `Successfully updated ${result.rowCount} customers`,
      updatedCustomers: result.rows
    });
    
  } catch (error) {
    console.error('Error fixing client IDs:', error);
    res.status(500).json({ error: 'Failed to fix client IDs' });
  }
});

export default router;
