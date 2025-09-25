import React from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

interface WhatsAppTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  phoneNumber: string;
}

const defaultTemplates = [
  {
    id: 'no-answer',
    icon: '📞',
    title: 'אין מענה',
    message: (name: string) => `שלום ${name},
ניסינו ליצור איתך קשר אך לא הצלחנו להשיגך.
נשמח לשוחח ולספק את כל המידע הרלוונטי.
מוזמן לחזור אלינו בשעות הנוחות לך או להשיב להודעה זו.`
  },
  {
    id: 'no-answer-2',
    icon: '📞',
    title: 'אין מענה 2',
    message: (name: string) => `שלום ${name},
זו פנייה נוספת לאחר שניסינו ליצור איתך קשר בעבר.
נשמח לדעת אם עדיין רלוונטי עבורך שנמשיך בתהליך.
אם כן – נוכל לקבוע זמן שנוח לך לשיחה קצרה.`
  },
  {
    id: 'not-interested',
    icon: '❌',
    title: 'לא מעוניין',
    message: (name: string) => `שלום ${name},
תודה שעדכנת אותנו. מכבדים את ההחלטה שלך ולא נטריד מעבר לכך.
נשמח לעמוד לרשותך בעתיד, בכל זמן שתמצא לנכון.
מאחלים לך הצלחה רבה בהמשך.`
  },
  {
    id: 'new',
    icon: '✅',
    title: 'חדש',
    message: (name: string) => `שלום ${name},
תודה שפנית אלינו! שמחנו לקבל את פנייתך ונשמח לעמוד לשירותך.
נציג מצוות המכירות שלנו יחזור אליך בהקדם עם כל המידע הרלוונטי.
בינתיים, אם יש לך שאלות – אנחנו כאן בשבילך.`
  },
  {
    id: 'price-sent',
    icon: '📤',
    title: 'נשלחה הצעת מחיר',
    message: (name: string) => `שלום ${name},
שלחנו אליך הצעת מחיר מסודרת בהתאם לשיחתנו.
נשמח לדעת אם קיבלת את ההצעה ואם יש שאלות או הבהרות שנוכל לעזור בהן.
אנחנו זמינים עבורך בכל שלב.`
  },
  {
    id: 'custom',
    icon: '✏️',
    title: 'טקסט חופשי',
    message: () => ''
  }
];

const WhatsAppTemplates: React.FC<WhatsAppTemplatesProps> = ({ isOpen, onClose, leadName, phoneNumber }) => {
  const { user, clientConfig } = useAuthStore();
  const [customMessage, setCustomMessage] = React.useState('');

  // Get templates from client configuration and add to defaults
  let clientTemplates: any[] = [];
  
  // For managers and agents, show both default templates and client-specific templates
  if (user?.role !== 'admin' && clientConfig?.message_templates) {
    // Use client-specific templates for non-admin users
    clientTemplates = clientConfig.message_templates.filter((t: any) => t.template_type === 'whatsapp') || [];
  }
  
  // Always start with default templates, then add client-specific ones
  const templates = [
    ...defaultTemplates,
    ...clientTemplates.map(t => ({
      id: `client-${t.id}`,
      icon: '💬', // Default icon for client templates
      title: t.template_name,
      message: (name: string) => t.content.replace(/{name}/g, name).replace(/{phone}/g, phoneNumber)
    }))
  ];

  const handleSendMessage = async (templateId: string) => {
    let message;
    if (templateId === 'custom') {
      message = customMessage;
    } else {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;
      message = template.message(leadName);
    }

    // Format phone number for WhatsApp
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    
    // Handle Israeli phone numbers
    if (formattedPhone.startsWith('972')) {
      // Already has country code
      formattedPhone = formattedPhone;
    } else if (formattedPhone.startsWith('0')) {
      // Remove leading 0 and add Israel country code
      formattedPhone = '972' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 9) {
      // 9 digits without leading 0 - add Israel country code
      formattedPhone = '972' + formattedPhone;
    } else if (formattedPhone.length === 10 && formattedPhone.startsWith('5')) {
      // 10 digits starting with 5 (mobile) - add country code
      formattedPhone = '972' + formattedPhone;
    } else {
      // Default case - add Israel country code
      formattedPhone = '972' + formattedPhone;
    }

    // Encode the message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    
    try {
      window.open(whatsappUrl, 'whatsapp-web');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      window.open(whatsappUrl, '_blank');
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
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    תבניות WhatsApp
                  </h3>
                  <button
                    type="button"
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
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          placeholder="הקלד את ההודעה שלך כאן..."
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendMessage(template.id)}
                        className="w-full text-right p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{template.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {template.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                          {template.message(leadName)}
                        </p>
                      </button>
                    )}
                  </div>
                ))}

                {customMessage && (
                  <button
                    type="button"
                    onClick={() => handleSendMessage('custom')}
                    className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
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

export default WhatsAppTemplates;