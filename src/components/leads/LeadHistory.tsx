import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, MessageSquare, Calendar, AlertCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { HistoryEntry } from '../../types';

interface LeadHistoryProps {
  history: HistoryEntry[];
}

const LeadHistory: React.FC<LeadHistoryProps> = ({ history }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getIcon = (type: string) => {
    switch (type) {
      case 'status':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'note':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'callback':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'task':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'edit':
        return <Edit2 className="w-4 h-4 text-gray-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDescription = (entry: HistoryEntry) => {
    switch (entry.type) {
      case 'status':
        return entry.metadata?.before ? (
          <span>
            סטטוס שונה מ-
            <span className="font-medium">{entry.metadata.before}</span>
            {' '}ל-
            <span className="font-medium">{entry.metadata.after}</span>
          </span>
        ) : (
          <span>
            סטטוס נקבע ל-
            <span className="font-medium">{entry.metadata?.status}</span>
          </span>
        );
      case 'note':
        return (
          <span>
            {entry.description}
            {entry.metadata?.notes && (
              <span className="block mt-1 text-gray-600 dark:text-gray-400">
                "{entry.metadata.notes}"
              </span>
            )}
          </span>
        );
      case 'callback':
        return (
          <span>
            נקבעה שיחה חוזרת ל-
            {entry.metadata?.callbackDate && (
              <span className="font-medium">
                {format(new Date(entry.metadata.callbackDate), 'dd/MM/yyyy', { locale: he })}
              </span>
            )}
            {entry.metadata?.callbackTime && (
              <span className="font-medium"> בשעה {entry.metadata.callbackTime}</span>
            )}
          </span>
        );
      default:
        return entry.description;
    }
  };

  const getLatestEntry = () => {
    if (history.length === 0) return null;
    const latest = history[0];
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        {getIcon(latest.type)}
        <span className="truncate">{getDescription(latest)}</span>
        <span className="text-xs">
          {format(new Date(latest.createdAt), 'HH:mm', { locale: he })}
        </span>
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">היסטוריית ליד</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {!isExpanded && getLatestEntry()}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            {history.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 mt-1">{getIcon(entry.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {getDescription(entry)}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                אין היסטוריה זמינה
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadHistory;