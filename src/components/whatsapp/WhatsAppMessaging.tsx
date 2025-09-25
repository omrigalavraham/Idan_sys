import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle, XCircle, Clock, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhatsAppStore, useWhatsAppMessaging, useWhatsAppPermissions } from '../../store/whatsappStore';

interface WhatsAppMessagingProps {
  selectedPhoneNumbers?: string[];
  onMessageSent?: () => void;
  className?: string;
}

/**
 * רכיב שליחת הודעות ווטסאפ
 */
export const WhatsAppMessaging: React.FC<WhatsAppMessagingProps> = ({
  selectedPhoneNumbers = [],
  onMessageSent,
  className = '',
}) => {
  const { canSend, isManager, isAgent } = useWhatsAppPermissions();
  const { isConnected, messages, clearMessages } = useWhatsAppStore();
  const { sendWhatsAppMessage, isLoading, error } = useWhatsAppMessaging();

  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(selectedPhoneNumbers);
  const [customPhoneNumbers, setCustomPhoneNumbers] = useState('');
  const [showMessageHistory, setShowMessageHistory] = useState(false);

  // עדכון מספרי הטלפון כאשר selectedPhoneNumbers משתנה
  useEffect(() => {
    if (selectedPhoneNumbers.length > 0) {
      setPhoneNumbers(selectedPhoneNumbers);
    }
  }, [selectedPhoneNumbers]);

  // אם המשתמש לא יכול לשלוח הודעות, לא להציג את הרכיב
  if (!canSend) {
    return null;
  }

  const handleAddCustomNumbers = () => {
    if (!customPhoneNumbers.trim()) return;

    const numbers = customPhoneNumbers
      .split(/[,\n]/)
      .map(num => num.trim())
      .filter(num => num.length > 0);

    setPhoneNumbers(prev => [...new Set([...prev, ...numbers])]);
    setCustomPhoneNumbers('');
  };

  const handleRemovePhoneNumber = (numberToRemove: string) => {
    setPhoneNumbers(prev => prev.filter(num => num !== numberToRemove));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || phoneNumbers.length === 0) {
      return;
    }

    try {
      await sendWhatsAppMessage(phoneNumbers, message);
      setMessage('');
      onMessageSent?.();
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'נשלח';
      case 'failed':
        return 'נכשל';
      case 'pending':
        return 'ממתין';
      default:
        return 'לא ידוע';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">שליחת הודעות ווטסאפ</h3>
          <p className="text-sm text-gray-500">
            {isManager ? 'שלח הודעות דרך החיבור שלך' : 'שלח הודעות דרך החיבור של המנהל שלך'}
          </p>
        </div>
      </div>

      {/* סטטוס החיבור */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              {isManager 
                ? 'ווטסאפ לא מחובר. אנא חבר את החשבון שלך תחילה.'
                : 'המנהל שלך לא חיבר ווטסאפ. אנא בקש ממנו לחבר את החשבון.'
              }
            </span>
          </div>
        </motion.div>
      )}

      {/* הודעת שגיאה */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* מספרי טלפון */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          מספרי טלפון ({phoneNumbers.length})
        </label>
        
        {/* רשימת מספרים נבחרים */}
        {phoneNumbers.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {phoneNumbers.map((number, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {number}
                  <button
                    onClick={() => handleRemovePhoneNumber(number)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* הוספת מספרים נוספים */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customPhoneNumbers}
            onChange={(e) => setCustomPhoneNumbers(e.target.value)}
            placeholder="הוסף מספרי טלפון (מופרדים בפסיק או שורה חדשה)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNumbers()}
          />
          <button
            onClick={handleAddCustomNumbers}
            disabled={!customPhoneNumbers.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            הוסף
          </button>
        </div>
      </div>

      {/* תיבת הודעה */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          תוכן ההודעה
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="הקלד את ההודעה שלך כאן..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {message.length} תווים
          </span>
          <span className="text-xs text-gray-500">
            {phoneNumbers.length} נמענים
          </span>
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-3 justify-between items-center">
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setShowMessageHistory(!showMessageHistory)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Users className="h-4 w-4" />
              היסטוריה ({messages.length})
            </button>
          )}
          
          <button
            onClick={clearMessages}
            disabled={messages.length === 0}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            נקה היסטוריה
          </button>
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !message.trim() || phoneNumbers.length === 0 || isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isLoading ? 'שולח...' : 'שלח הודעה'}
        </button>
      </div>

      {/* היסטוריית הודעות */}
      <AnimatePresence>
        {showMessageHistory && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t border-gray-200 pt-4"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3">היסטוריית הודעות</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {msg.phone_number}
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(msg.status)}
                      <span className="text-xs text-gray-600">
                        {getStatusText(msg.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{msg.message}</p>
                  {msg.error && (
                    <p className="text-xs text-red-600">{msg.error}</p>
                  )}
                  {msg.sent_at && (
                    <p className="text-xs text-gray-500">
                      {new Date(msg.sent_at).toLocaleString('he-IL')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
