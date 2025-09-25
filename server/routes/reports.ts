import express, { Request, Response } from 'express';
import { LeadModel } from '../models/Lead.js';
import { CustomerModel } from '../models/Customer.js';
import { authenticateToken, AuthenticatedRequest, withAuth } from '../middleware/auth.js';
import { query } from '../database/connection.js';

const router = express.Router();

// Get comprehensive reports data
router.get('/dashboard', authenticateToken, async (req: any, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user context from authenticated request
    const userId = req.user.id;
    const clientId = req.user.client_id;
    const isAdmin = req.user.role === 'admin';

    console.log('User context:', { userId, clientId, isAdmin, period, userRole: req.user.role, userEmail: req.user.email });

    // Build base query conditions - ALL users see only their own data
    let leadWhereClause = '';
    let customerWhereClause = '';
    let leadParams: any[] = [];
    let customerParams: any[] = [];

    // CONFIRMED: Everyone (admin/manager/agent) sees only their own data, no team data
    leadWhereClause = 'WHERE assigned_to = $1';
    customerWhereClause = 'WHERE created_by = $1';
    leadParams = [userId];
    customerParams = [userId];

    console.log('Reports filtering - ONLY USER DATA:', { 
      leadWhereClause, 
      customerWhereClause, 
      leadParams, 
      customerParams,
      userId,
      userRole: req.user.role,
      message: 'This query shows ONLY data assigned to/created by the current user'
    });

    // 1. Total leads count
    const totalLeadsResult = await query(
      `SELECT COUNT(*) as total FROM leads ${leadWhereClause}`,
      leadParams
    );
    const totalLeads = parseInt(totalLeadsResult.rows[0].total as string);
    console.log('Total leads result:', { totalLeads, query: `SELECT COUNT(*) as total FROM leads ${leadWhereClause}`, params: leadParams });

    // 2. New leads this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newLeadsThisWeekResult = await query(
      `SELECT COUNT(*) as total FROM leads ${leadWhereClause} ${leadWhereClause ? 'AND' : 'WHERE'} created_at >= $${leadParams.length + 1}`,
      [...leadParams, weekAgo]
    );
    const newLeadsThisWeek = parseInt(newLeadsThisWeekResult.rows[0].total as string);

    // 3. Converted leads (leads that became customers)
    const convertedLeadsResult = await query(
      `SELECT COUNT(*) as total FROM leads ${leadWhereClause} ${leadWhereClause ? 'AND' : 'WHERE'} customer_id IS NOT NULL`,
      leadParams
    );
    const convertedLeads = parseInt(convertedLeadsResult.rows[0].total as string);

    // 4. Total potential value (from customers total_amount)
    const potentialValueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM customers ${customerWhereClause} ${customerWhereClause ? 'AND' : 'WHERE'} total_amount IS NOT NULL`,
      customerParams
    );
    const totalPotentialValue = parseFloat(potentialValueResult.rows[0].total) || 0;

    // 5. Status distribution
    const statusDistributionResult = await query(
      `SELECT status, COUNT(*) as count FROM leads ${leadWhereClause} GROUP BY status ORDER BY count DESC`,
      leadParams
    );
    const statusDistribution = statusDistributionResult.rows;

    // 6. Source distribution
    const sourceDistributionResult = await query(
      `SELECT source, COUNT(*) as count FROM leads ${leadWhereClause} GROUP BY source ORDER BY count DESC`,
      leadParams
    );
    const sourceDistribution = sourceDistributionResult.rows;

    // 7. Payment status distribution with amounts
    const paymentStatusResult = await query(
      `SELECT 
         payment_status,
         COUNT(*) as count,
         COALESCE(SUM(total_amount), 0) as total_amount
       FROM customers 
       ${customerWhereClause}
       GROUP BY payment_status 
       ORDER BY total_amount DESC`,
      customerParams
    );
    const paymentStatusDistribution = paymentStatusResult.rows;

    // 8. Recent activity (last 30 days) - simplified
    const recentActivityResult = await query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as leads_count
       FROM leads 
       ${leadWhereClause} ${leadWhereClause ? 'AND' : 'WHERE'} created_at >= $${leadParams.length + 1}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 7`,
      [...leadParams, startDate]
    );
    const recentActivity = recentActivityResult.rows;

    // 9. Customer statistics
    const customerStatsResult = await query(
      `SELECT COUNT(*) as total FROM customers ${customerWhereClause}`,
      customerParams
    );
    const totalCustomers = parseInt(customerStatsResult.rows[0].total as string);

    // 10. Revenue data (if available) - only for user's customers
    const revenueResult = await query(
      `SELECT COALESCE(SUM(p.total_amount), 0) as total 
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ${customerWhereClause}`,
      customerParams
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100) : 0;

    // Calculate week-over-week growth
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const previousWeekResult = await query(
      `SELECT COUNT(*) as total FROM leads 
       ${leadWhereClause} ${leadWhereClause ? 'AND' : 'WHERE'} created_at >= $${leadParams.length + 1} AND created_at < $${leadParams.length + 2}`,
      [...leadParams, twoWeeksAgo, weekAgo]
    );
    const previousWeekLeads = parseInt(previousWeekResult.rows[0].total as string);
    const weekGrowth = previousWeekLeads > 0 ? 
      (((newLeadsThisWeek - previousWeekLeads) / previousWeekLeads) * 100) : 0;

    // Return real data with payment status distribution
    const realData = {
      summary: {
        totalLeads,
        newLeadsThisWeek,
        convertedLeads,
        totalPotentialValue,
        totalCustomers,
        totalRevenue,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        weekGrowth: parseFloat(weekGrowth.toFixed(1))
      },
      charts: {
        statusDistribution,
        sourceDistribution,
        recentActivity,
        paymentStatusDistribution
      },
      _meta: {
        message: 'דוחות מוצגים עבור המשתמש הנוכחי בלבד - ללא נתוני נציגים',
        userId: userId,
        userRole: req.user.role,
        filterCriteria: {
          leads: 'assigned_to = current_user_id',
          customers: 'created_by = current_user_id'
        }
      }
    };

    console.log('Dashboard reports response - USER DATA ONLY:', { 
      userId, 
      userRole: req.user.role, 
      totalLeads, 
      totalCustomers,
      message: 'Reports show only current user data - no team data included'
    });

    res.json(realData);

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports data' });
  }
});

