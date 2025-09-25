import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Clock, Plus, X, Users, 
  CheckSquare, AlertCircle, ChevronLeft, ChevronRight,
  Bell, Save, ChevronDown, Edit2, Trash2
} from 'lucide-react';
import { 
  format, addDays, subDays, startOfWeek, isToday, isSameDay,
  startOfMonth, endOfMonth, getDaysInMonth, getDay
} from 'date-fns';
import { he } from 'date-fns/locale';
import { useLeadStore } from '../store/leadStore';
import useCustomerStore from '../store/customerStore';
// Reminder operations are handled by calendarStore.ts
import { useUnifiedEventStore } from '../store/unifiedEventStore';
import { Lead } from '../types';
import toast from 'react-hot-toast';

// Israel timezone functions (inline)
function isIsraelDST(date: Date): boolean {
  const month = date.getMonth(); // 0=Jan, 8=Sep, 9=Oct
  return month >= 3 && month <= 8; // April-September = summer (UTC+3)
}

function utcToIsraelTime(utcDate: Date): Date {
  const offset = isIsraelDST(utcDate) ? 3 : 2;
  return new Date(utcDate.getTime() + (offset * 60 * 60 * 1000));
}

function logTimezoneInfo(label: string, utcTime: Date): void {
  const offset = isIsraelDST(utcTime) ? 3 : 2;
  const israelTime = new Date(utcTime.getTime() + (offset * 60 * 60 * 1000));
  const isDST = isIsraelDST(utcTime);
  
  console.log(`🕐 ${label}:`, {
    UTC: utcTime.toISOString(),
    Israel: israelTime.toLocaleString('he-IL'),
    Offset: `UTC+${offset}`,
    Season: isDST ? 'Summer (IDT)' : 'Winter (IST)'
  });
}

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lead' | 'task' | 'meeting' | 'reminder';
  description?: string;
  leadId?: string;
  taskId?: string;
  customerId?: string;
  startTime?: string; // Add startTime for timezone handling
}

interface CalendarViewProps {
  events: Event[];
  selectedDate: Date;
  onEventClick: (event: Event) => void;
  onDateClick: (date: Date) => void;
}

type CalendarView = 'month' | 'week' | 'day';

