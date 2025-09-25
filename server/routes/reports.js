import express from 'express';
import { authenticateToken, withAuth } from '../middleware/auth.js';
import { query } from '../database/connection.js';
const router = express.Router();
// Get comprehensive reports data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Get user context from authenticated request
        const userId = req.user.id;
        const clientId = req.user.client_id;
        const isAdmin = req.user.role === 'admin';
        console.log('User context:', { userId, clientId, isAdmin, period });
        // Build base query conditions based on user permissions
        let leadWhereClause = '';
        let customerWhereClause = '';
        let leadParams = [];
        let customerParams = [];
        if (clientId) {
            // User sees leads assigned to them or from their client
            leadWhereClause = 'WHERE (assigned_to = $1 OR client_id = $2)';
            customerWhereClause = 'WHERE (created_by = $1 OR client_id = $2)';
            leadParams = [userId, clientId];
            customerParams = [userId, clientId];
        }
        else {
            // All users (including admins) see only their own data
            leadWhereClause = 'WHERE assigned_to = $1';
            customerWhereClause = 'WHERE created_by = $1';
            leadParams = [userId];
            customerParams = [userId];
        }
        // 1. Total leads count
        const totalLeadsResult = await query(`SELECT COUNT(*) as total FROM leads ${leadWhereClause}`, leadParams);
        const totalLeads = parseInt(totalLeadsResult.rows[0].total);
        // 2. New leads this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newLeadsThisWeekResult = await query(`SELECT COUNT(*) as total FROM leads WHERE created_at >= $${leadParams.length + 1} ${leadWhereClause ? 'AND ' + leadWhereClause.replace('WHERE ', '') : ''}`, [...leadParams, weekAgo]);
        const newLeadsThisWeek = parseInt(newLeadsThisWeekResult.rows[0].total);
        // 3. Converted leads (leads that became customers)
        const convertedLeadsResult = await query(`SELECT COUNT(*) as total FROM leads WHERE customer_id IS NOT NULL ${leadWhereClause ? 'AND ' + leadWhereClause.replace('WHERE ', '') : ''}`, leadParams);
        const convertedLeads = parseInt(convertedLeadsResult.rows[0].total);
        // 4. Total potential value (from customers total_amount)
        const potentialValueResult = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM customers WHERE total_amount IS NOT NULL ${customerWhereClause ? 'AND ' + customerWhereClause.replace('WHERE ', '') : ''}`, customerParams);
        const totalPotentialValue = parseFloat(potentialValueResult.rows[0].total) || 0;
        // 5. Status distribution
        const statusDistributionResult = await query(`SELECT status, COUNT(*) as count FROM leads ${leadWhereClause} GROUP BY status ORDER BY count DESC`, leadParams);
        const statusDistribution = statusDistributionResult.rows;
        // 6. Source distribution
        const sourceDistributionResult = await query(`SELECT source, COUNT(*) as count FROM leads ${leadWhereClause} GROUP BY source ORDER BY count DESC`, leadParams);
        const sourceDistribution = sourceDistributionResult.rows;
        // 7. Payment status distribution with amounts
        const paymentStatusResult = await query(`SELECT 
         payment_status,
         COUNT(*) as count,
         COALESCE(SUM(total_amount), 0) as total_amount
       FROM customers 
       ${customerWhereClause}
       GROUP BY payment_status 
       ORDER BY total_amount DESC`, customerParams);
        const paymentStatusDistribution = paymentStatusResult.rows;
        // 8. Recent activity (last 30 days) - simplified
        const recentActivityResult = await query(`SELECT 
         DATE(created_at) as date,
         COUNT(*) as leads_count
       FROM leads 
       WHERE created_at >= $${leadParams.length + 1} ${leadWhereClause ? 'AND ' + leadWhereClause.replace('WHERE ', '') : ''}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 7`, [...leadParams, startDate]);
        const recentActivity = recentActivityResult.rows;
        // 9. Customer statistics
        const customerStatsResult = await query(`SELECT COUNT(*) as total FROM customers ${customerWhereClause}`, customerParams);
        const totalCustomers = parseInt(customerStatsResult.rows[0].total);
        // 10. Revenue data (if available) - only for user's customers
        const revenueResult = await query(`SELECT COALESCE(SUM(p.total_amount), 0) as total 
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ${customerWhereClause}`, customerParams);
        const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;
        // Calculate conversion rate
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100) : 0;
        // Calculate week-over-week growth
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const previousWeekResult = await query(`SELECT COUNT(*) as total FROM leads 
       WHERE created_at >= $${leadParams.length + 1} AND created_at < $${leadParams.length + 2} ${leadWhereClause ? 'AND ' + leadWhereClause.replace('WHERE ', '') : ''}`, [...leadParams, twoWeeksAgo, weekAgo]);
        const previousWeekLeads = parseInt(previousWeekResult.rows[0].total);
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
            }
        };
        res.json(realData);
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports data' });
    }
});
// Get detailed lead analytics
router.get('/leads/analytics', withAuth(async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const userId = req.user.id;
        const clientId = req.user.client_id;
        const isAdmin = req.user.role === 'admin';
        // Build query conditions
        let whereClause = '';
        let params = [];
        if (clientId) {
            whereClause = 'WHERE (assigned_to = $1 OR client_id = $2)';
            params = [userId, clientId];
        }
        else {
            // All users (including admins) see only their own data
            whereClause = 'WHERE assigned_to = $1';
            params = [userId];
        }
        // Lead performance by user
        const userPerformanceResult = await query(`SELECT 
         u.first_name || ' ' || u.last_name as user_name,
         COUNT(l.id) as total_leads,
         COUNT(CASE WHEN l.customer_id IS NOT NULL THEN 1 END) as converted_leads,
         ROUND(COUNT(CASE WHEN l.customer_id IS NOT NULL THEN 1 END)::numeric / COUNT(l.id) * 100, 1) as conversion_rate
       FROM leads l
       JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY total_leads DESC`, params);
        // Lead quality analysis
        const qualityAnalysisResult = await query(`SELECT 
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
       ORDER BY count DESC`, params);
        // Lead source performance
        const sourcePerformanceResult = await query(`SELECT 
         source,
         COUNT(*) as total_leads,
         COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as converted_leads,
         ROUND(COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100, 1) as conversion_rate,
         ROUND(AVG(potential_value), 2) as avg_potential_value
       FROM leads 
       ${whereClause}
       GROUP BY source
       HAVING COUNT(*) > 0
       ORDER BY conversion_rate DESC, total_leads DESC`, params);
        // Lead status progression
        const statusProgressionResult = await query(`SELECT 
         status,
         COUNT(*) as count,
         ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400), 1) as avg_days_in_status
       FROM leads 
       ${whereClause}
       GROUP BY status
       ORDER BY count DESC`, params);
        const realData = {
            userPerformance: userPerformanceResult.rows,
            qualityAnalysis: qualityAnalysisResult.rows,
            sourcePerformance: sourcePerformanceResult.rows,
            statusProgression: statusProgressionResult.rows
        };
        res.json(realData);
    }
    catch (error) {
        console.error('Error fetching lead analytics:', error);
        res.status(500).json({ error: 'Failed to fetch lead analytics' });
    }
}));
// Get customer analytics
router.get('/customers/analytics', withAuth(async (req, res) => {
    try {
        const userId = req.user.id;
        const clientId = req.user.client_id;
        const isAdmin = req.user.role === 'admin';
        // Build query conditions
        let whereClause = '';
        let params = [];
        if (clientId) {
            whereClause = 'WHERE (created_by = $1 OR client_id = $2)';
            params = [userId, clientId];
        }
        else {
            // All users (including admins) see only their own data
            whereClause = 'WHERE created_by = $1';
            params = [userId];
        }
        // Customer status distribution
        const statusResult = await query(`SELECT status, COUNT(*) as count FROM customers 
       ${whereClause}
       GROUP BY status ORDER BY count DESC`, params);
        // Payment status distribution
        const paymentStatusResult = await query(`SELECT payment_status, COUNT(*) as count FROM customers 
       ${whereClause}
       GROUP BY payment_status ORDER BY count DESC`, params);
        // Revenue by month (last 12 months)
        const revenueByMonthResult = await query(`SELECT 
         DATE_TRUNC('month', p.created_at) as month,
         SUM(p.total_amount) as revenue,
         COUNT(p.id) as payment_count
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ${whereClause}
       GROUP BY DATE_TRUNC('month', p.created_at)
       ORDER BY month DESC
       LIMIT 12`, params);
        // Customer lifetime value analysis
        const customerValueResult = await query(`SELECT 
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
       LIMIT 10`, params);
        // Customer acquisition trends
        const acquisitionTrendResult = await query(`SELECT 
         DATE_TRUNC('month', created_at) as month,
         COUNT(*) as new_customers
       FROM customers 
       ${whereClause}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`, params);
        // Customer retention analysis
        const retentionResult = await query(`SELECT 
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
       ORDER BY count DESC`, params);
        const realData = {
            statusDistribution: statusResult.rows,
            paymentStatusDistribution: paymentStatusResult.rows,
            revenueByMonth: revenueByMonthResult.rows,
            topCustomers: customerValueResult.rows,
            acquisitionTrend: acquisitionTrendResult.rows,
            retentionAnalysis: retentionResult.rows
        };
        res.json(realData);
    }
    catch (error) {
        console.error('Error fetching customer analytics:', error);
        res.status(500).json({ error: 'Failed to fetch customer analytics' });
    }
}));
export default router;
