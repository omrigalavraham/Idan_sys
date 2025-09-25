import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Mail, Send, Users, Copy } from 'lucide-react';
import { Lead } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { WhatsAppMessaging } from '../whatsapp';
import toast from 'react-hot-toast';

interface BulkMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
}

// Default templates for bulk messaging
const defaultTemplates = {
  whatsapp: [
    {
      id: 'no-answer',
      name: 'no-answer',
      icon: '📞',
      title: 'אין מענה',
      message: 'שלום {name},\nניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.\nנשמח לשוחח ולספק את כל המידע הרלוונטי.\nמוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.'
    },
    {
      id: 'not-interested',
      name: 'not-interested',
      icon: '❌',
      title: 'לא מעוניין',
      message: 'שלום {name},\nתודה שעדכנת אותנו. מכבדים את ההחלטה שלך ולא נטריד מעבר לכך.\nנשמח לעמוד לרשותך בעתיד, בכל זמן שתמצא לנכון.\nמאחלים לך הצלחה רבה בהמשך.'
    },
    {
      id: 'new',
      name: 'new',
      icon: '✅',
      title: 'חדש',
      message: 'שלום {name},\nתודה שפנית אלינו! שמחנו לקבל את פנייתך ונשמח לעמוד לשירותך.\nנציג מצוות המכירות שלנו יחזור אליך בהקדם עם כל המידע הרלוונטי.\nבינתיים, אם יש לך שאלות – אנחנו כאן בשבילך.'
    }
  ],
  email: [
    {
      id: 'no-answer',
      name: 'no-answer',
      icon: '📞',
      title: 'אין מענה',
      subject: 'ניסינו ליצור איתך קשר',
      message: 'שלום {name},\nניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.\nנשמח לשוחח ולספק את כל המידע הרלוונטי.\nמוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.'
    },
    {
      id: 'not-interested',
      name: 'not-interested',
      icon: '❌',
      title: 'לא מעוניין',
      subject: 'תודה על העדכון',
      message: 'שלום {name},\nתודה שעדכנת אותנו. מכבדים את ההחלטה שלך ולא נטריד מעבר לכך.\nנשמח לעמוד לרשותך בעתיד, בכל זמן שתמצא לנכון.\nמאחלים לך הצלחה רבה בהמשך.'
    },
    {
      id: 'new',
      name: 'new',
      icon: '✅',
      title: 'חדש',
      subject: 'תודה על פנייתך',
      message: 'שלום {name},\nתודה שפנית אלינו! שמחנו לקבל את פנייתך ונשמח לעמוד לשירותך.\nנציג מצוות המכירות שלנו יחזור אליך בהקדם עם כל המידע הרלוונטי.\nבינתיים, אם יש לך שאלות – אנחנו כאן בשבילך.'
    }
  ]
};

const BulkMessageDialog: React.FC<BulkMessageDialogProps> = ({
  isOpen,
  onClose,
  selectedLeads
}) => {
  const { user, clientConfig } = useAuthStore();
  const [messageType, setMessageType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  // Get templates from client configuration and combine with defaults
  let clientTemplates: any[] = [];
  
  // For managers and agents, show both default templates and client-specific templates
  if (user?.role !== 'admin' && clientConfig?.message_templates) {
    clientTemplates = clientConfig.message_templates.filter((t: any) => t.template_type === messageType) || [];
  }
  
  // Combine default templates with client-specific ones
  const templates = [
    ...defaultTemplates[messageType],
    ...clientTemplates.map(t => ({
      id: `client-${t.id}`,
      name: t.template_name,
      icon: messageType === 'whatsapp' ? '💬' : '📧',
      title: t.template_name,
      subject: t.subject || '',
      message: t.content
    }))
  ];

  const handleSendMessages = () => {
    if (!selectedTemplate && !customMessage) {
      toast.error('נא לבחור תבנית או להקליד הודעה');
      return;
    }

    let message = customMessage;
    let subject = customSubject;

    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate || t.name === selectedTemplate);
      if (template) {
        message = template.message;
        subject = (template as any).subject || '';
      }
    }

    if (messageType === 'whatsapp') {
      // For WhatsApp, we'll create a broadcast list
      handleWhatsAppBulk(message);
    } else {
      // For Email, we'll send one email with multiple BCC recipients
      handleEmailBulk(message, subject);
    }

    toast.success(`נשלחו הודעות ל-${selectedLeads.length} לידים`);
    onClose();
  };

  const handleWhatsAppBulk = async (message: string) => {
    // Format all phone numbers for WhatsApp
    const formattedPhones = selectedLeads.map(lead => {
      let formattedPhone = lead.phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '972' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('972')) {
        formattedPhone = '972' + formattedPhone;
      }
      return formattedPhone;
    });

    // Create a personalized message for the first lead (as an example)
    const firstLead = selectedLeads[0];
    const personalizedMessage = message
      .replace(/{name}/g, firstLead.name)
      .replace(/{phone}/g, firstLead.phone)
      .replace(/{email}/g, firstLead.email || '')
      .replace(/{company}/g, (firstLead as any).company || '');

    const encodedMessage = encodeURIComponent(personalizedMessage);
    
    // Copy phone numbers to clipboard for easy pasting
    try {
      await navigator.clipboard.writeText(formattedPhones.join('\n'));
      toast.success('מספרי הטלפון הועתקו ללוח');
    } catch (err) {
      console.error('Failed to copy phone numbers:', err);
    }
    
    // For bulk WhatsApp, we'll open WhatsApp Web with the message ready
    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Show detailed instructions for creating broadcast list
    setTimeout(() => {
      toast.success(
        `הוראות לרשימת תפוצה: 1. לחץ על "..." ב-WhatsApp 2. בחר "רשימת תפוצה חדשה" 3. הדבק את המספרים מהלוח 4. שלח את ההודעה`,
        { duration: 10000 }
      );
    }, 1000);
  };

  const handleEmailBulk = (message: string, subject: string) => {
    // Get all email addresses
    const emailAddresses = selectedLeads
      .filter(lead => lead.email && lead.email.trim())
      .map(lead => lead.email);

    if (emailAddresses.length === 0) {
      toast.error('לא נמצאו כתובות אימייל ללידים שנבחרו');
      return;
    }

    // Create a personalized message for the first lead (as an example)
    const firstLead = selectedLeads[0];
    const personalizedMessage = message
      .replace(/{name}/g, firstLead.name)
      .replace(/{phone}/g, firstLead.phone)
      .replace(/{email}/g, firstLead.email || '')
      .replace(/{company}/g, (firstLead as any).company || '');

    // Create Gmail URL with all recipients in "To" field (same format as individual lead)
    const encodedSubject = encodeURIComponent(subject);
    const encodedMessage = encodeURIComponent(personalizedMessage);
    const toList = emailAddresses.join(',');
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toList}&su=${encodedSubject}&body=${encodedMessage}`;
    
    try {
      window.open(gmailUrl, 'gmail-compose');
    } catch (error) {
      console.error('Error opening Gmail:', error);
      window.open(gmailUrl, '_blank');
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
              className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  שליחת הודעות מרובות
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    נבחרו {selectedLeads.length} לידים לשליחת הודעות
                  </p>
                  <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                    {messageType === 'whatsapp' ? (
                      <span>📱 WhatsApp: ההודעה תיפתח עם רשימת המספרים ליצירת רשימת תפוצה</span>
                    ) : (
                      <span>📧 אימייל: כל כתובות האימייל יופיעו בשדה "נמענים"</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    סוג הודעה
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setMessageType('whatsapp')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        messageType === 'whatsapp'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <MessageSquare className="w-5 h-5" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType('email')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        messageType === 'email'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Mail className="w-5 h-5" />
                      אימייל
                    </button>
                  </div>
                </div>

                {/* רכיב שליחת הודעות ווטסאפ */}
                {messageType === 'whatsapp' && (
                  <div className="mt-4">
                    <WhatsAppMessaging
                      selectedPhoneNumbers={selectedLeads.map(lead => lead.phone)}
                      onMessageSent={() => {
                        toast.success(`נשלחו הודעות ווטסאפ ל-${selectedLeads.length} לידים`);
                        onClose();
                      }}
                    />
                  </div>
                )}

                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      בחר תבנית
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="">בחר תבנית או כתב הודעה מותאמת</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.icon} {template.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {messageType === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      נושא האימייל
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="נושא ההודעה"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תוכן ההודעה
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={6}
                    placeholder="כתוב את ההודעה כאן... השתמש במשתנים: {name}, {phone}, {email}, {company}"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    משתנים זמינים: {'{name}'}, {'{phone}'}, {'{email}'}, {'{company}'}
                  </p>
                </div>

                {/* Selected Leads Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      לידים שנבחרו ({selectedLeads.length})
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (messageType === 'whatsapp') {
                            const phones = selectedLeads.map(lead => {
                              let formattedPhone = lead.phone.replace(/\D/g, '');
                              if (formattedPhone.startsWith('0')) {
                                formattedPhone = '972' + formattedPhone.substring(1);
                              } else if (!formattedPhone.startsWith('972')) {
                                formattedPhone = '972' + formattedPhone;
                              }
                              return formattedPhone;
                            });
                            await navigator.clipboard.writeText(phones.join('\n'));
                            toast.success('מספרי הטלפון הועתקו ללוח');
                          } else {
                            const emails = selectedLeads
                              .filter(lead => lead.email && lead.email.trim())
                              .map(lead => lead.email);
                            await navigator.clipboard.writeText(emails.join('\n'));
                            toast.success('כתובות האימייל הועתקו ללוח');
                          }
                        } catch (err) {
                          toast.error('שגיאה בהעתקה ללוח');
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                    >
                      <Copy className="w-3 h-3" />
                      העתק {messageType === 'whatsapp' ? 'מספרים' : 'אימיילים'}
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                    {selectedLeads.map((lead, index) => (
                      <div key={lead.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {index + 1}. {lead.name}
                        </span>
                        <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {messageType === 'whatsapp' ? (
                            <span>📱 {lead.phone}</span>
                          ) : (
                            <span>📧 {lead.email || 'אין אימייל'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMessages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    שלח הודעות ({selectedLeads.length})
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

export default BulkMessageDialog;