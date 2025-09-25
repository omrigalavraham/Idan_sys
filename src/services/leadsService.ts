import axios from 'axios';
import { API_CONFIG } from '../config/api.js';

// Create axios instance with default config
const apiClient = axios.create(API_CONFIG);

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Lead {
  id: number;
  customer_id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  followup_date: string | null;
  followup_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadData {
  customer_id: number;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  source?: string;
  followup_date?: string;
  followup_time?: string;
  notes?: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export interface ImportResponse {
  message: string;
  imported: number;
  total: number;
  leads: Lead[];
}

export class LeadsService {
  // Get all leads
  static async getLeads(limit = 50, offset = 0): Promise<LeadsResponse> {
    const response = await apiClient.get(`/leads?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  // Get lead by ID
  static async getLead(id: number): Promise<{ lead: Lead }> {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data;
  }

  // Create new lead
  static async createLead(leadData: CreateLeadData): Promise<{ lead: Lead }> {
    const response = await apiClient.post('/leads', leadData);
    return response.data;
  }

  // Update lead
  static async updateLead(id: number, updates: Partial<Lead>): Promise<{ lead: Lead }> {
    const response = await apiClient.put(`/leads/${id}`, updates);
    return response.data;
  }

  // Delete lead
  static async deleteLead(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/leads/${id}`);
    return response.data;
  }

  // Search leads
  static async searchLeads(term: string): Promise<LeadsResponse> {
    const response = await apiClient.get(`/leads/search/${encodeURIComponent(term)}`);
    return response.data;
  }

  // Get leads by status
  static async getLeadsByStatus(status: string): Promise<LeadsResponse> {
    const response = await apiClient.get(`/leads/status/${status}`);
    return response.data;
  }

  // Get leads statistics
  static async getLeadsStats(): Promise<{ stats: { status: string; count: number }[] }> {
    const response = await apiClient.get('/leads/stats/count');
    return response.data;
  }

  // Import leads from Excel
  static async importLeadsFromExcel(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/leads/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Download Excel template
  static async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get('/leads/template/excel', {
      responseType: 'blob',
    });

    return response.data;
  }
}

export default LeadsService;
