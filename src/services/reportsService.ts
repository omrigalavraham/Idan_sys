import { API_BASE_URL } from '../config/api.js';

export interface ReportsSummary {
  totalLeads: number;
  newLeadsThisWeek: number;
  convertedLeads: number;
  totalPotentialValue: number;
  totalCustomers: number;
  totalRevenue: number;
  conversionRate: number;
  weekGrowth: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface SourceDistribution {
  source: string;
  count: number;
}

export interface ConversionTrend {
  month: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: string;
}

export interface RecentActivity {
  date: string;
  leads_count: number;
}

export interface ReportsData {
  summary: ReportsSummary;
  charts: {
    statusDistribution: StatusDistribution[];
    sourceDistribution: SourceDistribution[];
    recentActivity: RecentActivity[];
    paymentStatusDistribution: Array<{
      payment_status: string;
      count: number;
      total_amount: number;
    }>;
  };
}

export interface LeadAnalytics {
  userPerformance: Array<{
    user_name: string;
    total_leads: number;
    converted_leads: number;
    conversion_rate: number;
  }>;
  qualityAnalysis: Array<{
    value_category: string;
    count: number;
    avg_value: number;
  }>;
  sourcePerformance: Array<{
    source: string;
    total_leads: number;
    converted_leads: number;
    conversion_rate: number;
    avg_potential_value: number;
  }>;
  statusProgression: Array<{
    status: string;
    count: number;
    avg_days_in_status: number;
  }>;
}

export interface CustomerAnalytics {
  statusDistribution: StatusDistribution[];
  paymentStatusDistribution: StatusDistribution[];
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    payment_count: number;
  }>;
  topCustomers: Array<{
    id: number;
    full_name: string;
    status: string;
    total_revenue: number;
    payment_count: number;
    avg_payment: number;
  }>;
  acquisitionTrend: Array<{
    month: string;
    new_customers: number;
  }>;
  retentionAnalysis: Array<{
    customer_age_group: string;
    count: number;
    avg_revenue: number;
  }>;
}

class ReportsService {
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const sessionToken = localStorage.getItem('session_token');
    const accessToken = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken || '',
        'Authorization': `Bearer ${accessToken || ''}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'שגיאה בקבלת נתונים');
    }

    return response.json();
  }

  async getDashboardReports(period: string = '30'): Promise<ReportsData> {
    try {
      const response = await this.makeRequest(`/reports/dashboard?period=${period}`);
      return response;
    } catch (error) {
      console.error('Error fetching dashboard reports:', error);
      throw new Error('Failed to fetch dashboard reports');
    }
  }

  async getLeadAnalytics(period: string = '30'): Promise<LeadAnalytics> {
    try {
      const response = await this.makeRequest(`/reports/leads/analytics?period=${period}`);
      return response;
    } catch (error) {
      console.error('Error fetching lead analytics:', error);
      throw new Error('Failed to fetch lead analytics');
    }
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    try {
      const response = await this.makeRequest('/reports/customers/analytics');
      return response;
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw new Error('Failed to fetch customer analytics');
    }
  }
}

export const reportsService = new ReportsService();
