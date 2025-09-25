import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, FolderSync as Sync, Check, X, AlertCircle, ExternalLink, Clock, Users, Settings } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService';
import { useLeadStore } from '../../store/leadStore';
import toast from 'react-hot-toast';

interface GoogleCalendarSyncProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [syncSettings, setSyncSettings] = useState({
    syncCallbacks: true,
    syncTasks: true,
    autoSync: true,
    reminderMinutes: 15
  });

  const { leads } = useLeadStore();

  useEffect(() => {
    checkConnectionStatus();
    loadSyncSettings();
  }, []);

  const checkConnectionStatus = () => {
    setIsConnected(googleCalendarService.isConnected());
  };

  const loadSyncSettings = () => {
    const saved = localStorage.getItem('google_calendar_sync_settings');
    if (saved) {
      setSyncSettings(JSON.parse(saved));
    }
  };

  const saveSyncSettings = () => {
    localStorage.setItem('google_calendar_sync_settings', JSON.stringify(syncSettings));
    toast.success('הגדרות הסנכרון נשמרו');
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await googleCalendarService.authenticate();
      if (success) {
        setIsConnected(true);
        toast.success('התחברת בהצלחה ל-Google Calendar');
        await loadUpcomingEvents();
      } else {
        toast.error('ההתחברות נכשלה');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('שגיאה בהתחברות ל-Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleCalendarService.disconnect();
      setIsConnected(false);
      setUpcomingEvents([]);
      toast.success('התנתקת מ-Google Calendar');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('שגיאה בהתנתקות');
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const events = await googleCalendarService.getUpcomingEvents();
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const handleSyncAll = async () => {
    if (!isConnected) {
      toast.error('נא להתחבר תחילה ל-Google Calendar');
      return;
    }

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      // Sync lead callbacks
      if (syncSettings.syncCallbacks) {
        const leadsWithCallbacks = leads.filter(lead => lead.callbackDate && lead.callbackTime);
        for (const lead of leadsWithCallbacks) {
          try {
            await googleCalendarService.syncLeadCallback(lead);
            syncedCount++;
          } catch (error) {
            console.error(`Failed to sync callback for ${lead.name}:`, error);
          }
        }
      }

      // Sync tasks
      if (syncSettings.syncTasks) {
        const allTasks = leads.flatMap(lead => lead.tasks || []);
        for (const task of allTasks) {
          try {
            const leadName = leads.find(l => l.id === task.leadId)?.name;
            await googleCalendarService.syncTask(task, leadName);
            syncedCount++;
          } catch (error) {
            console.error(`Failed to sync task ${task.title}:`, error);
          }
        }
      }

      toast.success(`סונכרנו ${syncedCount} אירועים בהצלחה`);
      await loadUpcomingEvents();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('שגיאה בסנכרון');
    } finally {
      setIsSyncing(false);
    }
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
              className="relative w-full max-w-4xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  סנכרון Google Calendar
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Connection Status */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-500" />
                      סטטוס חיבור
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <>
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">מחובר ל-Google Calendar</span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">לא מחובר</span>
                          </>
                        )}
                      </div>
                      
                      {isConnected ? (
                        <button
                          onClick={handleDisconnect}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          התנתק
                        </button>
                      ) : (
                        <button
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              מתחבר...
                            </>
                          ) : (
                            'התחבר ל-Google'
                          )}
                        </button>
                      )}
                    </div>

                    {isConnected && (
                      <div className="space-y-4">
                        <button
                          onClick={handleSyncAll}
                          disabled={isSyncing}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSyncing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              מסנכרן...
                            </>
                          ) : (
                            <>
                              <Sync className="w-5 h-5" />
                              סנכרן הכל עכשיו
                            </>
                          )}
                        </button>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>• שיחות חזרה יסונכרנו כאירועים ביומן</p>
                          <p>• משימות יסונכרנו עם תאריכי יעד</p>
                          <p>• האירועים יכללו את כל הפרטים הרלוונטיים</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sync Settings */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">הגדרות סנכרון</h3>
                    
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncSettings.syncCallbacks}
                          onChange={(e) => setSyncSettings({ ...syncSettings, syncCallbacks: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                          סנכרן שיחות חזרה
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncSettings.syncTasks}
                          onChange={(e) => setSyncSettings({ ...syncSettings, syncTasks: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                          סנכרן משימות
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncSettings.autoSync}
                          onChange={(e) => setSyncSettings({ ...syncSettings, autoSync: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                          סנכרון אוטומטי
                        </span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          תזכורת לפני (דקות)
                        </label>
                        <select
                          value={syncSettings.reminderMinutes}
                          onChange={(e) => setSyncSettings({ ...syncSettings, reminderMinutes: parseInt(e.target.value) })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                        >
                          <option value={5}>5 דקות</option>
                          <option value={10}>10 דקות</option>
                          <option value={15}>15 דקות</option>
                          <option value={30}>30 דקות</option>
                          <option value={60}>שעה</option>
                        </select>
                      </div>

                      <button
                        onClick={saveSyncSettings}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        שמור הגדרות
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        אירועים קרובים
                      </h3>
                      {isConnected && (
                        <button
                          onClick={loadUpcomingEvents}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          רענן
                        </button>
                      )}
                    </div>

                    {isConnected ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {upcomingEvents.length > 0 ? (
                          upcomingEvents.map((event, index) => (
                            <motion.div
                              key={event.id || index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {event.summary}
                                  </h4>
                                  {event.start?.dateTime && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {new Date(event.start.dateTime).toLocaleDateString('he-IL')} 
                                      {' '}
                                      {new Date(event.start.dateTime).toLocaleTimeString('he-IL', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </p>
                                  )}
                                  {event.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                {event.htmlLink && (
                                  <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            אין אירועים קרובים
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        התחבר ל-Google Calendar כדי לראות אירועים
                      </div>
                    )}
                  </div>

                  {/* Sync Statistics */}
                  {isConnected && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        סטטיסטיקות סנכרון
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {leads.filter(l => l.callbackDate).length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            שיחות חזרה
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {leads.flatMap(l => l.tasks || []).length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            משימות
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isConnected && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      כדי להשתמש בסנכרון Google Calendar, נדרש להתחבר לחשבון Google שלך.
                      הנתונים יישארו מאובטחים ולא יישמרו על השרתים שלנו.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GoogleCalendarSync;