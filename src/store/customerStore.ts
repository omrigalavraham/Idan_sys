import { API_BASE_URL } from '../config/api.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer } from '../types';
import { useSyncStore } from './syncStore';
import toast from 'react-hot-toast';

interface CustomerStore {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  
  // API functions
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  createFromLead: (leadId: string, customerData: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  setSelectedCustomer: (customer: Customer | null) => void;
  getCustomerById: (id: string) => Customer | null;
  getCustomersByStatus: (status: Customer['status']) => Customer[];
  exportCustomers: () => Promise<void>;
  clearCustomers: () => void;
}

const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: [],
      selectedCustomer: null,
      isLoading: false,
      error: null,

      fetchCustomers: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            console.warn('No authentication tokens found, skipping customers fetch');
            set({ isLoading: false, error: null });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בטעינת הלקוחות');
          }

          const data = await response.json();
          
          // Transform server data to match our Customer interface
          const customers = data.customers?.map((customer: any) => ({
            id: customer.id.toString(),
            leadId: customer.lead_id?.toString(),
            createdBy: customer.created_by?.toString(),
            clientId: customer.client_id?.toString(),
            name: customer.full_name || customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            company: customer.company_name || customer.company,
            vatNumber: customer.vat_number,
            assignedTo: customer.assigned_rep || customer.assigned_to,
            status: customer.status,
            paymentStatus: customer.payment_status,
            products: customer.services?.map((service: any) => service.service_name) || customer.products || [],
            totalAmount: parseFloat(customer.total_amount) || 0,
            billingFrequency: customer.billing_frequency,
            startDate: customer.start_date,
            notes: customer.notes,
            vatType: customer.vat_type || 'plus',
            paymentType: customer.payment_type || 'amount',
            paymentValue: parseFloat(customer.payment_value) || 0,
            paymentVatIncluded: customer.payment_vat_included || false,
            paymentPlan: customer.payments && customer.payments.length > 0 ? {
              numberOfPayments: customer.payments[0].installments || 1,
              monthlyAmount: customer.payments[0].installment_amount || 0,
              firstPaymentDate: customer.payments[0].start_date || customer.start_date
            } : customer.payment_plan,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
            tags: customer.tags || [],
            customFields: customer.custom_fields || {},
            services: customer.services || [],
            payments: customer.payments || [],
            // Keep original server field names for compatibility
            full_name: customer.full_name,
            company_name: customer.company_name,
            vat_number: customer.vat_number,
            assigned_rep: customer.assigned_rep,
            billing_frequency: customer.billing_frequency,
            start_date: customer.start_date,
            payment_status: customer.payment_status,
            vat_type: customer.vat_type,
            payment_type: customer.payment_type,
            payment_value: customer.payment_value,
            payment_vat_included: customer.payment_vat_included
          })) || [];

          set({ customers, isLoading: false });
        } catch (error) {
          console.error('Error fetching customers:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת הלקוחות',
            isLoading: false 
          });
          toast.error('שגיאה בטעינת הלקוחות');
        }
      },

      addCustomer: async (customerData: Omit<Customer, 'id'>) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              leadId: customerData.leadId,
              clientId: customerData.clientId, // הוספת client_id
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone,
              address: customerData.address,
              company: customerData.company,
              vatNumber: customerData.vatNumber,
              assignedTo: customerData.assignedTo,
              status: customerData.status,
              paymentStatus: customerData.paymentStatus,
              products: customerData.products,
              totalAmount: customerData.totalAmount,
              billingFrequency: customerData.billingFrequency,
              startDate: customerData.startDate,
              notes: customerData.notes,
              vatType: customerData.vatType,
              paymentPlan: customerData.paymentPlan,
              tags: customerData.tags || [],
              customFields: customerData.customFields || {}
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת הלקוח');
          }

          const newCustomerData = await response.json();
          
          // Add the new customer directly to the store instead of refetching all customers
          const newCustomer = {
            id: newCustomerData.customer.id.toString(),
            leadId: newCustomerData.customer.lead_id?.toString(),
            createdBy: newCustomerData.customer.created_by?.toString(),
            clientId: newCustomerData.customer.client_id?.toString(),
            name: newCustomerData.customer.full_name || newCustomerData.customer.name,
            email: newCustomerData.customer.email,
            phone: newCustomerData.customer.phone,
            address: newCustomerData.customer.address,
            company: newCustomerData.customer.company_name || newCustomerData.customer.company,
            vatNumber: newCustomerData.customer.vat_number,
            assignedTo: newCustomerData.customer.assigned_rep || newCustomerData.customer.assigned_to,
            status: newCustomerData.customer.status,
            paymentStatus: newCustomerData.customer.payment_status,
            products: newCustomerData.customer.services?.map((service: any) => service.service_name) || newCustomerData.customer.products || [],
            totalAmount: parseFloat(newCustomerData.customer.total_amount) || 0,
            billingFrequency: newCustomerData.customer.billing_frequency,
            startDate: newCustomerData.customer.start_date,
            notes: newCustomerData.customer.notes,
            vatType: newCustomerData.customer.vat_type || 'plus',
            paymentType: newCustomerData.customer.payment_type || 'amount',
            paymentValue: parseFloat(newCustomerData.customer.payment_value) || 0,
            paymentVatIncluded: newCustomerData.customer.payment_vat_included || false,
            paymentPlan: newCustomerData.customer.payments && newCustomerData.customer.payments.length > 0 ? {
              numberOfPayments: newCustomerData.customer.payments[0].installments || 1,
              monthlyAmount: newCustomerData.customer.payments[0].installment_amount || 0,
              firstPaymentDate: newCustomerData.customer.payments[0].start_date || newCustomerData.customer.start_date
            } : newCustomerData.customer.payment_plan,
            createdAt: newCustomerData.customer.created_at,
            updatedAt: newCustomerData.customer.updated_at,
            tags: newCustomerData.customer.tags || [],
            customFields: newCustomerData.customer.custom_fields || {},
            services: newCustomerData.customer.services || [],
            payments: newCustomerData.customer.payments || []
          };

          // Update the store with the new customer
          set(state => ({
            customers: [...state.customers, newCustomer]
          }));

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'customer',
            action: 'create',
            entityId: newCustomer.id,
            userId: 'system',
            data: newCustomer
          });
          
          toast.success('הלקוח נוצר בהצלחה');
          set({ selectedCustomer: null });
        } catch (error) {
          console.error('Error adding customer:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      createFromLead: async (leadId: string, customerData: Omit<Customer, 'id'>) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/customers/convert-from-lead/${leadId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              clientId: customerData.clientId, // הוספת client_id
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone,
              address: customerData.address,
              company: customerData.company,
              vatNumber: customerData.vatNumber,
              assignedTo: customerData.assignedTo,
              status: customerData.status,
              paymentStatus: customerData.paymentStatus,
              products: customerData.products,
              totalAmount: customerData.totalAmount,
              billingFrequency: customerData.billingFrequency,
              startDate: customerData.startDate,
              notes: customerData.notes,
              vatType: customerData.vatType,
              paymentPlan: customerData.paymentPlan,
              paymentType: customerData.paymentType,
              paymentValue: customerData.paymentValue,
              paymentVatIncluded: customerData.paymentVatIncluded,
              tags: customerData.tags || [],
              customFields: customerData.customFields || {}
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה ביצירת הלקוח מהליד');
          }

          const newCustomerData = await response.json();
          
          // Add the new customer directly to the store instead of refetching all customers
          const newCustomer = {
            id: newCustomerData.customer.id.toString(),
            leadId: newCustomerData.customer.lead_id?.toString(),
            createdBy: newCustomerData.customer.created_by?.toString(),
            clientId: newCustomerData.customer.client_id?.toString(),
            name: newCustomerData.customer.full_name || newCustomerData.customer.name,
            email: newCustomerData.customer.email,
            phone: newCustomerData.customer.phone,
            address: newCustomerData.customer.address,
            company: newCustomerData.customer.company_name || newCustomerData.customer.company,
            vatNumber: newCustomerData.customer.vat_number,
            assignedTo: newCustomerData.customer.assigned_rep || newCustomerData.customer.assigned_to,
            status: newCustomerData.customer.status,
            paymentStatus: newCustomerData.customer.payment_status,
            products: newCustomerData.customer.services?.map((service: any) => service.service_name) || newCustomerData.customer.products || [],
            totalAmount: parseFloat(newCustomerData.customer.total_amount) || 0,
            billingFrequency: newCustomerData.customer.billing_frequency,
            startDate: newCustomerData.customer.start_date,
            notes: newCustomerData.customer.notes,
            vatType: newCustomerData.customer.vat_type || 'plus',
            paymentType: newCustomerData.customer.payment_type || 'amount',
            paymentValue: parseFloat(newCustomerData.customer.payment_value) || 0,
            paymentVatIncluded: newCustomerData.customer.payment_vat_included || false,
            paymentPlan: newCustomerData.customer.payments && newCustomerData.customer.payments.length > 0 ? {
              numberOfPayments: newCustomerData.customer.payments[0].installments || 1,
              monthlyAmount: newCustomerData.customer.payments[0].installment_amount || 0,
              firstPaymentDate: newCustomerData.customer.payments[0].start_date || newCustomerData.customer.start_date
            } : newCustomerData.customer.payment_plan,
            createdAt: newCustomerData.customer.created_at,
            updatedAt: newCustomerData.customer.updated_at,
            tags: newCustomerData.customer.tags || [],
            customFields: newCustomerData.customer.custom_fields || {},
            services: newCustomerData.customer.services || [],
            payments: newCustomerData.customer.payments || []
          };

          // Update the store with the new customer
          set(state => ({
            customers: [...state.customers, newCustomer]
          }));

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'customer',
            action: 'create',
            entityId: newCustomer.id,
            userId: 'system',
            data: newCustomer
          });
          
          toast.success('הליד הומר ללקוח בהצלחה');
          set({ selectedCustomer: null });
        } catch (error) {
          console.error('Error creating customer from lead:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת הלקוח מהליד');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateCustomer: async (id: string, updates: Partial<Customer>) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בעדכון הלקוח');
          }

          // Refresh customers list
          await get().fetchCustomers();

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'customer',
            action: 'update',
            entityId: id,
            userId: 'system',
            data: updates
          });
          
          toast.success('הלקוח עודכן בהצלחה');
          set({ selectedCustomer: null });
        } catch (error) {
          console.error('Error updating customer:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteCustomer: async (id: string) => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה במחיקת הלקוח');
          }

          // Refresh customers list
          await get().fetchCustomers();

          // Add sync event
          useSyncStore.getState().addSyncEvent({
            type: 'customer',
            action: 'delete',
            entityId: id,
            userId: 'system',
            data: {}
          });
          
          toast.success('הלקוח נמחק בהצלחה');
          set({ selectedCustomer: null });
        } catch (error) {
          console.error('Error deleting customer:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת הלקוח');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      exportCustomers: async () => {
        try {
          set({ isLoading: true });

          const sessionToken = localStorage.getItem('session_token');
          const accessToken = localStorage.getItem('access_token');
          
          if (!sessionToken || !accessToken) {
            throw new Error('לא נמצא טוקן התחברות');
          }

          const response = await fetch(`${API_BASE_URL}/customers/export`, {
            method: 'GET',
            headers: {
              'X-Session-Token': sessionToken,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error('שגיאה בייצוא הלקוחות');
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `customers-${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.success('הלקוחות יוצאו בהצלחה');
        } catch (error) {
          console.error('Error exporting customers:', error);
          toast.error(error instanceof Error ? error.message : 'שגיאה בייצוא הלקוחות');
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedCustomer: (customer: Customer | null) => {
        set({ selectedCustomer: customer });
      },

      getCustomerById: (id: string) => {
        return get().customers.find(customer => customer.id === id) || null;
      },

      getCustomersByStatus: (status: Customer['status']) => {
        return get().customers.filter(customer => customer.status === status);
      },

      clearCustomers: () => {
        set({ customers: [], selectedCustomer: null, error: null });
      }
    }),
    {
      name: 'customer-storage',
      version: 2,
      partialize: (state) => ({
        // Only persist selected customer, not the full customers list
        selectedCustomer: state.selectedCustomer,
        isLoading: false,
        error: null
      })
    }
  )
);

export default useCustomerStore;