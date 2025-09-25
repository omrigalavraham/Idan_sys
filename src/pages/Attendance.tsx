import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Download, Calendar } from 'lucide-react';
import { useAttendanceStore } from '../store/attendanceStore';
import useAuthStore from '../store/authStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

const Attendance = () => {
  const { user } = useAuthStore();
  const { records, fetchUserRecords, exportToExcel, fetchCurrentSession } = useAttendanceStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const startDate = startOfMonth(new Date(selectedMonth));
  const endDate = endOfMonth(new Date(selectedMonth));

  // Load user records on component mount and when user/month changes
  React.useEffect(() => {
    if (user?.id) {
      fetchUserRecords(user.id);
      fetchCurrentSession();
    }
  }, [user?.id, fetchUserRecords, fetchCurrentSession]);

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

  const formatDuration = (clockIn: string, clockOut: string | null | undefined) => {
    if (!clockOut) return '--:--';
    
    const startTime = new Date(clockIn);
    const endTime = new Date(clockOut);
    
    // Calculate total minutes difference
    const totalMinutes = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
          דוח נוכחות
        </h1>
        <button
          onClick={() => exportToExcel()}
          className="flex items-center gap-2 px-4 py-2 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">ייצוא לאקסל</span>
          <span className="sm:hidden">ייצוא</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm md:text-base"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">סה"כ שעות בחודש</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{Number(totalHours).toFixed(2)}</p>
          </div>
        </div>

        {/* Attendance Records - Mobile Optimized */}
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              {/* Date Header - Mobile Layout */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">
                      {format(new Date(record.date), 'EEEE', { locale: he })}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(record.date), 'd בMMMM yyyy', { locale: he })}
                    </p>
                  </div>
                </div>
                {/* Duration - Prominent Display */}
                <div className="text-right">
                  <div className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatDuration(record.clockIn, record.clockOut)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">שעות עבודה</div>
                </div>
              </div>

              {/* Clock In/Out Information - Mobile Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs md:text-sm font-medium text-green-800 dark:text-green-200">כניסה</span>
                    </div>
                    <div className="text-sm md:text-lg font-bold text-green-900 dark:text-green-100">
                      {format(new Date(record.clockIn), 'HH:mm')}
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs md:text-sm font-medium text-red-800 dark:text-red-200">יציאה</span>
                    </div>
                    <div className="text-sm md:text-lg font-bold text-red-900 dark:text-red-100">
                      {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes - If Available */}
              {record.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mt-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-xs md:text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">הערות</div>
                  <div className="text-xs md:text-sm text-yellow-900 dark:text-yellow-100">{record.notes}</div>
                </div>
              )}
            </motion.div>
          ))}
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                לא נמצאו רשומות נוכחות לחודש זה
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;