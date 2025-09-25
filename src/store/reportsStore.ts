import { create } from 'zustand';
import { reportsService, ReportsData, LeadAnalytics, CustomerAnalytics } from '../services/reportsService';

interface ReportsStore {
  // Data
  reportsData: ReportsData | null;
  leadAnalytics: LeadAnalytics | null;
  customerAnalytics: CustomerAnalytics | null;
  
  // Loading states
  isLoading: boolean;
  isLeadAnalyticsLoading: boolean;
  isCustomerAnalyticsLoading: boolean;
  
  // Error states
  error: string | null;
  leadAnalyticsError: string | null;
  customerAnalyticsError: string | null;
  
  // Actions
  fetchReportsData: (period?: string) => Promise<void>;
  fetchLeadAnalytics: (period?: string) => Promise<void>;
  fetchCustomerAnalytics: () => Promise<void>;
  clearError: () => void;
  clearAllData: () => void;
}

export const useReportsStore = create<ReportsStore>((set) => ({
  // Initial state
  reportsData: null,
  leadAnalytics: null,
  customerAnalytics: null,
  isLoading: false,
  isLeadAnalyticsLoading: false,
  isCustomerAnalyticsLoading: false,
  error: null,
  leadAnalyticsError: null,
  customerAnalyticsError: null,

  // Fetch main reports data
  fetchReportsData: async (period = '30') => {
    set({ isLoading: true, error: null });
    try {
      const data = await reportsService.getDashboardReports(period);
      set({ reportsData: data, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reports data';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Fetch lead analytics
  fetchLeadAnalytics: async (period = '30') => {
    set({ isLeadAnalyticsLoading: true, leadAnalyticsError: null });
    try {
      const data = await reportsService.getLeadAnalytics(period);
      set({ leadAnalytics: data, isLeadAnalyticsLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch lead analytics';
      set({ leadAnalyticsError: errorMessage, isLeadAnalyticsLoading: false });
    }
  },

  // Fetch customer analytics
  fetchCustomerAnalytics: async () => {
    set({ isCustomerAnalyticsLoading: true, customerAnalyticsError: null });
    try {
      const data = await reportsService.getCustomerAnalytics();
      set({ customerAnalytics: data, isCustomerAnalyticsLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer analytics';
      set({ customerAnalyticsError: errorMessage, isCustomerAnalyticsLoading: false });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null, leadAnalyticsError: null, customerAnalyticsError: null });
  },

  // Clear all data
  clearAllData: () => {
    set({
      reportsData: null,
      leadAnalytics: null,
      customerAnalytics: null,
      error: null,
      leadAnalyticsError: null,
      customerAnalyticsError: null,
    });
  },
}));
