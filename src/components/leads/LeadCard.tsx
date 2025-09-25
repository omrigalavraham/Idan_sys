import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Mail, Calendar, Clock, Edit2, Trash2, 
  PhoneCall
} from 'lucide-react';
import { Lead } from '../../types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';

// Custom WhatsApp icon component
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
  </svg>
);
import LeadAnalysis from '../ai/LeadAnalysis';
import LeadHistory from './LeadHistory';
import WhatsAppTemplates from './WhatsAppTemplates';
import EmailTemplates from './EmailTemplates';

interface LeadCardProps {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  checkbox?: React.ReactNode;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onEdit, onDelete, canEdit = true, canDelete = true, checkbox }) => {
  const { clientConfig } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(() => {
    const savedState = localStorage.getItem(`lead-${lead.id}-expanded`);
    return savedState ? JSON.parse(savedState) : false;
  });
  const [showWhatsAppTemplates, setShowWhatsAppTemplates] = useState(false);
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);

  const handleWhatsAppClick = () => {
    setShowWhatsAppTemplates(true);
  };

  const handleEmailClick = () => {
    if (lead.email) {
      setShowEmailTemplates(true);
    }
  };

  const handlePhoneClick = () => {
    // Format phone number for dialer
    const formattedPhone = lead.phone.replace(/\D/g, '');
    const phoneUrl = `tel:${formattedPhone}`;
    
    // Create clickable link for mobile
    const link = document.createElement('a');
    link.href = phoneUrl;
    link.setAttribute('class', 'phone-link');
    link.click();
  };

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
    const { user } = useAuthStore.getState();
    if (user?.role === 'admin') {
      return getDefaultStatusColor(statusName);
    }
    const status = clientConfig?.lead_statuses?.find((s: any) => s.name === statusName);
    if (status) {
      return status.color;
    }
    return getDefaultStatusColor(statusName);
  };

  return (
    <motion.div
      layout
      className="lead-card bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden touch-manipulation border border-gray-100 dark:border-gray-800 mobile-slide-up"
      style={{
        minHeight: '120px', // Minimum height for better mobile experience
        marginBottom: '16px' // Spacing between cards on mobile
      }}
    >
      {/* Header - Always Visible */}
      <div className="p-8 md:p-6 cursor-pointer touch-manipulation" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl md:text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h3>
              <div className="flex items-center gap-3 md:gap-2 flex-wrap">
                {checkbox}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePhoneClick();
                  }}
                  className="card-action-button phone haptic-light"
                >
                  <PhoneCall className="w-7 h-7 text-green-600 dark:text-green-400" />
                </motion.button>
                {lead.email && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmailClick();
                    }}
                    className="card-action-button edit haptic-light"
                  >
                    <Mail className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsAppClick();
                  }}
                  className="card-action-button phone haptic-light"
                >
                  <WhatsAppIcon className="w-7 h-7 text-green-600 dark:text-green-400" />
                </motion.button>
                {canEdit && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="card-action-button edit haptic-light"
                  >
                    <Edit2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </motion.button>
                )}
                {canDelete && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="card-action-button delete haptic-medium"
                  >
                    <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="status-badge inline-block px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: getStatusColor(lead.status) + '20',
                  color: getStatusColor(lead.status)
                }}
              >
                {lead.status}
              </motion.span>

              <div className="flex items-center text-purple-600 dark:text-purple-400 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <Calendar className="w-4 h-4 ml-2" />
                <span className="text-sm font-medium">
                  {format(new Date(lead.createdAt), 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePhoneClick();
                }}
                className="flex items-center text-green-600 dark:text-green-400 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 haptic-light"
              >
                <Phone className="w-4 h-4 ml-2" />
                <span dir="ltr" className="text-sm font-semibold">{lead.phone}</span>
              </motion.button>

              {lead.email && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmailClick();
                  }}
                  className="flex items-center text-blue-600 dark:text-blue-400 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 haptic-light"
                >
                  <Mail className="w-4 h-4 ml-2" />
                  <span className="text-sm font-semibold">{lead.email}</span>
                </motion.button>
              )}

              {lead.callbackDate && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center text-blue-600 dark:text-blue-400 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                >
                  <Clock className="w-4 h-4 ml-2" />
                  <span className="text-sm font-semibold">
                    {format(new Date(lead.callbackDate), 'dd/MM/yyyy', { locale: he })}
                    {lead.callbackTime && ` ${lead.callbackTime}`}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-800"
          >
            <div className="p-8 md:p-6">

              {lead.notes && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <p className="text-lg md:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{lead.notes}</p>
                </div>
              )}

              <LeadAnalysis lead={lead} />
              <LeadHistory history={lead.history || []} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsAppTemplates
        isOpen={showWhatsAppTemplates}
        onClose={() => setShowWhatsAppTemplates(false)}
        leadName={lead.name}
        phoneNumber={lead.phone}
      />

      <EmailTemplates
        isOpen={showEmailTemplates}
        onClose={() => setShowEmailTemplates(false)}
        leadName={lead.name}
        email={lead.email || ''}
      />
    </motion.div>
  );
};

export default LeadCard;