// Get detailed lead analytics
router.get('/leads/analytics', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userId = req.user.id;
    const clientId = req.user.client_id;
    const isAdmin = req.user.role === 'admin';

    // Build query conditions - ALL users see only their own data
    let whereClause = '';
    let params: any[] = [];

    // CONFIRMED: Everyone (admin/manager/agent) sees only their own data, no team data
    whereClause = 'WHERE assigned_to = $1';
    params = [userId];
    
    console.log('Lead Analytics filtering - ONLY USER DATA:', { 
      whereClause, 
      params,
      userId,
      userRole: req.user.role,
      message: 'Lead analytics shows ONLY data assigned to the current user'
    });

    // Lead performance by user
    const userPerformanceResult = await query(
      `SELECT 
         u.first_name || ' ' || u.last_name as user_name,
         COUNT(l.id) as total_leads,
         COUNT(CASE WHEN l.customer_id IS NOT NULL THEN 1 END) as converted_leads,
         ROUND(COUNT(CASE WHEN l.customer_id IS NOT NULL THEN 1 END)::numeric / COUNT(l.id) * 100, 1) as conversion_rate
       FROM leads l
       JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY total_leads DESC`,
      params
    );

    // Lead quality analysis
    const qualityAnalysisResult = await query(
      `SELECT 
         CASE 
           WHEN potential_value > 10000 THEN 'High Value'
           WHEN potential_value > 5000 THEN 'Medium Value'
           WHEN potential_value > 0 THEN 'Low Value'
           ELSE 'No Value Set'
         END as value_category,
         COUNT(*) as count,
         ROUND(AVG(potential_value), 2) as avg_value
       FROM leads 
       ${whereClause}
       GROUP BY value_category
       ORDER BY count DESC`,
      params
    );

    // Lead source performance
    const sourcePerformanceResult = await query(
      `SELECT 
         source,
         COUNT(*) as total_leads,
         COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as converted_leads,
         ROUND(COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100, 1) as conversion_rate,
         ROUND(AVG(potential_value), 2) as avg_potential_value
       FROM leads 
       ${whereClause}
       GROUP BY source
       HAVING COUNT(*) > 0
       ORDER BY conversion_rate DESC, total_leads DESC`,
      params
    );

    // Lead status progression
    const statusProgressionResult = await query(
      `SELECT 
         status,
         COUNT(*) as count,
         ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400), 1) as avg_days_in_status
       FROM leads 
       ${whereClause}
       GROUP BY status
       ORDER BY count DESC`,
      params
    );

    const realData = {
      userPerformance: userPerformanceResult.rows,
      qualityAnalysis: qualityAnalysisResult.rows,
      sourcePerformance: sourcePerformanceResult.rows,
      statusProgression: statusProgressionResult.rows,
      _meta: {
        message: 'אנליטיקה של לידים עבור המשתמש הנוכחי בלבד - ללא נתוני נציגים',
        userId: userId,
        userRole: req.user.role,
        filterCriteria: 'assigned_to = current_user_id'
      }
    };

    console.log('Lead Analytics response - USER DATA ONLY:', { 
      userId, 
      userRole: req.user.role, 
      totalUserLeads: userPerformanceResult.rows.length,
      message: 'Lead analytics show only current user data - no team data included'
    });

    res.json(realData);

  } catch (error) {
    console.error('Error fetching lead analytics:', error);
    res.status(500).json({ error: 'Failed to fetch lead analytics' });
  }
}));

