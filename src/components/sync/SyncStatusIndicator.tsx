import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, 
  X, Database, Clock, Activity, Zap
} from 'lucide-react';
import { useSyncStore } from '../../store/syncStore';
import { useSyncStatus } from '../../hooks/useSync';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const SyncStatusIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const { forceSyncAll } = useSyncStore();
  const { isOnline, syncInProgress, lastSync, systemHealth } = useSyncStatus();

  const handleForceSync = async () => {
    await forceSyncAll();
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncInProgress) return 'text-yellow-500';
    if (systemHealth.isHealthy) return 'text-green-500';
    return 'text-orange-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5" />;
    if (syncInProgress) return <RefreshCw className="w-5 h-5 animate-spin" />;
    if (systemHealth.isHealthy) return <CheckCircle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowDetails(!showDetails)}
        className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center haptic-light ${
          isOnline 
            ? 'bg-gradient-to-br from-green-500 to-green-600' 
            : 'bg-gradient-to-br from-red-500 to-red-600'
        } text-white`}
        title="סטטוס סנכרון"
      >
        {getStatusIcon()}
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
              onClick={() => setShowDetails(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 mt-3 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  סטטוס סנכרון
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowDetails(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center haptic-medium"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    {isOnline ? (
                      <Wifi className="w-6 h-6 text-green-500" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-red-500" />
                    )}
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {isOnline ? 'מחובר' : 'לא מחובר'}
                    </span>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>

                {/* Sync Status */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-blue-500" />
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {syncInProgress ? 'מסנכרן...' : 'מוכן'}
                    </span>
                  </div>
                  {syncInProgress && (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* System Health */}
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300">בריאות המערכת</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                      <div className="font-bold text-2xl text-blue-800 dark:text-blue-300">
                        {systemHealth.totalEvents}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400 font-medium">סה"כ אירועים</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-800">
                      <div className="font-bold text-2xl text-yellow-800 dark:text-yellow-300">
                        {systemHealth.pendingEvents}
                      </div>
                      <div className="text-yellow-600 dark:text-yellow-400 font-medium">ממתינים</div>
                    </div>
                  </div>
                </div>

                {/* Last Sync */}
                {lastSync && (
                  <div className="flex items-center gap-3 text-base font-medium text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                    <Clock className="w-5 h-5" />
                    <span>
                      סנכרון אחרון: {format(new Date(lastSync), 'HH:mm:ss', { locale: he })}
                    </span>
                  </div>
                )}

                {/* Force Sync Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleForceSync}
                  disabled={syncInProgress}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-bold text-lg shadow-lg haptic-light"
                >
                  <Zap className="w-6 h-6" />
                  {syncInProgress ? 'מסנכרן...' : 'סנכרון מלא'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyncStatusIndicator;