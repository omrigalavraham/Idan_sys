import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, FileCheck, AlertCircle, UserCheck, Filter, UserPlus, Upload, MessageSquare, Calendar, Trash2, ChevronLeft, ChevronRight, UserCog } from 'lucide-react';
import { useLeadStore } from '../../store/leadStore';
import useCustomerStore from '../../store/customerStore';
import { useUserStore } from '../../store/userStore';
import { Customer } from '../../types';
import LeadCard from './LeadCard';
import LeadFormDialog from './LeadFormDialog';
import CreateCustomerDialog from '../customers/CreateCustomerDialog';
import BulkMessageDialog from './BulkMessageDialog';
import BulkAssignDialog from './BulkAssignDialog';
import { Lead, LeadStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LeadManagementProps {
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
}

const LeadManagement: React.FC<LeadManagementProps> = ({
  selectedLead: selectedLeadProp,
  setSelectedLead: setSelectedLeadProp
}) => {
  const { 
    leads, 
    totalLeads, 
    currentPage, 
    pageSize, 
    availableStatuses,
    fetchLeads, 
    deleteLead,
    bulkDeleteLeads,
    importFromExcel,
    setCurrentPage,
    setPageSize,
    setSelectedAgentId,
    selectedAgentId,
    updateAvailableStatuses
  } = useLeadStore();
  const { addCustomer, createFromLead } = useCustomerStore();
  const { user, clientConfig } = useAuthStore();
  const { users: agents, fetchAgentsByManager, fetchUsers } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<LeadStatus | 'הכל'>('הכל');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showAgentFilter, setShowAgentFilter] = useState(false);
  const [showPageSizeFilter, setShowPageSizeFilter] = useState(false);
  const [showAllLeads, setShowAllLeads] = useState(false); // For admin to toggle between own leads and all leads

  // Load leads on component mount and when page changes
  useEffect(() => {
    // For admin users, if no specific agent is selected and showAllLeads is false, show their own leads by default
    // For manager users, always show their own leads by default (no need for special button)
    let agentToShow = selectedAgentId;
    
    if (!selectedAgentId) {
      if (user?.role === 'admin' && !showAllLeads) {
        agentToShow = user.id;
      } else if (user?.role === 'manager') {
        agentToShow = user.id;
      }
    }
    
    fetchLeads(currentPage, pageSize, agentToShow || undefined);
  }, [currentPage, pageSize, selectedAgentId, user?.id, user?.role, showAllLeads, fetchLeads]);

  // Update available statuses when client config changes
  useEffect(() => {
    updateAvailableStatuses();
  }, [clientConfig, updateAvailableStatuses]);

  // Load agents for managers and all users for admins
  useEffect(() => {
    if (user?.role === 'manager') {
      fetchAgentsByManager();
    } else if (user?.role === 'admin') {
      // For admin, fetch all users
      fetchUsers();
    }
  }, [user?.role, fetchAgentsByManager, fetchUsers]);

  // Get leads - the API already returns the correct leads based on user role and filters
  const userLeads = leads;

  const stats = [
    { icon: <Users size={20} />, label: "סה״כ לידים", count: totalLeads, color: "purple" },
    { icon: <AlertCircle size={20} />, label: "לידים חדשים", count: userLeads.filter(l => l.status === 'חדש').length, color: "green" },
    { icon: <FileCheck size={20} />, label: "נשלחה הצעת מחיר", count: userLeads.filter(l => l.status === 'נשלחה הצעת מחיר').length, color: "blue" },
    { icon: <UserCheck size={20} />, label: "עסקאות שנסגרו", count: userLeads.filter(l => l.status === 'עסקה נסגרה').length, color: "red" }
  ];

  const filteredLeads = userLeads.filter((lead) => {
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    
    const matchesStatus = activeStatusFilter === 'הכל' || lead.status === activeStatusFilter;
    
    const matchesDate = (!dateFilter.startDate || new Date(lead.createdAt) >= new Date(dateFilter.startDate)) &&
                       (!dateFilter.endDate || new Date(lead.createdAt) <= new Date(dateFilter.endDate));
    
    // Agent filter is already handled in userLeads logic above
    const matchesAgent = true; // This is already filtered in userLeads
    
    return matchesSearch && matchesStatus && matchesDate && matchesAgent;
  });

  const handleAddNewLead = () => {
    setSelectedLeadProp(null);
    setIsLeadDialogOpen(true);
  };

  const handleCreateCustomer = () => {
    if (userLeads.length === 0) {
      toast.error('לא נמצאו לידים במערכת');
      return;
    }
    setIsCustomerDialogOpen(true);
  };

  const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // הוספת clientId של המשתמש הנוכחי לנתוני הלקוח
      const customerDataWithClientId = {
        ...customerData,
        clientId: user?.client_id ? String(user.client_id) : undefined // המרה ל-string
      };

      // Use createFromLead if a leadId exists, otherwise use addCustomer
      if (customerDataWithClientId.leadId) {
        // Use the correct function for creating customer from lead
        await createFromLead(customerDataWithClientId.leadId, customerDataWithClientId);
        
        // Remove lead from store after successful customer creation
        await deleteLead(customerDataWithClientId.leadId);
      } else {
        await addCustomer(customerDataWithClientId);
      }
      
      setIsCustomerDialogOpen(false);
      setSelectedLeadProp(null);
      
      // Show success message without navigation or page reload
      toast.success('הלקוח נוצר בהצלחה');
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLeadProp(lead);
    setIsLeadDialogOpen(true);
  };

  const handleDeleteLead = (lead: Lead) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הליד?')) {
      deleteLead(lead.id);
    }
  };

  const canEditLead = (lead: Lead) => {
    if (!user) return false;
    
    // Admin can edit any lead
    if (user.role === 'admin') return true;
    
    // Manager can edit leads of their agents
    if (user.role === 'manager') {
      // Check if the lead is assigned to one of the manager's agents
      const agentIds = agents.filter((u: any) => u.role === 'agent' && u.managerId === user.id).map((u: any) => u.id);
      return agentIds.includes(lead.assignedTo) || lead.assignedTo === user.id;
    }
    
    // Agent can edit their own leads
    if (user.role === 'agent' && lead.assignedTo === user.id) {
      return true;
    }
    
    return false;
  };

  const canDeleteLead = (lead: Lead) => {
    if (!user) return false;
    
    // Admin can delete any lead
    if (user.role === 'admin') return true;
    
    // Manager can delete leads of their agents
    if (user.role === 'manager') {
      // Check if the lead is assigned to one of the manager's agents
      const agentIds = agents.filter((u: any) => u.role === 'agent' && u.managerId === user.id).map((u: any) => u.id);
      return agentIds.includes(lead.assignedTo) || lead.assignedTo === user.id;
    }
    
    // Agent can delete their own leads
    if (user.role === 'agent' && lead.assignedTo === user.id) {
      return true;
    }
    
    return false;
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFromExcel(file, user!.id);
      event.target.value = ''; // Reset file input
      // No need to call fetchLeads here - importFromExcel already does it
    } catch (error) {
      console.error('Error importing Excel:', error);
    }
  };

  // Pagination functions
  const totalPages = Math.ceil(totalLeads / pageSize);
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setShowPageSizeFilter(false);
  };

  const handleSelectLead = (leadId: string, selected: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (selected) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) {
      toast.error('לא נבחרו לידים למחיקה');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך למחוק ${selectedLeads.size} לידים? פעולה זו לא ניתנת לביטול.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Get leads that can be deleted
        const leadsToDelete = Array.from(selectedLeads).filter(leadId => {
          const lead = leads.find(l => l.id === leadId);
          return lead && canDeleteLead(lead);
        });

        if (leadsToDelete.length === 0) {
          toast.error('אין לך הרשאה למחוק את הלידים שנבחרו');
          return;
        }

        // Use bulk delete function that doesn't show individual toasts
        const result = await bulkDeleteLeads(leadsToDelete);
        
        setSelectedLeads(new Set());
        
        // Show single summary message
        if (result.deletedCount > 0) {
          toast.success(`נמחקו ${result.deletedCount} לידים בהצלחה`);
        }
        
        if (result.failedCount > 0) {
          toast.error(`${result.failedCount} לידים לא נמחקו בגלל שגיאות`);
        }
        
        if (leadsToDelete.length < selectedLeads.size) {
          toast.error(`${selectedLeads.size - leadsToDelete.length} לידים לא נמחקו בגלל הרשאות`);
        }
      } catch (error) {
        console.error('Error in bulk delete:', error);
        toast.error('שגיאה במחיקת הלידים');
      }
    }
  };

  // Get status filters from available statuses
  const statusFilters = ['הכל', ...availableStatuses];

  // Default colors for admin users
  const getDefaultStatusColor = (statusName: string) => {
    const defaultColors: { [key: string]: string } = {
      'חדש': '#10b981',
      'בטיפול': '#3b82f6',
      'נשלחה הצעת מחיר': '#8b5cf6',
      'אין מענה': '#f59e0b',
      'אין מענה 2': '#f97316',
      'רוצה לחשוב': '#06b6d4',
      'ממתין לחתימה': '#84cc16',
      'עסקה נסגרה': '#ef4444',
      'לא מעוניין': '#6b7280',
      'הסרה מהמאגר': '#374151',
      'מספר שגוי': '#9ca3af',
      'לקוח קיים': '#10b981'
    };
    return defaultColors[statusName] || '#6b7280';
  };

  // Get status color - for admin use default colors, for others use client config
  const getStatusColor = (statusName: string) => {
    if (user?.role === 'admin') {
      return getDefaultStatusColor(statusName);
    }
    return clientConfig?.lead_statuses?.find((s: any) => s.name === statusName)?.color || getDefaultStatusColor(statusName);
  };


  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="row g-3 g-md-4">
        {stats.map((stat, index) => (
          <div key={index} className="col-12 col-sm-6 col-lg-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 p-4 p-md-6 rounded-lg shadow-sm h-100"
            >
              <div className="d-flex align-items-center justify-content-between h-100">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {stat.count}
                  </h3>
                </div>
                <div className={`text-${stat.color}-500`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="row g-3 justify-content-center justify-content-md-start">
        <div className="col-12 col-sm-6 col-md-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateCustomer}
            className="btn btn-md w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            style={{ 
              minHeight: '44px',
              backgroundColor: '#16a34a',
              borderColor: '#16a34a',
              color: 'white'
            }}
          >
            <UserPlus className="w-5 h-5" />
            הקמת לקוח
          </motion.button>
        </div>
        
        <div className="col-12 col-sm-6 col-md-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsBulkMessageOpen(true)}
            disabled={selectedLeads.size === 0}
            className="btn btn-md w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            style={{ 
              minHeight: '44px',
              backgroundColor: selectedLeads.size === 0 ? '#6b7280' : '#9333ea',
              borderColor: selectedLeads.size === 0 ? '#6b7280' : '#9333ea',
              color: 'white'
            }}
          >
            <MessageSquare className="w-5 h-5" />
            שלח הודעות ({selectedLeads.size})
          </motion.button>
        </div>
        
        <div className="col-12 col-sm-6 col-md-auto">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="d-none"
            id="excel-import"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('excel-import')?.click()}
            className="btn btn-md w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            style={{ 
              minHeight: '44px',
              backgroundColor: '#ea580c',
              borderColor: '#ea580c',
              color: 'white'
            }}
          >
            <Upload className="w-5 h-5" />
            ייבוא אקסל
          </motion.button>
        </div>
        
        <div className="col-12 col-sm-6 col-md-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddNewLead}
            className="btn btn-md w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            style={{ 
              minHeight: '44px',
              backgroundColor: '#2563eb',
              borderColor: '#2563eb',
              color: 'white'
            }}
          >
            <Plus className="w-5 h-5" />
            ליד חדש
          </motion.button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 w-full">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowStatusFilter(!showStatusFilter)}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                  activeStatusFilter !== 'הכל' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>סינון לפי סטטוס</span>
              </button>
              {showStatusFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700"
                >
                  {statusFilters.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setActiveStatusFilter(status as LeadStatus | 'הכל');
                        setShowStatusFilter(false);
                      }}
                      className={`w-full text-right px-4 py-2 text-sm ${
                        status === activeStatusFilter
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      style={
                        status !== 'הכל' && status === activeStatusFilter
                          ? { 
                              backgroundColor: getStatusColor(status),
                              color: 'white'
                            }
                          : {}
                      }
                    >
                      {status}
                      {status !== 'הכל' && (
                        <span className="mr-2 text-sm text-gray-500">
                          ({userLeads.filter(l => l.status === status).length})
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                  (dateFilter.startDate || dateFilter.endDate) ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>סינון לפי תאריך</span>
              </button>
              
              <AnimatePresence>
                {showDateFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-10 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-4 px-4 border border-gray-200 dark:border-gray-700 left-0"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          מתאריך
                        </label>
                        <input
                          type="date"
                          value={dateFilter.startDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          עד תאריך
                        </label>
                        <input
                          type="date"
                          value={dateFilter.endDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDateFilter({ startDate: '', endDate: '' });
                            setShowDateFilter(false);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          נקה
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDateFilter(false)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          החל
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Show All Leads Toggle - Only for admins */}
            {user?.role === 'admin' && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAllLeads(!showAllLeads);
                    setSelectedAgentId(null); // Clear agent filter when toggling
                  }}
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                    showAllLeads ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>כל הלידים</span>
                </button>
              </div>
            )}
            
            {/* User Filter - Only for managers and admins */}
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <div className="relative">
                <button
                  onClick={() => setShowAgentFilter(!showAgentFilter)}
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                    selectedAgentId ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  <span>{user?.role === 'admin' ? 'סינון לפי משתמש' : 'סינון לפי נציג'}</span>
                </button>
                
                <AnimatePresence>
                  {showAgentFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700"
                    >
                      <button
                        onClick={() => {
                          setSelectedAgentId(null);
                          setShowAgentFilter(false);
                        }}
                        className={`w-full text-right px-4 py-2 text-sm ${
                          !selectedAgentId
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {user?.role === 'admin' ? 'כל המשתמשים' : 'כל הנציגים'}
                      </button>
                      {agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setShowAgentFilter(false);
                          }}
                          className={`w-full text-right px-4 py-2 text-sm ${
                            selectedAgentId === agent.id
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {agent.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Page Size Filter */}
            <div className="relative">
              <button
                onClick={() => setShowPageSizeFilter(!showPageSizeFilter)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-800"
              >
                <span>{pageSize} לידים בדף</span>
              </button>
              
              <AnimatePresence>
                {showPageSizeFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-10 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700"
                  >
                    {[25, 50, 100, 200].map((size) => (
                      <button
                        key={size}
                        onClick={() => handlePageSizeChange(size)}
                        className={`w-full text-right px-4 py-2 text-sm ${
                          pageSize === size
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {size} לידים
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Display */}
      {(activeStatusFilter !== 'הכל' || dateFilter.startDate || dateFilter.endDate || selectedAgentId || (user?.role === 'admin' && showAllLeads)) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-300">מציג לידים:</span>
          {activeStatusFilter !== 'הכל' && (
            <span 
              className="px-3 py-1 rounded-full text-sm"
              style={{
                backgroundColor: getStatusColor(activeStatusFilter) + '20',
                color: getStatusColor(activeStatusFilter)
              }}
            >
              {activeStatusFilter}
            </span>
          )}
          {user?.role === 'admin' && showAllLeads && (
            <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              כל הלידים
            </span>
          )}
          {selectedAgentId && (
            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
              {user?.role === 'admin' ? 'משתמש' : 'נציג'}: {agents.find(agent => agent.id === selectedAgentId)?.name || 'לא ידוע'}
            </span>
          )}
          {dateFilter.startDate && (
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              מ-{dateFilter.startDate}
            </span>
          )}
          {dateFilter.endDate && (
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              עד-{dateFilter.endDate}
            </span>
          )}
          <button
            onClick={() => {
              setActiveStatusFilter('הכל');
              setDateFilter({ startDate: '', endDate: '' });
              setSelectedAgentId(null);
              if (user?.role === 'admin') {
                setShowAllLeads(false);
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            נקה סינון
          </button>
        </div>
      )}

      {/* Bulk Selection */}
      {filteredLeads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <motion.label 
                className="flex items-center gap-3 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={handleSelectAll}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 shadow-lg shadow-blue-500/25' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}>
                    {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? 'בטל בחירת הכל' : 'בחר הכל'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredLeads.length} לידים זמינים
                  </span>
                </div>
              </motion.label>
              
              <AnimatePresence>
                {selectedLeads.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-700"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      נבחרו {selectedLeads.size} לידים
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {selectedLeads.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsBulkMessageOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all duration-200 font-medium"
                  >
                    <MessageSquare className="w-4 h-4" />
                    שלח הודעות
                  </motion.button>
                  
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsBulkAssignOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all duration-200 font-medium"
                    >
                      <UserCog className="w-4 h-4" />
                      שייך לנציג
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all duration-200 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחק נבחרים ({selectedLeads.size})
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onEdit={() => handleEditLead(lead)}
            onDelete={() => handleDeleteLead(lead)}
            canEdit={canEditLead(lead)}
            canDelete={canDeleteLead(lead)}
            checkbox={
              <motion.label 
                className="flex items-center cursor-pointer group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <input
                  type="checkbox"
                  checked={selectedLeads.has(lead.id)}
                  onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center cursor-pointer ${
                  selectedLeads.has(lead.id)
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 shadow-lg shadow-blue-500/25' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}>
                  {selectedLeads.has(lead.id) && (
                    <motion.svg
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </div>
              </motion.label>
            }
          />
        ))}
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || dateFilter.startDate || dateFilter.endDate
                ? 'לא נמצאו לידים התואמים את החיפוש'
                : activeStatusFilter !== 'הכל'
                ? `לא נמצאו לידים בסטטוס ${activeStatusFilter}`
                : 'לא נמצאו לידים'}
            </p>
          </div>
        )}
      </div>

      {/* Lead Form Dialog */}
      <LeadFormDialog
        isOpen={isLeadDialogOpen}
        onClose={() => {
          setIsLeadDialogOpen(false);
          setSelectedLeadProp(null);
        }}
        lead={selectedLeadProp}
      />

      {/* Customer Creation Dialog */}
      <CreateCustomerDialog
        isOpen={isCustomerDialogOpen}
        onClose={() => {
          setIsCustomerDialogOpen(false);
          setSelectedLeadProp(null);
        }}
        lead={selectedLeadProp}
        onSubmit={handleCustomerCreated}
      />

      {/* Bulk Message Dialog */}
      <BulkMessageDialog
        isOpen={isBulkMessageOpen}
        onClose={() => {
          setIsBulkMessageOpen(false);
          setSelectedLeads(new Set());
        }}
        selectedLeads={filteredLeads.filter(lead => selectedLeads.has(lead.id))}
      />

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        isOpen={isBulkAssignOpen}
        onClose={() => {
          setIsBulkAssignOpen(false);
          setSelectedLeads(new Set());
        }}
        selectedLeads={filteredLeads.filter(lead => selectedLeads.has(lead.id))}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span>
              מציג {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalLeads)} מתוך {totalLeads} לידים
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              הקודם
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'text-white bg-blue-600 hover:bg-blue-700'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              הבא
              <ChevronLeft className="w-4 h-4 mr-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;