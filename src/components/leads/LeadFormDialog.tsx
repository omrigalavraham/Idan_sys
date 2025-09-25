import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { Lead, LeadFormData, LeadStatus } from '../../types/lead';
import { useLeadStore } from '../../store/leadStore';
import useAuthStore from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import toast from 'react-hot-toast';

interface LeadFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
}


const LeadFormDialog: React.FC<LeadFormDialogProps> = ({ isOpen, onClose, lead }) => {
  const { addLead, updateLead, deleteLead, availableStatuses } = useLeadStore();
  const { user } = useAuthStore();
  const { users, fetchUsers, fetchAgentsByManager } = useUserStore();
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    status: (availableStatuses?.[0] || 'חדש') as LeadStatus,
    notes: '',
    callbackDate: '',
    callbackTime: '',
    assigned_to: user?.id ? parseInt(user.id) : undefined
  });

  // Get available sources from client configuration or defaults
  const availableSources = user?.role === 'admin' 
    ? ['פייסבוק', 'גוגל', 'המלצות', 'אתר', 'טלפון', 'אחר', 'LinkedIn', 'Instagram', 'TikTok', 'יריד', 'כנס']
    : ['פייסבוק', 'גוגל', 'המלצות', 'אחר'];

  // Load users when component mounts
  useEffect(() => {
    if (isOpen) {
      // אם המשתמש הוא אדמין - טען את כל המשתמשים
      if (user?.role === 'admin') {
        fetchUsers();
      } else if (user?.role === 'manager') {
        // אם המשתמש הוא מנהל - טען רק את הנציגים שלו
        fetchAgentsByManager();
      } else {
        // אחרת טען את כל המשתמשים
        fetchUsers();
      }
    }
  }, [isOpen, fetchUsers, fetchAgentsByManager, user?.role]);

  useEffect(() => {
    if (lead) {
      // Format dates properly for inputs
      let formattedCallbackDate = '';
      let formattedCallbackTime = '';
      
      if (lead.callbackDate) {
        // Handle different date formats
        const date = new Date(lead.callbackDate);
        if (!isNaN(date.getTime())) {
          formattedCallbackDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else {
          // If it's already in the right format
          formattedCallbackDate = lead.callbackDate;
        }
      }
      
      if (lead.callbackTime) {
        // Handle time format - ensure it's HH:MM
        if (lead.callbackTime.length === 5) {
          formattedCallbackTime = lead.callbackTime;
        } else {
          // Try to parse and format
          const timeParts = lead.callbackTime.split(':');
          if (timeParts.length >= 2) {
            formattedCallbackTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
          }
        }
      }
      
      setFormData({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        status: lead.status,
        notes: lead.notes || '',
        callbackDate: formattedCallbackDate,
        callbackTime: formattedCallbackTime,
        assigned_to: lead.assignedTo ? parseInt(lead.assignedTo) : (user?.id ? parseInt(user.id) : undefined)
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        status: (availableStatuses?.[0] || 'חדש') as LeadStatus,
        notes: '',
        callbackDate: '',
        callbackTime: '',
        assigned_to: user?.id ? parseInt(user.id) : undefined
      });
    }
  }, [lead, isOpen, availableStatuses, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('משתמש לא מחובר');
      return;
    }
    
    // Validate phone number
// בתוך handleSubmit, במקום הבדיקה הקיימת
    const phonePattern = /^(\d{10}|\d{3}-\d{7})$/;

    if (!formData.phone || !phonePattern.test(formData.phone)) {
      toast.error('מספר הטלפון חייב להיות 10 ספרות רצופות או בפורמט xxx-xxxxxxx');
      return;
    }

    try {
      if (lead) {
        await updateLead(lead.id, formData);
      } else {
        await addLead(formData, user.id);
      }
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('אירעה שגיאה בשמירת הליד');
    }
  };

  const handleDelete = () => {
    if (lead && window.confirm('האם אתה בטוח שברצונך למחוק את הליד?')) {
      deleteLead(lead.id);
      onClose();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Phone number validation - only allow numbers and limit to 10 digits
    if (name === 'phone') {
      const phoneValue = value.replace(/\D/g, ''); // Remove all non-digits
      if (phoneValue.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: phoneValue
        }));
      }
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'assigned_to' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
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
              className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {lead ? 'עריכת ליד' : 'יצירת ליד חדש'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שם
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      טלפון
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0501234567"
                      maxLength={10}
                      className={`w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formData.phone && formData.phone.length !== 10 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      required
                    />
                    {formData.phone && formData.phone.length !== 10 && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        מספר הטלפון חייב להכיל בדיוק 10 ספרות
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      אימייל
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      סטטוס
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {availableStatuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      מקור הליד
                    </label>
                    <select
                      name="source"
                      value={formData.source || ''}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">בחר מקור</option>
                      {availableSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>

                  {/* הצגת שדה בחירת נציג רק אם המשתמש הוא אדמין או מנהל */}
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        נציג אחראי
                      </label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">בחר נציג</option>
                        {/* אם המשתמש הוא מנהל - הוסף אותו עצמו לרשימה */}
                        {user?.role === 'manager' && (
                          <option key={user.id} value={user.id}>{user.name} (מנהל)</option>
                        )}
                        {users
                          .filter(u => u.role === 'agent') // רק נציגים
                          .map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                      </select>
                      {user?.role === 'manager' && users.filter(u => u.role === 'agent').length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          אין נציגים משויכים למנהל זה
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תאריך שיחה חוזרת
                    </label>
                    <input
                      type="date"
                      name="callbackDate"
                      value={formData.callbackDate}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שעה
                    </label>
                    <input
                      type="time"
                      name="callbackTime"
                      value={formData.callbackTime}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    הערות
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    {lead && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-600 hover:text-red-700 font-medium flex items-center"
                      >
                        <Trash2 className="w-5 h-5 ml-2" />
                        מחיקה
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {lead ? 'עדכון' : 'שמירה'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LeadFormDialog;