// Helper function to format time correctly
const formatEventTime = (event: Event) => {
  try {
    // Handle timezone-aware time formatting
    if (event.startTime) {
      // For events with startTime (from database), they should already be in Israel time after conversion
      return format(new Date(event.startTime), 'HH:mm');
    } else if (event.start) {
      // For other events, use the start time directly (already in Israel time)
      return format(event.start, 'HH:mm');
    }
    return '00:00';
  } catch (error) {
    console.error('Error formatting event time:', error);
    return '00:00';
  }
};

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEventDetailsDialogOpen, setIsEventDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const { leads, fetchLeads } = useLeadStore();
  const { customers, fetchCustomers } = useCustomerStore();
  // Reminder operations are handled by calendarStore.ts
  const { events: calendarEvents, fetchEvents, addEvent, updateEvent, deleteEvent } = useUnifiedEventStore();


  // Load data on component mount
  useEffect(() => {
    fetchLeads();
    fetchCustomers();
    fetchEvents();
  }, [fetchLeads, fetchCustomers, fetchEvents]);

  useEffect(() => {
    // Convert calendar events from database to display format
    const dbCalendarEvents = calendarEvents.map(event => {
      // Parse UTC times and convert to Israel time using smart function
      const startTimeUTC = new Date(event.startTime);
      const endTimeUTC = new Date(event.endTime);
      
      // Convert to Israel time using smart timezone function
      const startTimeIsrael = utcToIsraelTime(startTimeUTC);
      const endTimeIsrael = utcToIsraelTime(endTimeUTC);
      
      logTimezoneInfo(`Calendar Event ${event.id}`, startTimeUTC);
      
      return {
        id: `calendar-${event.id}`,
        title: event.title,
        start: startTimeIsrael, // Use Israel time for display
        end: endTimeIsrael,     // Use Israel time for display
        type: event.eventType as 'lead' | 'task' | 'meeting' | 'reminder',
        description: event.description,
        leadId: event.leadId,
        taskId: event.taskId,
        customerId: event.customerId,
        startTime: event.startTime // Keep original UTC for reference
      };
    });

    // Convert leads and tasks to events
    const leadEvents = leads.filter(lead => lead.callbackDate).map(lead => {
      // Create Israel time for lead callbacks
      const leadDateTimeStr = `${lead.callbackDate}T${lead.callbackTime || '09:00'}`;
      const leadDateTime = new Date(leadDateTimeStr);
      const endDateTime = new Date(leadDateTimeStr);
      endDateTime.setHours(endDateTime.getHours() + 1); // Add 1 hour for end time
      
      console.log(`Lead ${lead.id} callback: ${leadDateTimeStr} -> Israel time: ${leadDateTime.toLocaleString('he-IL')}`);
      
      return {
        id: `lead-${lead.id}`,
        title: `שיחת חזרה: ${lead.name}`,
        start: leadDateTime,
        end: endDateTime,
        type: 'lead' as const,
        description: lead.notes,
        leadId: lead.id
      };
    });

    const taskEvents = leads.flatMap(lead => 
      (lead.tasks || []).map(task => ({
        id: `task-${task.id}`,
        title: task.title,
        start: new Date(task.dueDate),
        end: new Date(task.dueDate),
        type: 'task' as const,
        description: task.description,
        taskId: task.id,
        leadId: lead.id
      }))
    );

    setEvents([...dbCalendarEvents, ...leadEvents, ...taskEvents]);
  }, [calendarEvents, leads]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailsDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handlePrevious = () => {
    setSelectedDate(
      view === 'month' ? subDays(selectedDate, 30) : 
      view === 'week' ? subDays(selectedDate, 7) : 
      subDays(selectedDate, 1)
    );
  };

  const handleNext = () => {
    setSelectedDate(
      view === 'month' ? addDays(selectedDate, 30) : 
      view === 'week' ? addDays(selectedDate, 7) : 
      addDays(selectedDate, 1)
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            יומן
          </h1>
          
          <button
            onClick={() => {
              setSelectedEvent(null);
              setIsEventDialogOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto justify-center min-h-[44px]"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">הוסף אירוע</span>
          </button>
        </div>

        {/* View Controls - Mobile Layout */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 w-full sm:w-auto">
            <button
              onClick={() => setView('month')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
                view === 'month'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              חודש
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
                view === 'week'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              שבוע
            </button>
            <button
              onClick={() => setView('day')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
                view === 'day'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              יום
            </button>
          </div>

          {/* Navigation Controls - Mobile Friendly */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={handlePrevious}
              className="p-2 md:p-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <h2 className="text-sm md:text-lg font-medium text-gray-900 dark:text-white text-center px-2">
              {format(selectedDate, 
                view === 'month' ? 'MMMM yyyy' : 
                view === 'week' ? "'שבוע של' d בMMMM" : 
                "'יום' EEEE, d בMMMM yyyy", 
                { locale: he }
              )}
            </h2>
            <button
              onClick={handleNext}
              className="p-2 md:p-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <MonthView
          events={events}
          selectedDate={selectedDate}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      ) : view === 'week' ? (
        <WeekView
          events={events}
          selectedDate={selectedDate}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      ) : (
        <DayView
          events={events}
          selectedDate={selectedDate}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      )}

      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        date={selectedDate}
        leads={leads}
        calendarEvents={calendarEvents}
        onEventCreated={async (eventData) => {
          try {
            if (selectedEvent && selectedEvent.id.startsWith('calendar-')) {
              // Editing existing event
              const eventId = selectedEvent.id.replace('calendar-', '');
              
              
              // Create simple ISO strings without timezone conversion
              const startTimeISO = `${eventData.date}T${eventData.startTime}:00.000Z`;
              const endTimeISO = `${eventData.date}T${eventData.startTime}:00.000Z`; // Use same time as start

              await updateEvent(eventId, {
                title: eventData.title,
                description: eventData.description || '',
                eventType: eventData.type,
                startTime: startTimeISO,
                endTime: endTimeISO,
                leadId: eventData.leadId || undefined,
                customerId: undefined, // Don't set customerId for now
                advanceNotice: eventData.advanceNotice || 1440 // Default to 24 hours
              });

              // Update reminder if it's a reminder or lead type event
              // Reminder creation is handled by calendarStore.ts
            } else {
              // Creating new event
              // Create local time strings with timezone offset to ensure correct time
              // Create simple ISO strings without timezone conversion
              const startTime = `${eventData.date}T${eventData.startTime}:00.000Z`;
              const endTime = `${eventData.date}T${eventData.startTime}:00.000Z`; // Use same time as start

              await addEvent({
                title: eventData.title,
                description: eventData.description || '',
                eventType: eventData.type,
                startTime: startTime,
                endTime: endTime,
                leadId: eventData.leadId || undefined,
                customerId: undefined, // Don't set customerId for now
                advanceNotice: eventData.advanceNotice || 1440 // Default to 24 hours
              });

              // Reminder creation is handled by calendarStore.ts
            }
            
            // Refresh the events list
            await fetchEvents();
            
            // Show success message
            if (selectedEvent && selectedEvent.id.startsWith('calendar-')) {
              toast.success('האירוע עודכן בהצלחה');
            } else {
              toast.success('האירוע נוצר בהצלחה');
            }
          } catch (error) {
            console.error('Error creating/updating event:', error);
            toast.error('שגיאה ביצירת/עדכון האירוע');
          }
        }}
      />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        isOpen={isEventDetailsDialogOpen}
        onClose={() => {
          setIsEventDetailsDialogOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        leads={leads}
        customers={customers}
        onEdit={(event) => {
          setIsEventDetailsDialogOpen(false);
          setSelectedEvent(event);
          setIsEventDialogOpen(true);
        }}
        onDelete={async (eventId) => {
          if (eventId.startsWith('calendar-')) {
            const id = eventId.replace('calendar-', '');
            await deleteEvent(id);
            await fetchEvents();
          }
        }}
      />
    </div>
  );
};

const MonthView: React.FC<CalendarViewProps> = ({ events, selectedDate, onEventClick, onDateClick }) => {
  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);
  const daysInMonth = getDaysInMonth(selectedDate);
  const firstDayOfWeek = getDay(startDate);
  
  // Create array of all days to display (including previous/next month days)
  const calendarDays = [];
  
  // Add days from previous month
  for (let i = firstDayOfWeek; i > 0; i--) {
    calendarDays.push(subDays(startDate, i));
  }
  
  // Add days from current month
  for (let i = 0; i < daysInMonth; i++) {
    calendarDays.push(addDays(startDate, i));
  }
  
  // Add days from next month to complete the grid
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push(addDays(endDate, i));
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day) => (
          <div key={day} className="p-2 md:p-4 text-center font-medium text-gray-600 dark:text-gray-400 text-xs md:text-sm">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 2)}</span>
          </div>
        ))}
      </div>
      
      {/* Calendar grid - Mobile optimized */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayEvents = events.filter(event => isSameDay(event.start, day));
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
          
          return (
            <div
              key={index}
              className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isToday(day) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
              } ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800 text-gray-400' : ''}`}
              onClick={() => onDateClick(day)}
            >
              <div className={`text-xs md:text-sm font-medium mb-1 md:mb-2 ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded cursor-pointer truncate ${
                      event.type === 'lead'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : event.type === 'task'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : event.type === 'reminder'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    <span className="hidden md:inline">{event.title}</span>
                    <span className="md:hidden">{event.title.slice(0, 8)}...</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DayView: React.FC<CalendarViewProps> = ({ events, selectedDate, onEventClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = events.filter(event => 
    isSameDay(event.start, selectedDate)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="grid grid-cols-[60px_1fr] md:grid-cols-[100px_1fr] divide-x divide-gray-200 dark:divide-gray-700">
        <div className="col-start-1 col-end-2 divide-y divide-gray-200 dark:divide-gray-700">
          {hours.map(hour => (
            <div key={hour} className="h-16 md:h-20 -mt-2.5">
              <div className="sticky right-0 text-right pr-1 md:pr-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {String(hour).padStart(2, '0')}:00
              </div>
            </div>
          ))}
        </div>

        <div className="col-start-2 col-end-3 relative">
          {hours.map(hour => (
            <div key={hour} className="h-16 md:h-20 border-b border-gray-200 dark:border-gray-700" />
          ))}

          {dayEvents.map(event => {
            const startHour = event.start.getHours() + (event.start.getMinutes() / 60);
            const endHour = event.end.getHours() + (event.end.getMinutes() / 60);
            const duration = endHour - startHour;
            const heightPerHour = window.innerWidth < 768 ? 64 : 80; // 16*4 for mobile, 20*4 for desktop

            return (
              <div
                key={event.id}
                className={`absolute left-1 right-1 md:left-2 md:right-2 rounded-lg p-2 cursor-pointer ${
                  event.type === 'lead'
                    ? 'bg-blue-100 dark:bg-blue-900/20'
                    : event.type === 'task'
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : event.type === 'reminder'
                    ? 'bg-orange-100 dark:bg-orange-900/20'
                    : 'bg-purple-100 dark:bg-purple-900/20'
                }`}
                style={{
                  top: `${startHour * heightPerHour}px`,
                  height: `${Math.max(duration * heightPerHour, heightPerHour * 0.5)}px`, // Minimum height
                }}
                onClick={() => onEventClick(event)}
              >
                <div className="flex items-center gap-2">
                  {event.type === 'lead' ? (
                    <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                  ) : event.type === 'task' ? (
                    <CheckSquare className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                  ) : event.type === 'reminder' ? (
                    <Bell className="w-3 h-3 md:w-4 md:h-4 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-purple-600 dark:text-purple-400" />
                  )}
                  <span className="text-xs md:text-sm font-medium truncate">
                    {event.title}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatEventTime(event)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const WeekView: React.FC<CalendarViewProps> = ({ events, selectedDate, onEventClick, onDateClick }) => {
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {days.map((day, index) => (
          <div
            key={index}
            className={`p-3 md:p-4 ${
              isToday(day) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
            }`}
            onClick={() => onDateClick(day)}
          >
            <div className="flex items-center justify-between md:justify-center md:flex-col md:text-center mb-4">
              <div className="md:mb-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  <span className="hidden md:inline">{format(day, 'EEEE', { locale: he })}</span>
                  <span className="md:hidden">{format(day, 'EEE', { locale: he })}</span>
                </div>
                <div className="text-lg md:text-xl font-semibold text-gray-600 dark:text-gray-400">
                  {format(day, 'd')}
                </div>
              </div>
              
              {/* Mobile: Show event count */}
              <div className="md:hidden">
                {events.filter(event => isSameDay(event.start, day)).length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                    {events.filter(event => isSameDay(event.start, day)).length}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {events
                .filter(event => isSameDay(event.start, day))
                .slice(0, 3)
                .map(event => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg p-2 cursor-pointer ${
                      event.type === 'lead'
                        ? 'bg-blue-100 dark:bg-blue-900/20'
                        : event.type === 'task'
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : event.type === 'reminder'
                        ? 'bg-orange-100 dark:bg-orange-900/20'
                        : 'bg-purple-100 dark:bg-purple-900/20'
                    }`}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-center gap-2">
                      {event.type === 'lead' ? (
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : event.type === 'task' ? (
                        <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : event.type === 'reminder' ? (
                        <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      )}
                      <span className="text-xs md:text-sm font-medium truncate">
                        {event.title}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {formatEventTime(event)}
                    </div>
                  </motion.div>
                ))}
              
              {/* Show more indicator on mobile */}
              {events.filter(event => isSameDay(event.start, day)).length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{events.filter(event => isSameDay(event.start, day)).length - 3} נוספים
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  date: Date;
  leads: Lead[];
  calendarEvents: any[];
  onEventCreated?: (eventData: any) => void;
}

const EventDialog: React.FC<EventDialogProps> = ({
  isOpen,
  onClose,
  event,
  date,
  leads,
  calendarEvents,
  onEventCreated
}) => {
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(date, 'yyyy-MM-dd'),
    startTime: format(new Date(), 'HH:mm'),
    type: 'reminder',
    leadId: '',
    advanceNotice: 1440 // 24 hours default
  });
  
  const filteredLeads = leads.filter(lead =>
    !leadSearchQuery || 
    lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
    lead.phone.includes(leadSearchQuery)
  );

  useEffect(() => {
    if (event) {
      // Extract time using format function as requested
      const correctTime = format(new Date(event.startTime || event.start), 'HH:mm');
      
      setFormData({
        title: event.title,
        description: event.description || '',
        date: format(event.start, 'yyyy-MM-dd'),
        startTime: correctTime,
        type: event.type,
        leadId: event.leadId || '',
        advanceNotice: 1440 // Default value, could be enhanced to store this in database
      });
      setSelectedLead(leads.find(l => l.id === event.leadId) || null);
    } else {
      setFormData({
        title: '',
        description: '',
        date: format(date, 'yyyy-MM-dd'),
        startTime: format(new Date(), 'HH:mm'),
        type: 'reminder',
        leadId: '',
        advanceNotice: 1440
      });
      setSelectedLead(null);
    }
  }, [event, date, calendarEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      start: new Date(`${formData.date}T${formData.startTime}`),
      end: new Date(`${formData.date}T${formData.startTime}`), // Use same time as start
      leadId: selectedLead?.id,
      leadName: selectedLead?.name,
      advanceNotice: formData.advanceNotice
    };
    
    
    
    if (onEventCreated) {
      onEventCreated(eventData);
    }
    
    onClose();
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
              className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-4 md:p-6 shadow-xl mx-4"
            >
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{event ? 'עריכת אירוע' : 'אירוע חדש'}</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    כותרת
                  </label>                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-3 text-base"
                      required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תאריך
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-3 text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      סוג אירוע
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-3 text-base"
                    >
                      <option value="reminder">תזכורת</option>
                      <option value="meeting">פגישה</option>
                      <option value="lead">שיחת חזרה</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שעת התחלה
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-3 text-base"
                      required
                    />
                  </div>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    קשור לליד
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLeadSelector(!showLeadSelector)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedLead ? `ליד נבחר: ${selectedLead.name}` : 'בחר ליד (אופציונלי)'}
                    </span>
                    <ChevronDown className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showLeadSelector && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"
                      >
                        <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                          <input
                            type="text"
                            placeholder="חיפוש ליד לפי שם, טלפון או אימייל..."
                            value={leadSearchQuery}
                            onChange={(e) => setLeadSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(null);
                              setShowLeadSelector(false);
                            }}
                            className="w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600"
                          >
                            ללא ליד
                          </button>
                          {filteredLeads.map(lead => (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowLeadSelector(false);
                              }}
                              className="w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between border-b border-gray-200 dark:border-gray-600"
                            >
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</div>
                              </div>
                              {selectedLead?.id === lead.id && (
                                <CheckSquare className="w-5 h-5 text-green-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {(formData.type === 'reminder' || formData.type === 'lead') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      התראה מוקדמת
                    </label>
                    <select
                      value={formData.advanceNotice}
                      onChange={(e) => setFormData({ ...formData, advanceNotice: parseInt(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value={0}>ללא תזכורת</option>
                      <option value={15}>15 דקות לפני</option>
                      <option value={30}>30 דקות לפני</option>
                      <option value={60}>שעה לפני</option>
                      <option value={120}>שעתיים לפני</option>
                      <option value={360}>6 שעות לפני</option>
                      <option value={720}>12 שעות לפני</option>
                      <option value={1440}>יום לפני</option>
                      <option value={2880}>יומיים לפני</option>
                      <option value={10080}>שבוע לפני</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תיאור
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
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
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {event ? 'עדכון אירוע' : 'יצירת אירוע'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface EventDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  leads: Lead[];
  customers: any[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  isOpen,
  onClose,
  event,
  leads,
  customers,
  onEdit,
  onDelete
}) => {
  if (!event) return null;

  const relatedLead = leads.find(lead => lead.id === event.leadId);
  const relatedCustomer = customers.find(customer => customer.id === event.customerId);
  const isCalendarEvent = event.id.startsWith('calendar-');

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'lead': return 'שיחת חזרה';
      case 'task': return 'משימה';
      case 'reminder': return 'תזכורת';
      case 'meeting': return 'פגישה';
      default: return type;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'task': return <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'reminder': return <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'meeting': return <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
      onDelete(event.id);
      onClose();
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
                  {getEventTypeIcon(event.type)}
                  פרטי האירוע
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Event Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    כותרת
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    סוג אירוע
                  </label>
                  <div className="flex items-center gap-2">
                    {getEventTypeIcon(event.type)}
                    <span className="text-gray-900 dark:text-white">
                      {getEventTypeText(event.type)}
                    </span>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תאריך
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {format(event.start, 'dd/MM/yyyy', { locale: he })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שעה
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {formatEventTime(event)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Related Lead */}
                {relatedLead && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ליד קשור
                    </label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-900 dark:text-white">
                        {relatedLead.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({relatedLead.phone})
                      </span>
                    </div>
                  </div>
                )}

                {/* Related Customer */}
                {relatedCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      לקוח קשור
                    </label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-gray-900 dark:text-white">
                        {relatedCustomer.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({relatedCustomer.phone})
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תיאור
                    </label>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Advance Notice for reminder and lead events */}
                {(event.type === 'reminder' || event.type === 'lead') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      התראה מוקדמת
                    </label>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-900 dark:text-white">
                        {event.type === 'reminder' ? 'תזכורת' : 'שיחת חזרה'} - ניתן להגדיר התראה מוקדמת
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isCalendarEvent && (
                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      מחק אירוע
                    </button>
                    <button
                      onClick={() => onEdit(event)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      ערוך אירוע
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Calendar;