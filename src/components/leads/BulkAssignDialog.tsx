import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserCheck, AlertCircle } from 'lucide-react';
import { Lead } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useLeadStore } from '../../store/leadStore';
import toast from 'react-hot-toast';

interface BulkAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
}

const BulkAssignDialog: React.FC<BulkAssignDialogProps> = ({
  isOpen,
  onClose,
  selectedLeads
}) => {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  const { bulkAssignLeads } = useLeadStore();
  const [selectedRepresentative, setSelectedRepresentative] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch users when dialog opens
  useEffect(() => {
    if (isOpen) {
      // If user is a manager, fetch only their agents
      if (user?.role === 'manager') {
        // For now, we'll fetch all users and filter on the frontend
        // In the future, we could create a specific API endpoint for manager's agents
        fetchUsers();
      } else if (user?.role === 'admin') {
        // Admin can see all users
        fetchUsers();
      }
    }
  }, [isOpen, fetchUsers, user?.role]);

  // Filter users to show only representatives based on user role and permissions
  const representatives = users.filter(u => {
    // Admin can see all agents and managers
    if (user?.role === 'admin') {
      return u.role === 'agent' || u.role === 'manager';
    }
    
    // Manager can see agents assigned to them and themselves
    if (user?.role === 'manager') {
      const isAgentUnderManager = u.role === 'agent' && u.managerId === user.id;
      const isManagerSelf = u.id === user.id;
      return isAgentUnderManager || isManagerSelf;
    }
    
    // Regular users (agents) cannot assign leads
    return false;
  });

  // Add manager to representatives if not already included
  if (user?.role === 'manager' && !representatives.find(r => r.id === user.id)) {
    representatives.push({
      id: user.id,
      name: user.name, // Use the combined name from auth store
      role: 'manager',
      managerId: user.manager_id?.toString()
    } as any);
  }

  const handleAssignLeads = async () => {
    if (!selectedRepresentative) {
      toast.error('נא לבחור נציג');
      return;
    }

    if (selectedLeads.length === 0) {
      toast.error('לא נבחרו לידים לשיוך');
      return;
    }

    setIsAssigning(true);

    try {
      // Use the bulk assignment function
      await bulkAssignLeads(
        selectedLeads.map(lead => lead.id),
        selectedRepresentative
      );

      onClose();
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      // Error handling is done in the store function
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedRep = representatives.find(r => r.id === selectedRepresentative);

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
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-blue-500" />
                    שיוך לידים לנציג
                  </h2>
                  {user?.role === 'manager' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      הנציגים שמשויכים אליך + אתה עצמך זמינים לבחירה
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      נבחרו {selectedLeads.length} לידים לשיוך
                    </p>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    הלידים הבאים יישויכו לנציג הנבחר:
                    {user?.role === 'manager' && (
                      <span className="block mt-1 font-medium">
                        (רק הנציגים שמשויכים אליך זמינים לבחירה)
                      </span>
                    )}
                  </div>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {selectedLeads.map((lead, index) => (
                      <div key={lead.id} className="text-xs text-blue-600 dark:text-blue-400 py-1">
                        {index + 1}. {lead.name} - {lead.phone}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    בחר נציג
                    {user?.role === 'manager' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        (הנציגים שמשויכים אליך + אתה עצמך)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedRepresentative}
                    onChange={(e) => setSelectedRepresentative(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="">בחר נציג...</option>
                    {representatives.map(rep => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.role === 'manager' ? 'מנהל' : 'נציג'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRep && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          הלידים יישויכו ל: {selectedRep.name}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          תפקיד: {selectedRep.role === 'manager' ? 'מנהל' : 'נציג'}
                          {user?.role === 'manager' && selectedRep.role === 'agent' && (
                            <span className="block mt-1">
                              ✓ נציג משויך אליך
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {representatives.length === 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {user?.role === 'manager' 
                            ? 'לא נמצאו נציגים משויכים אליך לשיוך לידים'
                            : 'לא נמצאו נציגים זמינים לשיוך'
                          }
                        </p>
                        {user?.role === 'manager' && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            רק הנציגים שמשויכים אליך יופיעו ברשימה
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isAssigning}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignLeads}
                    disabled={!selectedRepresentative || isAssigning || representatives.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isAssigning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        משייך...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-5 h-5" />
                        שייך לידים ({selectedLeads.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BulkAssignDialog;
