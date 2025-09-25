import React, { useEffect, useState } from 'react';
import { MessageSquare, Link, Unlink, CheckCircle, AlertCircle, Loader2, Settings, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhatsAppStore, useWhatsAppPermissions } from '../../store/whatsappStore';
import { useAuthStore } from '../../store/authStore';

/**
 * רכיב חיבור ווטסאפ למנהלים
 */
export const WhatsAppConnection: React.FC = () => {
  const { user } = useAuthStore();
  const { canConnect, isManager } = useWhatsAppPermissions();
  const {
    connection,
    isConnected,
    isLoading,
    error,
    checkConnectionStatus,
    connectWhatsApp,
    updateWhatsAppConnection,
    disconnectWhatsApp,
    clearError,
  } = useWhatsAppStore();

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showApiForm, setShowApiForm] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [apiForm, setApiForm] = useState({
    access_token: '',
    phone_number_id: '',
    business_account_id: '',
    app_id: '',
    webhook_verify_token: '',
  });

  // בדיקת סטטוס החיבור בטעינת הרכיב
  useEffect(() => {
    if (canConnect) {
      checkConnectionStatus();
    }
  }, [canConnect, checkConnectionStatus]);

  // ניקוי שגיאות אוטומטי
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // אם המשתמש לא מנהל, לא להציג את הרכיב
  if (!isManager) {
    return null;
  }

  const handleConnect = async () => {
    try {
      await connectWhatsApp(apiForm);
      setShowApiForm(false);
      setApiForm({
        access_token: '',
        phone_number_id: '',
        business_account_id: '',
        app_id: '',
        webhook_verify_token: '',
      });
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
    }
  };

  const handleUpdateConnection = async () => {
    try {
      await updateWhatsAppConnection(apiForm);
      setShowApiForm(false);
      setApiForm({
        access_token: '',
        phone_number_id: '',
        business_account_id: '',
        app_id: '',
        webhook_verify_token: '',
      });
    } catch (err) {
      console.error('Error updating WhatsApp connection:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWhatsApp();
      setShowDisconnectConfirm(false);
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">חיבור ווטסאפ</h3>
          <p className="text-sm text-gray-500">
            חבר את חשבון הווטסאפ העסקי שלך לשליחת הודעות
          </p>
        </div>
      </div>

      {/* הודעת שגיאה */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* סטטוס החיבור */}
      <div className="mb-6">
        {isConnected && connection ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900">ווטסאפ מחובר בהצלחה</h4>
                <p className="text-sm text-green-700">
                  חשבון הווטסאפ העסקי שלך מחובר ומוכן לשליחת הודעות
                </p>
                {connection.last_used_at && (
                  <p className="text-xs text-green-600 mt-1">
                    שימוש אחרון: {new Date(connection.last_used_at).toLocaleString('he-IL')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-gray-500" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">ווטסאפ לא מחובר</h4>
                <p className="text-sm text-gray-600">
                  חבר את חשבון הווטסאפ העסקי שלך כדי לשלוח הודעות
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-3">
        {!isConnected ? (
          <button
            onClick={() => setShowApiForm(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Link className="h-4 w-4" />
            חבר ווטסאפ עסקי
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowApiForm(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Settings className="h-4 w-4" />
              עדכן הגדרות
            </button>
            
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              {isLoading ? 'מנתק...' : 'נתק ווטסאפ'}
            </button>
            
            <button
              onClick={checkConnectionStatus}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              בדוק סטטוס
            </button>
          </>
        )}
      </div>

      {/* חלון אישור ניתוק */}
      <AnimatePresence>
        {showDisconnectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDisconnectConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Unlink className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">נתק חיבור ווטסאפ</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                האם אתה בטוח שברצונך לנתק את חיבור הווטסאפ? 
                לא תוכל לשלוח הודעות עד שתחבר מחדש.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'מנתק...' : 'נתק'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* טופס הגדרת API */}
      <AnimatePresence>
        {showApiForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowApiForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isConnected ? 'עדכון הגדרות ווטסאפ' : 'חיבור ווטסאפ עסקי'}
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token *
                  </label>
                  <div className="relative">
                    <input
                      type={showAccessToken ? 'text' : 'password'}
                      value={apiForm.access_token}
                      onChange={(e) => setApiForm(prev => ({ ...prev, access_token: e.target.value }))}
                      placeholder="הכנס את ה-Access Token שלך"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    value={apiForm.phone_number_id}
                    onChange={(e) => setApiForm(prev => ({ ...prev, phone_number_id: e.target.value }))}
                    placeholder="הכנס את ה-Phone Number ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Account ID (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={apiForm.business_account_id}
                    onChange={(e) => setApiForm(prev => ({ ...prev, business_account_id: e.target.value }))}
                    placeholder="הכנס את ה-Business Account ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App ID (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={apiForm.app_id}
                    onChange={(e) => setApiForm(prev => ({ ...prev, app_id: e.target.value }))}
                    placeholder="הכנס את ה-App ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Verify Token (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={apiForm.webhook_verify_token}
                    onChange={(e) => setApiForm(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                    placeholder="הכנס את ה-Webhook Verify Token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">איך לקבל את הפרטים?</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>היכנס ל-<a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a></li>
                    <li>צור אפליקציה חדשה מסוג "Business"</li>
                    <li>הוסף את המוצר "WhatsApp Business API"</li>
                    <li>קבל את ה-Access Token וה-Phone Number ID</li>
                    <li>הכנס את הפרטים בטופס זה</li>
                  </ol>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowApiForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={isConnected ? handleUpdateConnection : handleConnect}
                  disabled={isLoading || !apiForm.access_token || !apiForm.phone_number_id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isConnected ? 'מעדכן...' : 'מתחבר...'}
                    </div>
                  ) : (
                    isConnected ? 'עדכן הגדרות' : 'חבר ווטסאפ'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
