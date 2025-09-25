import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, History, Clock, Trash2, Search, Star, StarOff } from 'lucide-react';
import { useDialerStore, dialerUtils } from '../store/dialerStore';
import { useAuthStore } from '../store/authStore';

const Dialer: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dialerRef = useRef<HTMLDivElement>(null);

  // Use auth store to get current user
  const { user } = useAuthStore();

  // Use dialer store
  const {
    callHistory,
    addCallToHistory,
    updateCallDuration,
    deleteCallFromHistory,
    addToRecent,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getContactByPhone,
    loadUserData,
    saveUserData
  } = useDialerStore();

  const handleNumberInput = (number: string) => {
    if (phoneNumber.length < 15) { // Limit phone number length
      setPhoneNumber(prev => prev + number);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber('');
  };

  const handleCall = useCallback(async () => {
    if (!phoneNumber.trim()) return;

    setIsCalling(true);
    
    // Add to call history
    const contact = getContactByPhone(phoneNumber);
    addCallToHistory({
      phoneNumber: phoneNumber,
      contactName: contact?.name,
      timestamp: new Date(),
      duration: 0,
      type: 'outgoing'
    });

    // Add to recent numbers
    addToRecent(phoneNumber);

    try {
      // Use dialer utils for calling
      dialerUtils.initiateCall(phoneNumber);

      // Simulate call duration (in real app, this would be tracked from actual call)
      setTimeout(() => {
        setIsCalling(false);
        // Update call duration in history - we need to get the latest call ID
        const latestCall = callHistory[0];
        if (latestCall) {
          updateCallDuration(latestCall.id, Math.floor(Math.random() * 300) + 30);
        }
      }, 2000);

    } catch (error) {
      console.error('Error initiating call:', error);
      setIsCalling(false);
    }
  }, [phoneNumber, getContactByPhone, addCallToHistory, addToRecent, callHistory, updateCallDuration]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Allow typing numbers, *, #, +, -, (, ), and space
      const allowedKeys = /^[0-9*#+\-() ]$/.test(event.key);
      
      if (allowedKeys && phoneNumber.length < 15) {
        event.preventDefault();
        setPhoneNumber(prev => prev + event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        setPhoneNumber(prev => prev.slice(0, -1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (phoneNumber.trim()) {
          handleCall();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setPhoneNumber('');
      }
    };

    // Add event listener when component mounts
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [phoneNumber, handleCall]); // Include phoneNumber and handleCall in dependency array

  // Focus the dialer area when component mounts
  useEffect(() => {
    if (dialerRef.current) {
      dialerRef.current.focus();
    }
  }, []);

  // Load user-specific data when user changes (only once)
  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    }
  }, [user?.id]); // Remove loadUserData from dependencies to prevent re-loading

  // Save user data when call history changes
  useEffect(() => {
    if (user?.id && callHistory.length > 0) {
      // Debounce the save operation to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveUserData(user.id);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [callHistory, user?.id, saveUserData]);


  const handleToggleFavorite = (phoneNumber: string) => {
    if (isFavorite(phoneNumber)) {
      removeFromFavorites(phoneNumber);
    } else {
      addToFavorites(phoneNumber);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: Date | string): string => {
    // Ensure timestamp is a Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'תאריך לא תקין';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'אתמול';
    } else if (days < 7) {
      return `${days} ימים`;
    } else {
      return date.toLocaleDateString('he-IL');
    }
  };

  const filteredHistory = callHistory.filter(call =>
    call.phoneNumber.includes(searchTerm) ||
    (call.contactName && call.contactName.includes(searchTerm))
  );

  const numberPad = [
    ['3', '2', '1'],
    ['6', '5', '4'],
    ['9', '8', '7'],
    ['#', '0', '*']
  ];

  return (
    <div 
      ref={dialerRef}
      tabIndex={0}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 focus:outline-none"
    >
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
            חייגן
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 px-2">
            {user ? `שלום ${user.name}, חייג בקלות לכל מספר` : 'חייג בקלות לכל מספר'}
          </p>
        </div>

        {/* Phone Number Display */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-lg">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-mono font-bold text-gray-800 dark:text-white mb-3 md:mb-2 min-h-[2rem] md:min-h-[2.5rem] flex items-center justify-center px-2">
              <span className="break-all">{phoneNumber || 'הקלד מספר'}</span>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                disabled={!phoneNumber}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base min-h-[44px]"
              >
                מחק
              </button>
              <button
                onClick={handleClear}
                disabled={!phoneNumber}
                className="px-4 py-3 bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-300 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base min-h-[44px]"
              >
                נקה
              </button>
            </div>
          </div>
        </div>

        {/* Number Pad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-lg">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {numberPad.flat().map((number) => (
              <button
                key={number}
                onClick={() => handleNumberInput(number)}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold text-gray-800 dark:text-white hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md active:scale-95 min-h-[48px] md:min-h-[60px]"
              >
                {number}
              </button>
            ))}
          </div>
        </div>

        {/* Call Button */}
        <div className="text-center mb-4 md:mb-6">
          <button
            onClick={handleCall}
            disabled={!phoneNumber || isCalling}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 active:scale-95 ${
              isCalling
                ? 'bg-red-500 animate-pulse'
                : phoneNumber
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isCalling ? (
              <PhoneOff className="h-6 w-6 md:h-8 md:w-8" />
            ) : (
              <PhoneCall className="h-6 w-6 md:h-8 md:w-8" />
            )}
          </button>
        </div>

        {/* History Toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mx-auto min-h-[44px] text-sm md:text-base"
          >
            <History className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-medium">היסטוריית שיחות</span>
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {callHistory.length}
            </span>
          </button>
        </div>

        {/* Call History */}
        {showHistory && (
          <div className="mt-4 md:mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Search */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="חיפוש בהיסטוריה..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>
              </div>

              {/* History List */}
              <div className="max-h-80 overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <div className="p-6 md:p-8 text-center text-gray-500 dark:text-gray-400 text-sm md:text-base">
                    {searchTerm ? 'לא נמצאו תוצאות' : 'אין היסטוריית שיחות'}
                  </div>
                ) : (
                  filteredHistory.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          call.type === 'incoming' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                            : call.type === 'outgoing'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                        }`}>
                          <Phone className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-800 dark:text-white text-sm md:text-base truncate">
                            {call.contactName || call.phoneNumber}
                          </div>
                          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(call.timestamp)}</span>
                            {call.duration > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(call.duration)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setPhoneNumber(call.phoneNumber)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                          title="הקלד מספר"
                        >
                          <Phone className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Format phone number for dialer (remove non-digits)
                            const formattedPhone = call.phoneNumber.replace(/\D/g, '');
                            const phoneUrl = `tel:${formattedPhone}`;
                            
                            // Create clickable link for all devices (mobile and desktop)
                            const link = document.createElement('a');
                            link.href = phoneUrl;
                            link.setAttribute('class', 'phone-link');
                            link.click();
                          }}
                          className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                          title="חייג עכשיו"
                        >
                          <PhoneCall className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(call.phoneNumber)}
                          className={`p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
                            isFavorite(call.phoneNumber)
                              ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900'
                              : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          title={isFavorite(call.phoneNumber) ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                        >
                          {isFavorite(call.phoneNumber) ? (
                            <Star className="h-3 w-3 md:h-4 md:w-4 fill-current" />
                          ) : (
                            <StarOff className="h-3 w-3 md:h-4 md:w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteCallFromHistory(call.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                          title="מחק מההיסטוריה"
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Dialer;
