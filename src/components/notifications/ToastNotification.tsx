import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ToastNotificationProps {
  id: string;
  title: string;
  message: string;
  type: 'lead' | 'task';
  metadata?: {
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
    notes?: string;
  };
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  id,
  title,
  message,
  type,
  metadata,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {type === 'lead' ? (
            <Phone className="w-5 h-5 text-blue-500 mt-1" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-1" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
            
            {metadata && (
              <div className="mt-2 space-y-1">
                {metadata.name && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">שם: </span>
                    {metadata.name}
                  </p>
                )}
                {metadata.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">טלפון: </span>
                    <span dir="ltr">{metadata.phone}</span>
                  </p>
                )}
                {(metadata.date || metadata.time) && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    {metadata.date && (
                      <span>
                        {format(new Date(metadata.date), 'dd/MM/yyyy', { locale: he })}
                      </span>
                    )}
                    {metadata.time && <span>{metadata.time}</span>}
                  </div>
                )}
                {metadata.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">הערות: </span>
                    {metadata.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onClose(id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

export default ToastNotification;