// Get customer analytics
router.get('/customers/analytics', withAuth(async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.user.client_id;
    const isAdmin = req.user.role === 'admin';

    // Build query conditions - ALL users see only their own data
    let whereClause = '';
    let params: any[] = [];

    // CONFIRMED: Everyone (admin/manager/agent) sees only their own data, no team data
    whereClause = 'WHERE created_by = $1';
    params = [userId];
    
    console.log('Customer Analytics filtering - ONLY USER DATA:', { 
      whereClause, 
      params,
      userId,
      userRole: req.user.role,
      message: 'Customer analytics shows ONLY data created by the current user'
    });

    // Customer status distribution
    const statusResult = await query(
      `SELECT status, COUNT(*) as count FROM customers 
       ${whereClause}
       GROUP BY status ORDER BY count DESC`,
      params
    );

    // Payment status distribution
    const paymentStatusResult = await query(
      `SELECT payment_status, COUNT(*) as count FROM customers 
       ${whereClause}
       GROUP BY payment_status ORDER BY count DESC`,
      params
    );

    // Revenue by month (last 12 months)
    const revenueByMonthResult = await query(
      `SELECT 
         DATE_TRUNC('month', p.created_at) as month,
         SUM(p.total_amount) as revenue,
         COUNT(p.id) as payment_count
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ${whereClause}
       GROUP BY DATE_TRUNC('month', p.created_at)
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    // Customer lifetime value analysis
    const customerValueResult = await query(
      `SELECT 
         c.id,
         c.full_name,
         c.status,
         COALESCE(SUM(p.total_amount), 0) as total_revenue,
         COUNT(p.id) as payment_count,
         ROUND(AVG(p.total_amount), 2) as avg_payment
       FROM customers c
       LEFT JOIN payments p ON c.id = p.customer_id
       ${whereClause}
       GROUP BY c.id, c.full_name, c.status
       ORDER BY total_revenue DESC
       LIMIT 10`,
      params
    );

    // Customer acquisition trends
    const acquisitionTrendResult = await query(
      `SELECT 
         DATE_TRUNC('month', created_at) as month,
         COUNT(*) as new_customers
       FROM customers 
       ${whereClause}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    // Customer retention analysis
    const retentionResult = await query(
      `SELECT 
         CASE 
           WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - created_at))/86400 <= 30 THEN 'New (0-30 days)'
           WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - created_at))/86400 <= 90 THEN 'Recent (31-90 days)'
           WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - created_at))/86400 <= 365 THEN 'Established (91-365 days)'
           ELSE 'Long-term (365+ days)'
         END as customer_age_group,
         COUNT(*) as count,
         ROUND(AVG(COALESCE((SELECT SUM(total_amount) FROM payments WHERE customer_id = customers.id), 0)), 2) as avg_revenue
       FROM customers 
       ${whereClause}
       GROUP BY customer_age_group
       ORDER BY count DESC`,
      params
    );

    const realData = {
      statusDistribution: statusResult.rows,
      paymentStatusDistribution: paymentStatusResult.rows,
      revenueByMonth: revenueByMonthResult.rows,
      topCustomers: customerValueResult.rows,
      acquisitionTrend: acquisitionTrendResult.rows,
      retentionAnalysis: retentionResult.rows,
      _meta: {
        message: 'אנליטיקה של לקוחות עבור המשתמש הנוכחי בלבד - ללא נתוני נציגים',
        userId: userId,
        userRole: req.user.role,
        filterCriteria: 'created_by = current_user_id'
      }
    };

    console.log('Customer Analytics response - USER DATA ONLY:', { 
      userId, 
      userRole: req.user.role, 
      totalCustomers: statusResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count as string), 0),
      message: 'Customer analytics show only current user data - no team data included'
    });

    res.json(realData);

  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    res.status(500).json({ error: 'Failed to fetch customer analytics' });
  }
}));

export default router;