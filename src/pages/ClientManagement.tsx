import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Edit2, Trash2, Save, X, 
  Settings, CheckSquare, Zap, MessageSquare, 
  Users, Calendar, BarChart3, FileText, Bell, Phone, Shield
} from 'lucide-react';
import { useSystemClientStore, SystemClient, LeadStatus, CustomerStatus, PaymentStatus } from '../store/systemClientStore';
import { useUserStore } from '../store/userStore';
import toast from 'react-hot-toast';

interface ClientConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: SystemClient | null;
}

const ClientManagement = () => {
  const { getClientByName, fetchClients } = useSystemClientStore();
  const { users: managers, fetchManagers, isLoading } = useUserStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SystemClient | null>(null);

  // Load managers and system clients on component mount
  React.useEffect(() => {
    fetchManagers();
    fetchClients();
  }, [fetchManagers, fetchClients]);

  const handleEdit = (manager: any) => {
    console.log('handleEdit called with manager:', manager);
    // Find the system client that matches this manager's name
    const systemClient = getClientByName(manager.name);
    console.log('Found system client:', systemClient);
    if (systemClient) {
      setSelectedClient(systemClient);
      setIsDialogOpen(true);
    } else {
      console.warn(`No system client found for manager: ${manager.name}`);
      // Create a new system client for this manager
      const newClient = {
        id: '',
        name: manager.name,
        companyName: manager.name, // Use manager name as default company name
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        logoUrl: '',
        isActive: true,
        leadStatuses: [],
        taskStatuses: [],
        customerStatuses: [],
        paymentStatuses: [],
        features: {},
        workflowSettings: {},
        messageTemplates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('Creating new client for manager:', newClient);
      setSelectedClient(newClient);
      setIsDialogOpen(true);
      toast.success(`יוצר לקוח מערכת חדש עבור ${manager.name}`);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500" />
          ניהול לקוחות מערכת
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : managers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין מנהלים במערכת</p>
          </div>
        ) : (
          managers.map((manager: any) => {
            const systemClient = getClientByName(manager.name);
            return (
          <div
            key={manager.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
          >
            <div className="p-4 md:p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {manager.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{manager.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                      systemClient?.isActive !== false
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {systemClient ? (systemClient.isActive ? 'פעיל' : 'לא פעיל') : 'לא הוגדר'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400 truncate">
                      {manager.phoneNumber || 'לא מוגדר'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">טלפון</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                      {systemClient?.companyName || manager.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">שם החברה</div>
                  </div>
                </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    נוצר: {new Date(manager.createdAt || Date.now()).toLocaleDateString('he-IL')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(manager)}
                    className="p-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
            );
          })
        )}
      </div>

      <ClientConfigDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
      />
    </div>
  );
};

const ClientConfigDialog: React.FC<ClientConfigDialogProps> = ({
  isOpen,
  onClose,
  client
}) => {
  const { addClient, updateClient } = useSystemClientStore();
  const [activeTab, setActiveTab] = useState<'general' | 'statuses' | 'features' | 'templates'>('general');
  
  const [formData, setFormData] = useState<Partial<SystemClient>>({
    name: '',
    companyName: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    logoUrl: '',
    isActive: true
  });

  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [customerStatuses, setCustomerStatuses] = useState<CustomerStatus[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([]);
  
  // New state for features and templates
  const [features, setFeatures] = useState<Record<string, any>>({});
  const [messageTemplates, setMessageTemplates] = useState<any[]>([]);

  React.useEffect(() => {
    if (client) {
      console.log('Client data received in form:', client);
      console.log('Client name:', client.name);
      console.log('Client companyName:', client.companyName);
      setFormData({
        name: client.name || '',
        companyName: client.companyName || '',
        primaryColor: client.primaryColor || '#3b82f6',
        secondaryColor: client.secondaryColor || '#1e40af',
        logoUrl: client.logoUrl || '',
        isActive: client.isActive !== undefined ? client.isActive : true
      });
      setLeadStatuses(client.leadStatuses || []);
      setCustomerStatuses(client.customerStatuses || []);
      setPaymentStatuses(client.paymentStatuses || []);
      
      // Handle both old format (boolean) and new format (object) for features
      const clientFeatures = client.features || {};
      const normalizedFeatures: Record<string, any> = {};
      
      // Define all expected features with their default structure
      const allFeatures: Record<string, any> = {
        leads: { name: 'לידים', enabled: true, settings: {} },
        tasks: { name: 'משימות', enabled: true, settings: {} },
        calendar: { name: 'יומן', enabled: true, settings: {} },
        reminders: { name: 'תזכורות', enabled: true, settings: {} },
        customers: { name: 'מעקב לקוחות', enabled: true, settings: {} },
        attendance: { name: 'נוכחות', enabled: true, settings: {} },
        reports: { name: 'דוחות', enabled: true, settings: {} },
        dialer: { name: 'חייגן', enabled: true, settings: {} },
        userManagement: { name: 'ניהול משתמשים', enabled: true, settings: {} }
      };
      
      // Normalize features - handle both boolean and object formats
      Object.keys(allFeatures).forEach(key => {
        if (clientFeatures[key] !== undefined) {
          if (typeof clientFeatures[key] === 'boolean') {
            // Old format: { "leads": true }
            normalizedFeatures[key] = {
              ...allFeatures[key],
              enabled: clientFeatures[key]
            };
          } else if (typeof clientFeatures[key] === 'object') {
            // New format: { "leads": { "name": "לידים", "enabled": true, "settings": {} } }
            normalizedFeatures[key] = {
              ...allFeatures[key],
              ...clientFeatures[key]
            };
          }
        } else {
          // Feature not found, use default
          normalizedFeatures[key] = allFeatures[key];
        }
      });
      
      setFeatures(normalizedFeatures);
      setMessageTemplates(client.messageTemplates || []);
      
      console.log('Form data set to:', {
        name: client.name || '',
        companyName: client.companyName || '',
        primaryColor: client.primaryColor || '#3b82f6',
        secondaryColor: client.secondaryColor || '#1e40af',
        logoUrl: client.logoUrl || '',
        isActive: client.isActive !== undefined ? client.isActive : true
      });
    } else {
      // Reset to defaults for new client
      const defaultStatuses = [
        { id: '1', name: 'חדש', color: '#3b82f6', order: 1, isFinal: false },
        { id: '2', name: 'בטיפול', color: '#f59e0b', order: 2, isFinal: false },
        { id: '3', name: 'נשלחה הצעת מחיר', color: '#8b5cf6', order: 3, isFinal: false },
        { id: '8', name: 'עסקה נסגרה', color: '#059669', order: 8, isFinal: true },
        { id: '9', name: 'לא מעוניין', color: '#6b7280', order: 9, isFinal: true }
      ];
      setLeadStatuses(defaultStatuses);
      
      // Default features - ordered according to the image
      const defaultFeatures = {
        leads: { name: 'לידים', enabled: true, settings: {} },
        tasks: { name: 'משימות', enabled: true, settings: {} },
        calendar: { name: 'יומן', enabled: true, settings: {} },
        reminders: { name: 'תזכורות', enabled: true, settings: {} },
        customers: { name: 'מעקב לקוחות', enabled: true, settings: {} },
        attendance: { name: 'נוכחות', enabled: true, settings: {} },
        reports: { name: 'דוחות', enabled: true, settings: {} },
        dialer: { name: 'חייגן', enabled: true, settings: {} },
        userManagement: { name: 'ניהול משתמשים', enabled: true, settings: {} }
      };
      setFeatures(defaultFeatures);
      
      setMessageTemplates([]);
    }
  }, [client, isOpen]);

  // Template management functions
  const importDefaultTemplates = () => {
    // Default WhatsApp templates
    const defaultWhatsappTemplates = [
      {
        id: Date.now(),
        client_id: parseInt(client?.id || '0') || 0,
        template_name: 'ברכה',
        template_type: 'whatsapp' as const,
        content: 'שלום {name}! תודה שפנית אלינו. נחזור אליך בהקדם.',
        variables: ['name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: Date.now() + 1,
        client_id: parseInt(client?.id || '0') || 0,
        template_name: 'מעקב',
        template_type: 'whatsapp' as const,
        content: 'היי {name}, רק רצינו לבדוק איך הולך? יש לנו הצעה מיוחדת בשבילך.',
        variables: ['name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Default Email templates
    const defaultEmailTemplates = [
      {
        id: Date.now() + 2,
        client_id: parseInt(client?.id || '0') || 0,
        template_name: 'ברוכים הבאים',
        template_type: 'email' as const,
        subject: 'ברוכים הבאים!',
        content: 'שלום {name}, ברוכים הבאים! אנחנו שמחים שהצטרפת אלינו.',
        variables: ['name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: Date.now() + 3,
        client_id: parseInt(client?.id || '0') || 0,
        template_name: 'הצעת מחיר',
        template_type: 'email' as const,
        subject: 'הצעת המחיר שלך',
        content: 'היי {name}, מצ״ב הצעת המחיר שביקשת. נשמח לדבר איתך.',
        variables: ['name'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const allTemplates = [...defaultWhatsappTemplates, ...defaultEmailTemplates];
    
    setMessageTemplates(prev => [...prev, ...allTemplates]);
    toast.success('תבניות ברירת מחדל יובאו בהצלחה');
  };

  const addMessageTemplate = () => {
    console.log('addMessageTemplate called');
    const newTemplate = {
      id: Date.now(),
      client_id: parseInt(client?.id || '0') || 0,
      template_name: 'תבנית חדשה',
      template_type: 'whatsapp' as const,
      content: 'שלום {name}, ',
      variables: ['name'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Adding new template:', newTemplate);
    setMessageTemplates(prev => {
      const updated = [...prev, newTemplate];
      console.log('Updated templates:', updated);
      return updated;
    });
    toast.success('תבנית חדשה נוספה בהצלחה');
  };

  const updateMessageTemplate = (id: number, updates: any) => {
    setMessageTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));
  };

  const removeMessageTemplate = (id: number) => {
    setMessageTemplates(prev => prev.filter(template => template.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.companyName) {
      return;
    }
    
    const clientData = {
      name: formData.name,
      companyName: formData.companyName,
      primaryColor: formData.primaryColor || '#3b82f6',
      secondaryColor: formData.secondaryColor || '#1e40af',
      logoUrl: formData.logoUrl,
      leadStatuses,
      customerStatuses,
      paymentStatuses,
      features,
      messageTemplates
    };


    try {
      if (client && client.id !== '') {
        await updateClient(client.id, clientData);
      } else {
        await addClient(clientData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      // Error is already handled by the store functions
    }
  };

  const addNewStatus = (type: 'lead' | 'customer' | 'payment') => {
    const newStatus = {
      id: crypto.randomUUID(),
      name: 'סטטוס חדש',
      color: '#6b7280',
      order: 999,
      isFinal: false
    };

    switch (type) {
      case 'lead':
        setLeadStatuses([...leadStatuses, newStatus]);
        break;
      case 'customer':
        setCustomerStatuses([...customerStatuses, newStatus]);
        break;
      case 'payment':
        setPaymentStatuses([...paymentStatuses, newStatus]);
        break;
    }
  };

  const updateStatus = (type: 'lead' | 'customer' | 'payment', id: string, updates: any) => {
    switch (type) {
      case 'lead':
        setLeadStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        break;
      case 'customer':
        setCustomerStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        break;
      case 'payment':
        setPaymentStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        break;
    }
  };

  const removeStatus = (type: 'lead' | 'customer' | 'payment', id: string) => {
    switch (type) {
      case 'lead':
        setLeadStatuses(prev => prev.filter(s => s.id !== id));
        break;
      case 'customer':
        setCustomerStatuses(prev => prev.filter(s => s.id !== id));
        break;
      case 'payment':
        setPaymentStatuses(prev => prev.filter(s => s.id !== id));
        break;
    }
  };

  // Feature management functions
  const toggleFeature = (featureKey: string) => {
    setFeatures(prev => ({
      ...prev,
      [featureKey]: {
        ...prev[featureKey],
        enabled: !prev[featureKey]?.enabled
      }
    }));
  };

  // כל המידע נשמר בטבלת system_clients עצמה בשדות JSONB
  // אין צורך בפונקציות נפרדות

  const tabs = [
    { id: 'general', label: 'כללי', icon: Settings },
    { id: 'statuses', label: 'סטטוסים', icon: CheckSquare },
    { id: 'features', label: 'תכונות', icon: Zap },
    { id: 'templates', label: 'תבנית הודעות', icon: MessageSquare }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-2 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={onClose}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-6xl max-h-[95vh] rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col"
            >
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {client && client.id !== '' ? `עריכת לקוח מערכת - ${client.companyName}` : 'יצירת לקוח מערכת חדש'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Tabs */}
                <div className="md:w-64 border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
                  <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full md:w-auto flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 text-center md:text-right rounded-lg transition-colors text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                  {(!client || client.id === '') && (
                    <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <p className="text-blue-700 dark:text-blue-300 text-xs md:text-sm">
                          יוצר לקוח מערכת חדש עבור המנהל. השדות ימולאו אוטומטית עם הנתונים הבסיסיים.
                        </p>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeTab === 'general' && (
                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                שם הלקוח במערכת
                              </label>
                              <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => {
                                  console.log('Name field changed to:', e.target.value);
                                  setFormData({ ...formData, name: e.target.value });
                                }}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                                required
                                disabled={!!client && client.id !== ''} // Disable if editing existing client
                              />
                              {client && client.id !== '' && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  שם הלקוח במערכת לא ניתן לשינוי
                                </p>
                              )}
                              {(!client || client.id === '') && (
                                <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">
                                  יוצר לקוח מערכת חדש עבור המנהל
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                שם החברה (יוצג במערכת)
                              </label>
                              <input
                                type="text"
                                value={formData.companyName || ''}
                                onChange={(e) => {
                                  console.log('Company name field changed to:', e.target.value);
                                  setFormData({
                                    ...formData,
                                    companyName: e.target.value
                                  });
                                }}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                                required
                              />
                            </div>

                          </div>
                        )}

                        {activeTab === 'statuses' && (
                          <div className="space-y-8">
                            {/* Lead Statuses */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                  סטטוסי לידים
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => addNewStatus('lead')}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
                                >
                                  + הוסף סטטוס
                                </button>
                              </div>
                              <div className="space-y-3">
                                {leadStatuses.map((status) => (
                                  <div key={status.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <input
                                      type="text"
                                      value={status.name}
                                      onChange={(e) => updateStatus('lead', status.id, { name: e.target.value })}
                                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                                    />
                                    <input
                                      type="color"
                                      value={status.color}
                                      onChange={(e) => updateStatus('lead', status.id, { color: e.target.value })}
                                      className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeStatus('lead', status.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Customer Statuses */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                  סטטוסי לקוחות
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => addNewStatus('customer')}
                                  className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                                >
                                  + הוסף סטטוס
                                </button>
                              </div>
                              <div className="space-y-3">
                                {customerStatuses.map((status) => (
                                  <div key={status.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <input
                                      type="text"
                                      value={status.name}
                                      onChange={(e) => updateStatus('customer', status.id, { name: e.target.value })}
                                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                                    />
                                    <input
                                      type="color"
                                      value={status.color}
                                      onChange={(e) => updateStatus('customer', status.id, { color: e.target.value })}
                                      className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeStatus('customer', status.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment Statuses */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                  סטטוסי תשלום
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => addNewStatus('payment')}
                                  className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
                                >
                                  + הוסף סטטוס
                                </button>
                              </div>
                              <div className="space-y-3">
                                {paymentStatuses.map((status) => (
                                  <div key={status.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <input
                                      type="text"
                                      value={status.name}
                                      onChange={(e) => updateStatus('payment', status.id, { name: e.target.value })}
                                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                                    />
                                    <input
                                      type="color"
                                      value={status.color}
                                      onChange={(e) => updateStatus('payment', status.id, { color: e.target.value })}
                                      className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeStatus('payment', status.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'features' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              תכונות זמינות ללקוח
                            </h3>
                            <div className="space-y-4">
                                {/* Display features in the correct order as shown in the image */}
                                {[
                                  { key: 'leads', name: 'לידים', icon: Users, color: 'text-blue-500' },
                                  { key: 'tasks', name: 'משימות', icon: CheckSquare, color: 'text-purple-500' },
                                  { key: 'calendar', name: 'יומן', icon: Calendar, color: 'text-orange-500' },
                                  { key: 'reminders', name: 'תזכורות', icon: Bell, color: 'text-yellow-500' },
                                  { key: 'customers', name: 'מעקב לקוחות', icon: Building2, color: 'text-green-500' },
                                  { key: 'attendance', name: 'נוכחות', icon: FileText, color: 'text-indigo-500' },
                                  { key: 'reports', name: 'דוחות', icon: BarChart3, color: 'text-red-500' },
                                  { key: 'dialer', name: 'חייגן', icon: Phone, color: 'text-teal-500' },
                                  { key: 'userManagement', name: 'ניהול משתמשים', icon: Shield, color: 'text-gray-500' }
                                ].map(({ key, name, icon: Icon, color }) => {
                                  const feature = features[key];
                                if (!feature) return null;
                                
                                return (
                                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Icon className={`w-5 h-5 ${color}`} />
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {name}
                                      </span>
                                    </div>
                                    <label className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={feature.enabled}
                                        onChange={() => toggleFeature(key)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                      />
                                      <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                                        {feature.enabled ? 'מופעל' : 'מושבת'}
                                      </span>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}


                        {activeTab === 'templates' && (
                          <div className="space-y-4 md:space-y-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                תבניות הודעות
                              </h3>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={importDefaultTemplates}
                                  className="bg-green-600 text-white px-4 py-3 sm:px-3 sm:py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  📥 ייבא תבניות ברירת מחדל
                                </button>
                                <button
                                  type="button"
                                  onClick={addMessageTemplate}
                                  className="bg-blue-600 text-white px-4 py-3 sm:px-3 sm:py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  + הוסף תבנית
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                              {messageTemplates.map((template) => (
                                <div key={template.id} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <div className="space-y-3 md:space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          שם התבנית
                                        </label>
                                        <input
                                          type="text"
                                          value={template.template_name}
                                          onChange={(e) => updateMessageTemplate(template.id, { template_name: e.target.value })}
                                          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm md:text-base"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          סוג הודעה
                                        </label>
                                        <select
                                          value={template.template_type}
                                          onChange={(e) => updateMessageTemplate(template.id, { template_type: e.target.value as any })}
                                          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm md:text-base"
                                        >
                                          <option value="whatsapp">WhatsApp</option>
                                          <option value="email">אימייל</option>
                                        </select>
                                      </div>
                                    </div>
                                    {template.template_type === 'email' && (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          נושא
                                        </label>
                                        <input
                                          type="text"
                                          value={template.subject || ''}
                                          onChange={(e) => updateMessageTemplate(template.id, { subject: e.target.value })}
                                          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm md:text-base"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        תוכן ההודעה
                                        <span className="text-xs text-gray-500 mr-2 block sm:inline">
                                          (השתמש במשתנים: {'{name}'}, {'{phone}'}, {'{email}'}, {'{company}'})
                                        </span>
                                      </label>
                                      <textarea
                                        value={template.content}
                                        onChange={(e) => updateMessageTemplate(template.id, { content: e.target.value })}
                                        rows={4}
                                        className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 font-mono text-sm"
                                        placeholder="הקלד את תוכן ההודעה כאן... (לדוגמה: שלום {name}, נשמח ליצור איתך קשר בטלפון {phone})"
                                      />
                                      
                                      {/* תצוגה מקדימה */}
                                      <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-600 rounded border">
                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                          תצוגה מקדימה:
                                        </div>
                                        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line break-words">
                                          {template.content
                                            .replace(/{name}/g, 'יוסי כהן')
                                            .replace(/{phone}/g, '050-1234567')
                                            .replace(/{email}/g, 'yossi@example.com')
                                            .replace(/{company}/g, 'חברת הדוגמה בע"מ')
                                          }
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={template.is_active}
                                          onChange={(e) => updateMessageTemplate(template.id, { is_active: e.target.checked })}
                                          className="mr-2 w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">פעיל</span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => removeMessageTemplate(template.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors w-fit"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}


                      </motion.div>
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 md:px-6 md:py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-center font-medium"
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-3 md:px-6 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                      >
                        <Save className="w-5 h-5" />
                        {client && client.id !== '' ? 'עדכן לקוח' : 'צור לקוח'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClientManagement;