import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Square, Download, X, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useAttendanceStore, AttendanceRecord } from '../../store/attendanceStore';
import useAuthStore from '../../store/authStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

// Helper function to create a date with local timezone
const createLocalDate = (dateString: string, timeString?: string): Date => {
  if (timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date(dateString);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }
  return new Date(dateString);
};

// Helper function to create a local date string for server
const createLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Helper function to ensure the main date is always the clock-in date
const ensureClockInDate = (editingRecord: AttendanceRecord): string => {
  return format(new Date(editingRecord.clockIn), 'yyyy-MM-dd');
};

// Helper function to update editing record while preserving the main date
const updateEditingRecord = (editingRecord: AttendanceRecord, updates: Partial<AttendanceRecord>): AttendanceRecord => {
  const updatedRecord = { ...editingRecord, ...updates };
  
  // Always ensure the main date field matches the clock-in date
  updatedRecord.date = ensureClockInDate(updatedRecord);
  
  return updatedRecord;
};

const AttendanceButton: React.FC = () => {
  const { user } = useAuthStore();
  const { currentSession, clockIn, clockOut, records, fetchUserRecords, exportToExcel, updateRecord, deleteRecord, fetchCurrentSession, isLoading } = useAttendanceStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [currentDuration, setCurrentDuration] = useState<string>('00:00');

  const handleToggleAttendance = async () => {
    if (!user) return;

    try {
      if (currentSession) {
        await clockOut();
      } else {
        await clockIn();
      }
    } catch (error) {
      // Error is already handled in the store
    }
  };

  // Load user records and current session when component mounts
  React.useEffect(() => {
    if (user?.id) {
      fetchUserRecords(user.id);
      fetchCurrentSession();
    }
  }, [user?.id, fetchUserRecords, fetchCurrentSession]);

  // Update current duration every second when there's an active session
  React.useEffect(() => {
    if (!currentSession) {
      setCurrentDuration('00:00');
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const startTime = new Date(currentSession.clockIn);
      const diffMs = now.getTime() - startTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setCurrentDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    updateDuration(); // Update immediately
    const interval = setInterval(updateDuration, 1000); // Update every second

    return () => clearInterval(interval);
  }, [currentSession]);

  const startDate = startOfMonth(new Date(selectedMonth));
  const endDate = endOfMonth(new Date(selectedMonth));

  const filteredRecords = records.filter(
    record => 
      record.userId === user?.id &&
      new Date(record.date) >= startDate &&
      new Date(record.date) <= endDate
  );

  const totalHours = filteredRecords.reduce((total, record) => {
    if (record.clockIn && record.clockOut) {
      // Calculate hours directly from clock in/out times for accuracy
      const startTime = new Date(record.clockIn);
      const endTime = new Date(record.clockOut);
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      return total + hours;
    } else if (record.totalHours && typeof record.totalHours === 'number') {
      // Fallback to stored totalHours if clock out is missing
      return total + record.totalHours;
    }
    return total;
  }, 0);

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return '--:--';
    
    const startTime = new Date(clockIn);
    const endTime = new Date(clockOut);
    
    // Calculate total minutes difference
    const totalMinutes = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) {
      try {
        await deleteRecord(id);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      // Calculate total hours if both clock in and out are available
      let totalHours = editingRecord.totalHours;
      if (editingRecord.clockIn && editingRecord.clockOut) {
        const startTime = new Date(editingRecord.clockIn);
        const endTime = new Date(editingRecord.clockOut);
        const diffMs = endTime.getTime() - startTime.getTime();
        totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
      }

      // Always use the clock-in date as the main date, never change it based on clock-out
      const clockInDate = ensureClockInDate(editingRecord);

      // Prepare updates with calculated total hours and correct date
      const updates: any = {
        date: clockInDate, // Always use clock-in date as the main date
        clockIn: createLocalDateString(new Date(editingRecord.clockIn)),
        clockOut: editingRecord.clockOut ? createLocalDateString(new Date(editingRecord.clockOut)) : null,
        totalHours: totalHours,
        notes: editingRecord.notes
      };


      await updateRecord(editingRecord.id, updates);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error saving edit:', error); // Debug log
      // Error is already handled in the store
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowModal(true)}
        className={`w-10 h-10 rounded-xl shadow-md flex items-center justify-center haptic-light ${
          currentSession 
            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
            : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
        }`}
      >
        <Clock className="h-4 w-4" />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
                onClick={() => {
                  setShowModal(false);
                  setEditingRecord(null);
                }}
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="attendance-modal relative bg-white dark:bg-gray-800 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                    מערכת נוכחות
                  </h2>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => exportToExcel()}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg font-bold haptic-light"
                    >
                      <Download className="w-5 h-5" />
                      ייצוא לאקסל
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setShowModal(false);
                        setEditingRecord(null);
                      }}
                      className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center haptic-medium"
                    >
                      <X className="w-7 h-7" />
                    </motion.button>
                  </div>
                </div>

                {/* Total Hours Display - Moved below header */}
                <div className="mb-6 md:mb-8">
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-blue-200 dark:border-blue-800 shadow-lg"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-200">
                          סה"כ שעות עבודה בחודש
                        </h3>
                      </div>
                      <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                        {Number(totalHours).toFixed(2)}
                      </div>
                      <p className="text-sm md:text-base text-blue-600 dark:text-blue-300 mt-2 font-medium">
                        שעות
                      </p>
                    </div>
                  </motion.div>
                </div>

                <div className="modal-body">
                  <div className="flex flex-col lg:flex-row items-center justify-between mb-6 md:mb-8 gap-4 md:gap-6">
                    <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6 w-full mr-4">
                    <div className="relative w-full lg:w-auto">
                      <motion.button
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                        onClick={handleToggleAttendance}
                        disabled={isLoading}
                        className={`w-full pl-4 md:pl-5 pr-12 md:pr-14 py-3 md:py-4 border-2 rounded-xl md:rounded-2xl font-medium text-sm md:text-lg haptic-heavy ${isLoading ? 'opacity-75 cursor-not-allowed' : ''} ${
                          currentSession
                            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                            : 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin h-6 w-6 md:h-7 md:w-7 border-2 border-current border-t-transparent rounded-full mx-auto" />
                            <span className="text-sm md:text-base mr-2">מעבד...</span>
                          </>
                        ) : currentSession ? (
                          <>
                            <Square className="h-6 w-6 md:h-7 md:w-7 inline-block ml-2" />
                            <span className="text-sm md:text-base">סיום משמרת ({currentDuration})</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-6 w-6 md:h-7 md:w-7 inline-block ml-2" />
                            <span className="text-sm md:text-base">התחל משמרת</span>
                          </>
                        )}
                      </motion.button>
                    </div>

                    {currentSession && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-lg border border-blue-200 dark:border-blue-800 w-full lg:w-auto"
                      >
                        <p className="text-sm md:text-base font-bold text-blue-800 dark:text-blue-200 text-center lg:text-right">
                          התחלת משמרת: {format(new Date(currentSession.clockIn), 'EEEE, d בMMMM, HH:mm', { locale: he })}
                        </p>
                        <p className="text-sm md:text-base font-bold text-blue-800 dark:text-blue-200 mt-1 md:mt-2 text-center lg:text-right">
                          משך המשמרת: {currentDuration}
                        </p>
                      </motion.div>
                    )}

                    <div className="relative w-full lg:w-auto">
                      <Calendar className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 md:w-6 md:h-6" />
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full pl-4 md:pl-5 pr-12 md:pr-14 py-3 md:py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl md:rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm md:text-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[120px]">תאריך כניסה</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">שעת כניסה</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[120px]">תאריך יציאה</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">שעת יציאה</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">משך משמרת</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[150px]">הערות</th>
                        <th className="text-right py-3 px-4 text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[120px]">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          {editingRecord?.id === record.id ? (
                            <td colSpan={7} className="py-6 px-6">
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">עריכת משמרת</h3>
                                <form onSubmit={handleSaveEdit} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">תאריך כניסה</label>
                                      <input
                                        type="date"
                                        value={format(new Date(editingRecord.clockIn), 'yyyy-MM-dd')}
                                        onChange={(e) => {
                                          const selectedDate = e.target.value;
                                          const currentTime = new Date(editingRecord.clockIn);
                                          const timeString = format(currentTime, 'HH:mm');
                                          
                                          // Create new date with selected date and current time
                                          const newDate = createLocalDate(selectedDate, timeString);
                                          
                                          // Calculate total hours automatically
                                          let totalHours = editingRecord.totalHours;
                                          if (editingRecord.clockOut) {
                                            const startTime = newDate;
                                            const endTime = new Date(editingRecord.clockOut);
                                            const diffMs = endTime.getTime() - startTime.getTime();
                                            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                                          }
                                          
                                          setEditingRecord(updateEditingRecord(editingRecord, {
                                            clockIn: newDate.toISOString(),
                                            totalHours: totalHours,
                                          }));
                                        }}
                                        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">שעת כניסה</label>
                                <input
                                  type="time"
                                  value={format(new Date(editingRecord.clockIn), 'HH:mm')}
                                  onChange={(e) => {
                                          const timeString = e.target.value;
                                          const currentDate = new Date(editingRecord.clockIn);
                                          const dateString = format(currentDate, 'yyyy-MM-dd');
                                          
                                          // Create new date with the same date but new time
                                          const newDate = createLocalDate(dateString, timeString);
                                          
                                          // Calculate total hours automatically
                                          let totalHours = editingRecord.totalHours;
                                          if (editingRecord.clockOut) {
                                            const startTime = newDate;
                                            const endTime = new Date(editingRecord.clockOut);
                                            const diffMs = endTime.getTime() - startTime.getTime();
                                            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                                          }
                                          
                                          setEditingRecord(updateEditingRecord(editingRecord, {
                                            clockIn: newDate.toISOString(),
                                            totalHours: totalHours,
                                          }));
                                        }}
                                        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">תאריך יציאה</label>
                                      <input
                                        type="date"
                                        value={editingRecord.clockOut ? format(new Date(editingRecord.clockOut), 'yyyy-MM-dd') : ''}
                                        onChange={(e) => {
                                          if (!e.target.value) return;
                                          const selectedDate = e.target.value;
                                          const currentClockOut = editingRecord.clockOut ? new Date(editingRecord.clockOut) : new Date();
                                          const timeString = format(currentClockOut, 'HH:mm');
                                          
                                          // Create new date with selected date but keep the current time
                                          const newDate = createLocalDate(selectedDate, timeString);
                                          
                                          // Calculate total hours automatically
                                          let totalHours = editingRecord.totalHours;
                                          if (editingRecord.clockIn) {
                                            const startTime = new Date(editingRecord.clockIn);
                                            const endTime = newDate;
                                            const diffMs = endTime.getTime() - startTime.getTime();
                                            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                                          }
                                          
                                          setEditingRecord(updateEditingRecord(editingRecord, {
                                            clockOut: newDate.toISOString(),
                                            totalHours: totalHours,
                                          }));
                                  }}
                                        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm"
                                />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">שעת יציאה</label>
                                <input
                                  type="time"
                                  value={editingRecord.clockOut ? format(new Date(editingRecord.clockOut), 'HH:mm') : ''}
                                  onChange={(e) => {
                                          if (!e.target.value) return;
                                          const timeString = e.target.value;
                                          const currentClockOut = editingRecord.clockOut ? new Date(editingRecord.clockOut) : new Date(editingRecord.clockIn);
                                          const dateString = format(currentClockOut, 'yyyy-MM-dd');
                                          
                                          // Create new date with the same date but new time
                                          const newDate = createLocalDate(dateString, timeString);
                                          
                                          // Calculate total hours automatically
                                          let totalHours = editingRecord.totalHours;
                                          if (editingRecord.clockIn) {
                                            const startTime = new Date(editingRecord.clockIn);
                                            const endTime = newDate;
                                            const diffMs = endTime.getTime() - startTime.getTime();
                                            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                                          }
                                          
                                          setEditingRecord(updateEditingRecord(editingRecord, {
                                            clockOut: newDate.toISOString(),
                                            totalHours: totalHours,
                                          }));
                                  }}
                                        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">סה"כ שעות</label>
                                      <div className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white font-medium text-sm">
                                        {editingRecord.totalHours ? `${editingRecord.totalHours.toFixed(2)} שעות` : 'לא חושב'}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">הערות</label>
                                      <textarea
                                  value={editingRecord.notes || ''}
                                        onChange={(e) => setEditingRecord(updateEditingRecord(editingRecord, {
                                    notes: e.target.value,
                                        }))}
                                        placeholder="הערות על המשמרת..."
                                        rows={3}
                                        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm resize-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-3 justify-end">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => setEditingRecord(null)}
                                      className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 font-bold text-sm shadow-lg haptic-medium"
                                >
                                  ביטול
                                </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      type="submit"
                                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 font-bold text-sm shadow-lg haptic-light"
                                    >
                                      שמור שינויים
                                    </motion.button>
                                  </div>
                              </form>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="py-3 px-4 font-bold text-sm md:text-lg text-gray-900 dark:text-white">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl md:rounded-2xl p-2 md:p-4">
                                  <div className="hidden md:block">
                                  {format(new Date(record.date), 'EEEE, d בMMMM', { locale: he })}
                                  </div>
                                  <div className="md:hidden">
                                    {format(new Date(record.date), 'd/M', { locale: he })}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-sm md:text-lg text-green-600 dark:text-green-400">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl md:rounded-2xl p-2 md:p-4 text-center">
                                  {format(new Date(record.clockIn), 'HH:mm')}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-sm md:text-lg text-gray-900 dark:text-white">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl md:rounded-2xl p-2 md:p-4">
                                  {record.clockOut ? (
                                    <>
                                      <div className="hidden md:block">
                                        {format(new Date(record.clockOut), 'EEEE, d בMMMM', { locale: he })}
                                      </div>
                                      <div className="md:hidden">
                                        {format(new Date(record.clockOut), 'd/M', { locale: he })}
                                      </div>
                                    </>
                                  ) : '--:--'}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-sm md:text-lg text-red-600 dark:text-red-400">
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl md:rounded-2xl p-2 md:p-4 text-center">
                                  {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-sm md:text-lg text-blue-600 dark:text-blue-400">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl md:rounded-2xl p-2 md:p-4 text-center">
                                  {formatDuration(record.clockIn, record.clockOut || null)}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm md:text-lg font-medium text-gray-600 dark:text-gray-400">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl md:rounded-2xl p-2 md:p-4">
                                  <div className="truncate max-w-[120px] md:max-w-none">
                                  {record.notes || '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleEdit(record)}
                                    className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:text-blue-700 flex items-center justify-center haptic-light"
                                  >
                                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDelete(record.id)}
                                    className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 hover:text-red-700 flex items-center justify-center haptic-medium"
                                  >
                                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                  </motion.button>
                                </div>
                              </td>
                            </>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceButton;