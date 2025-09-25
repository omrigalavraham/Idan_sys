import React from 'react';
import { Mail, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

interface EmailTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  email: string;
}

const defaultTemplates = [
  {
    id: 'no-answer',
    icon: '📞',
    title: 'אין מענה',
    subject: 'ניסינו ליצור איתך קשר',
    message: (name: string) => `שלום ${name},
ניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.
נשמח לשוחח ולספק את כל המידע הרלוונטי.
מוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.`
  },
  {
    id: 'no-answer-2',
    icon: '📞',
    title: 'אין מענה 2',
    subject: 'פנייה נוספת',
    message: (name: string) => `שלום ${name},
זו פנייה נוספת לאחר שניסינו ליצור איתך קשר בעבר.
נשמח לדעת אם עדיין רלוונטי עבורך שנמשיך בתהליך.
אם כן – נוכל לקבוע זמן שנוח לך לשיחה קצרה.`
  },
  {
    id: 'not-interested',
    icon: '❌',
    title: 'לא מעוניין',
    subject: 'תודה על העדכון',
    message: (name: string) => `שלום ${name},
תודה שעדכנת אותנו. מכבדים את ההחלטה שלך ולא נטריד מעבר לכך.
נשמח לעמוד לרשותך בעתיד, בכל זמן שתמצא לנכון.
מאחלים לך הצלחה רבה בהמשך.`
  },
  {
    id: 'new',
    icon: '✅',
    title: 'חדש',
    subject: 'תודה על פנייתך',
    message: (name: string) => `שלום ${name},
תודה שפנית אלינו! שמחנו לקבל את פנייתך ונשמח לעמוד לשירותך.
נציג מצוות המכירות שלנו יחזור אליך בהקדם עם כל המידע הרלוונטי.
בינתיים, אם יש לך שאלות – אנחנו כאן בשבילך.`
  },
  {
    id: 'price-sent',
    icon: '📤',
    title: 'נשלחה הצעת מחיר',
    subject: 'הצעת מחיר עבורך',
    message: (name: string) => `שלום ${name},
שלחנו אליך הצעת מחיר מסודרת בהתאם לשיחתנו.
נשמח לדעת אם קיבלת את ההצעה ואם יש שאלות או הבהרות שנוכל לעזור בהן.
אנחנו זמינים עבורך בכל שלב.`
  },
  {
    id: 'custom',
    icon: '✏️',
    title: 'טקסט חופשי',
    subject: '',
    message: () => ''
  }
];

const EmailTemplates: React.FC<EmailTemplatesProps> = ({ isOpen, onClose, leadName, email }) => {
  const { user, clientConfig } = useAuthStore();
  const [customSubject, setCustomSubject] = React.useState('');
  const [customMessage, setCustomMessage] = React.useState('');

  // Get templates from client configuration and add to defaults
  let clientTemplates: any[] = [];
  
  // For managers and agents, show both default templates and client-specific templates
  if (user?.role !== 'admin' && clientConfig?.message_templates) {
    // Use client-specific templates for non-admin users
    clientTemplates = clientConfig.message_templates.filter((t: any) => t.template_type === 'email') || [];
  }
  
  // Always start with default templates, then add client-specific ones
  const templates = [
    ...defaultTemplates,
    ...clientTemplates.map(t => ({
      id: `client-${t.id}`,
      icon: '📧', // Default icon for client templates
      title: t.template_name,
      subject: t.subject || '',
      message: (name: string) => t.content.replace(/{name}/g, name).replace(/{email}/g, email)
    }))
  ];

  const handleSendEmail = async (templateId: string) => {
    let subject: string;
    let message: string;
    
    if (templateId === 'custom') {
      subject = customSubject;
      message = customMessage;
    } else {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;
      subject = template.subject;
      message = template.message(leadName);
    }

    // Encode the subject and message for Gmail
    const encodedSubject = encodeURIComponent(subject);
    const encodedMessage = encodeURIComponent(message);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodedSubject}&body=${encodedMessage}`;
    
    try {
      window.open(gmailUrl, 'gmail-compose');
    } catch (error) {
      console.error('Error opening Gmail:', error);
      window.open(gmailUrl, '_blank');
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto my-8">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    תבניות אימייל
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">סגור</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {templates.map((template) => (
                  <div key={template.id} className="space-y-2">
                    {template.id === 'custom' ? (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{template.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {template.title}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder="נושא ההודעה"
                          className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          placeholder="תוכן ההודעה"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendEmail(template.id)}
                        className="w-full text-right p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{template.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {template.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <strong>נושא:</strong> {template.subject}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                          {template.message(leadName)}
                        </p>
                      </button>
                    )}
                  </div>
                ))}

                {customMessage && (
                  <button
                    onClick={() => handleSendEmail('custom')}
                    className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    שלח הודעה מותאמת אישית
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EmailTemplates;