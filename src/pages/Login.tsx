import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Lock, Mail, Loader2, AlertCircle, Send } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';


const Login = () => {
  const navigate = useNavigate();
  const { login, savedCredentials } = useAuthStore();
  
  // Fix iOS viewport
  React.useEffect(() => {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Fix iOS viewport issues
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setVH();
      window.addEventListener('resize', setVH);
      window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100);
      });
      
      return () => {
        window.removeEventListener('resize', setVH);
        window.removeEventListener('orientationchange', setVH);
      };
    }
  }, []);

  // Prevent zoom on input focus for iOS
  React.useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', preventZoom, { passive: false });
    return () => document.removeEventListener('touchstart', preventZoom);
  }, []);

  // Enhanced error handling for mobile
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Mobile error:', error);
      if (error.message.includes('Network')) {
        setErrorMessage('בעיית רשת. בדוק את החיבור לאינטרנט');
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Handle mobile keyboard
  React.useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--keyboard-height', `${window.innerHeight - window.visualViewport.height}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  
  // Login form state
  const [email, setEmail] = useState(savedCredentials?.email || '');
  const [password, setPassword] = useState(savedCredentials?.password || '');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  useEffect(() => {
    if (savedCredentials) {
      setEmail(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
  }, [savedCredentials]);

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setRemainingAttempts(null);
    setLockoutTime(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      await login(trimmedEmail, password, rememberMe);
      toast.success('ברוכים הבאים למערכת');
      navigate('/');
    } catch (error: any) {
      console.error('Login attempt failed:', error);
      
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        setLockoutTime(error.lockoutTimeRemaining);
        setErrorMessage(`החשבון נעול זמנית. נסה שוב בעוד ${formatLockoutTime(error.lockoutTimeRemaining)}`);
      } else if (error.code === 'INVALID_CREDENTIALS') {
        setErrorMessage('שם משתמש או סיסמה שגויים');
        if (error.remainingAttempts !== undefined) {
          setRemainingAttempts(error.remainingAttempts);
          if (error.remainingAttempts > 0) {
            setErrorMessage(`שם משתמש או סיסמה שגויים. נותרו ${error.remainingAttempts} ניסיונות`);
          }
        }
      } else {
        setErrorMessage('אירעה שגיאה בהתחברות. אנא נסה שוב מאוחר יותר');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    toast.success('פנה למנהל המערכת לאיפוס סיסמה');
  };

  const handleSendSupportEmail = () => {
    const emailSubject = '[תמיכה] בעיית התחברות - שכחתי סיסמה';
    const emailBody = `
שלום,

אני זקוק לעזרה עם בעיית התחברות למערכת.

פרטי הבעיה:
- לא מצליח להתחבר למערכת
- שכחתי את הסיסמה שלי
- כתובת המייל: ${email || 'לא צוין'}

אנא עזרו לי לאיפוס הסיסמה או פתרון הבעיה.

תאריך: ${new Date().toLocaleString('he-IL', { 
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})}

בברכה,
משתמש המערכת
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8"
        >
          <div className="flex items-center justify-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Building2 className="h-12 w-12 md:h-16 md:w-16 text-blue-600 dark:text-blue-400" />
            </motion.div>
          </div>
          
          <div className="text-center mb-6 md:mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
            >
              אברהם תקשורת
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400"
            >
              אברהם תקשורת - מערכת לניהול לידים
            </motion.p>
          </div>

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-lg ${
                  lockoutTime 
                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm md:text-base font-medium" dir="rtl">{errorMessage}</span>
                </div>
                {remainingAttempts === 1 && (
                  <p className="mt-2 text-sm md:text-base text-red-600 dark:text-red-400" dir="rtl">
                    שים לב: ניסיון כניסה נוסף שגוי יגרום לנעילת החשבון זמנית
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                דואר אלקטרוני
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-12 pl-4 py-3 md:py-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={isLoading || lockoutTime !== null}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-12 pl-4 py-3 md:py-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading || lockoutTime !== null}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || lockoutTime !== null}
                />
                <span className="mr-2 text-sm md:text-base text-gray-600 dark:text-gray-400">זכור אותי</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutTime !== null}
              className="w-full flex justify-center items-center py-3 md:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base md:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed min-h-[48px]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : lockoutTime !== null ? (
                'החשבון נעול זמנית'
              ) : (
                'התחבר'
              )}
            </button>
          </motion.form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              שכחתי סיסמה
            </button>
          </div>

          {showForgotPassword && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
            >
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                לאיפוס סיסמה, פנה למנהל המערכת או שלח מייל לתמיכה.
              </p>
              <button
                type="button"
                onClick={handleSendSupportEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                שלח מייל לתמיכה
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;