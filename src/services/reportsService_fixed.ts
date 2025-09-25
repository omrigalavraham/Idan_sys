import { API_BASE_URL } from '../config/api.js';

export interface ReportsData {
  totalLeads: number;
  totalCustomers: number;
  totalRevenue: number;
  conversionRate: number;
  leadsByStatus: Record<string, number>;
  customersByStatus: Record<string, number>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  topSources: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'lead' | 'customer' | 'payment';
    description: string;
    timestamp: string;
    amount?: number;
  }>;
}

export interface LeadAnalytics {
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  conversionRate: number;
  averageResponseTime: number;
  topPerformingAgents: Array<{
    agentId: string;
    agentName: string;
    leadsAssigned: number;
    conversionRate: number;
  }>;
  leadsByMonth: Array<{
    month: string;
    count: number;
    conversions: number;
  }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  customersByStatus: Record<string, number>;
  totalRevenue: number;
  averageOrderValue: number;
  customerRetentionRate: number;
  topProducts: Array<{
    product: string;
    sales: number;
    revenue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    customers: number;
  }>;
}

// Helper function for safe JSON parsing
const safeJsonParse = async (response: Response, url: string) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Non-JSON response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });
    throw new Error(`Server returned ${response.status} ${response.statusText} - Expected JSON but got ${contentType}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error(`Failed to parse JSON from ${url}:`, error);
    throw new Error(`Invalid JSON response from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

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
      const errorData = await safeJsonParse(response, `${API_BASE_URL}${url}`);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await safeJsonParse(response, `${API_BASE_URL}${url}`);
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
