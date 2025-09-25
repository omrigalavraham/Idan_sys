import React, { useState } from 'react';
import { 
  Save, Bell, Moon, Sun, Volume2, Mail, Shield, Database, Send, 
  Download, Users, FileText
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLeadStore } from '../store/leadStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

interface Settings {
  dateFormat: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: string;
  autoLogout: boolean;
}

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { leads } = useLeadStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'support' | 'export'>('general');
  
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('app-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      dateFormat: 'dd/MM/yyyy',
      notificationsEnabled: true,
      soundEnabled: true,
      emailNotifications: true,
      desktopNotifications: true,
      twoFactorEnabled: false,
      sessionTimeout: '30',
      autoLogout: true
    };
  });
  
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('אירעה שגיאה בשמירת ההגדרות');
    }
  };

  const handleExportLeads = () => {
    try {
      if (leads.length === 0) {
        toast.error('אין נתונים לייצוא');
        return;
      }
      
      import('xlsx').then((module) => {
        const XLSX = module.default || module;
        
        const data = leads.map(lead => ({
          'שם': lead.name,
          'טלפון': lead.phone,
          'אימייל': lead.email || '',
          'סטטוס': lead.status,
          'מקור': lead.source || '',
          'הערות': lead.notes || '',
          'תאריך יצירה': new Date(lead.createdAt).toLocaleDateString('he-IL'),
          'תאריך עדכון': new Date(lead.updatedAt).toLocaleDateString('he-IL'),
          'שיוך נציג': lead.assignedTo || '',
          'תאריך שיחה חוזרת': lead.callbackDate ? new Date(lead.callbackDate).toLocaleDateString('he-IL') : '',
          'שעת שיחה חוזרת': lead.callbackTime || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'לידים');
        
        // Set column widths
        ws['!cols'] = [
          { wch: 20 }, // שם
          { wch: 15 }, // טלפון
          { wch: 25 }, // אימייל
          { wch: 15 }, // סטטוס
          { wch: 15 }, // מקור
          { wch: 30 }, // הערות
          { wch: 15 }, // תאריך יצירה
          { wch: 15 }, // תאריך עדכון
          { wch: 15 }, // שיוך נציג
          { wch: 15 }, // תאריך שיחה חוזרת
          { wch: 10 }  // שעת שיחה חוזרת
        ];

        // Generate filename with current date
        const currentDate = new Date().toLocaleDateString('he-IL').replace(/\//g, '_');
        const filename = `לידים_${currentDate}.xlsx`;
        
        // Create download link manually
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('Excel file downloaded successfully:', filename);
        toast.success('הנתונים יוצאו בהצלחה');
      }).catch((error) => {
        console.error('Error loading XLSX:', error);
        toast.error('אירעה שגיאה בייצוא הנתונים');
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast.error('אירעה שגיאה בייצוא הנתונים');
    }
  };

  const handleSendSupportEmail = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!supportForm.subject.trim()) {
      toast.error('נושא הפנייה הוא שדה חובה');
      return;
    }
    
    if (!supportForm.message.trim()) {
      toast.error('תוכן הפנייה הוא שדה חובה');
      return;
    }

    // Create email content
    const priorityLabels = {
      low: 'נמוכה',
      normal: 'רגילה',
      high: 'גבוהה',
      urgent: 'דחופה'
    };

    const emailSubject = `[תמיכה] ${supportForm.subject}`;
    const emailBody = `
שלום,

${supportForm.message}

---
פרטי הפנייה:
נושא: ${supportForm.subject}
דחיפות: ${priorityLabels[supportForm.priority as keyof typeof priorityLabels]}
תאריך: ${new Date().toLocaleString('he-IL', { 
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})}

---
פרטי המשתמש:
שם: ${user?.name || 'לא זמין'}
מייל: ${user?.email || 'לא זמין'}
תפקיד: ${user?.role || 'לא זמין'}
${user?.client_id ? `מזהה לקוח: ${user.client_id}` : ''}

בברכה,
${user?.name || 'משתמש המערכת'}
    `.trim();

    // Try Gmail first (like in the leads email functionality)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=AvrahamTikshoret@gmail.com&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Try to open Gmail
    try {
      const gmailWindow = window.open(gmailUrl, 'gmail-compose');
      if (!gmailWindow || gmailWindow.closed || typeof gmailWindow.closed === 'undefined') {
        // Gmail didn't open, try mailto as fallback
        const mailtoLink = `mailto:AvrahamTikshoret@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoLink, '_blank');
      }
    } catch (error) {
      console.error('Error opening Gmail:', error);
      // Fallback to mailto
      const mailtoLink = `mailto:AvrahamTikshoret@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink, '_blank');
    }
    
    // Show success message
    toast.success('תוכנת המייל נפתחה עם פרטי הפנייה');
    
    // Clear form
    setSupportForm({
      subject: '',
      message: '',
      priority: 'normal'
    });
  };

  const tabs = [
    { id: 'general', label: 'כללי', icon: Sun },
    { id: 'notifications', label: 'התראות', icon: Bell },
    { id: 'security', label: 'אבטחה', icon: Shield },
    { id: 'support', label: 'תמיכה', icon: Mail },
    { id: 'export', label: 'ייצוא נתונים', icon: Download }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">הגדרות מערכת</h1>
        <button
          onClick={handleSaveSettings}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95 min-h-[44px] text-base"
        >
          <Save className="w-5 h-5" />
          שמור הגדרות
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <AnimatePresence mode="wait">
          <div
            key={activeTab}
            className="p-4 md:p-6"
          >
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-4">הגדרות כלליות</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {theme === 'dark' ? <Moon className="h-5 w-5 flex-shrink-0" /> : <Sun className="h-5 w-5 flex-shrink-0" />}
                        <span className="text-gray-700 dark:text-gray-300">מצב תצוגה</span>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 min-h-[44px] text-base w-full sm:w-auto"
                      >
                        {theme === 'dark' ? 'מצב כהה' : 'מצב בהיר'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        פורמט תאריך
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      >
                        <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                        <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                        <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-4">הגדרות התראות</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Bell className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">התראות מערכת</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.notificationsEnabled}
                          onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Volume2 className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">צלילי מערכת</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.soundEnabled}
                          onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Mail className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">התראות במייל</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Bell className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">התראות דפדפן</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.desktopNotifications}
                          onChange={(e) => setSettings({ ...settings, desktopNotifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-4">הגדרות אבטחה</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Shield className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">אימות דו-שלבי</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.twoFactorEnabled}
                          onChange={(e) => setSettings({ ...settings, twoFactorEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        זמן חוסר פעילות (דקות)
                      </label>
                      <select
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      >
                        <option value="15">15 דקות</option>
                        <option value="30">30 דקות</option>
                        <option value="60">שעה</option>
                        <option value="120">שעתיים</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                        <Database className="h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">התנתקות אוטומטית</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.autoLogout}
                          onChange={(e) => setSettings({ ...settings, autoLogout: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-4">יצירת קשר עם התמיכה</h3>
                  <form onSubmit={handleSendSupportEmail} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        נושא הפנייה
                      </label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        דחיפות
                      </label>
                      <select
                        value={supportForm.priority}
                        onChange={(e) => setSupportForm({ ...supportForm, priority: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base"
                      >
                        <option value="low">נמוכה</option>
                        <option value="normal">רגילה</option>
                        <option value="high">גבוהה</option>
                        <option value="urgent">דחופה</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        תוכן הפנייה
                      </label>
                      <textarea
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-base resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-base"
                    >
                      <Send className="w-5 h-5" />
                      פתח תוכנת מייל
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-4">ייצוא נתונים</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <span className="text-base sm:text-lg">ייצוא לידים</span>
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            ייצוא כל הלידים לקובץ אקסל מסודר
                          </p>
                        </div>
                        <button
                          onClick={handleExportLeads}
                          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 min-h-[44px] text-base w-full sm:w-auto"
                        >
                          <Download className="w-5 h-5" />
                          ייצא לאקסל
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <span className="text-base sm:text-lg">ייצוא דוחות</span>
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            ייצוא דוחות מערכת לקובץ אקסל
                          </p>
                        </div>
                        <button
                          onClick={() => toast.success('בקרוב...')}
                          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-h-[44px] text-base w-full sm:w-auto"
                        >
                          <Download className="w-5 h-5" />
                          ייצא דוחות
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Settings;