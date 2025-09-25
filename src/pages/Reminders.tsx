import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Bell, Plus, Calendar, Clock, User, Edit2, Trash2, 
  CheckCircle, AlertTriangle, Search, X, Save
} from 'lucide-react';
import { useUnifiedEventStore, UnifiedEvent, UnifiedEventFormData } from '../store/unifiedEventStore';
import { useLeadStore } from '../store/leadStore';
import useCustomerStore from '../store/customerStore';
import { format, isToday, isTomorrow, isPast, isFuture, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { parseSimpleISOString } from '../utils/dateUtils';

// Helper function to format date-time to local ISO string without timezone conversion
const formatToLocalISOString = (date: string, time: string): string => {
  // Simply combine date and time with seconds
  return `${date}T${time}:00`;
};

// Helper function to parse stored date-time string
const parseStoredDateTime = (dateTimeString: string): Date => {
  try {
    // Parse the stored ISO string and create a local date
    const isoMatch = dateTimeString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, year, month, day, hours, minutes, seconds] = isoMatch;
      // Create date in local timezone (not UTC)
      return new Date(
        parseInt(year), 
        parseInt(month) - 1, // months are 0-based
        parseInt(day), 
        parseInt(hours), 
        parseInt(minutes), 
        parseInt(seconds)
      );
    }
    
    // Fallback - but avoid timezone conversion
    const date = new Date(dateTimeString);
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  } catch (error) {
    console.error('Error parsing stored date time:', error);
    return new Date();
  }
};
// Helper functions moved outside component
const getEventStatus = (event: UnifiedEvent) => {
  try {
    const eventDate = parseStoredDateTime(event.startTime);
    
    if (isNaN(eventDate.getTime())) {
      return 'upcoming';
    }
    
    if (!event.isActive) return 'completed';
    if (isPast(eventDate)) return 'overdue';
    if (isToday(eventDate)) return 'today';
    if (isTomorrow(eventDate)) return 'tomorrow';
    return 'upcoming';
  } catch (error) {
    return 'upcoming';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'overdue':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'today':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    case 'tomorrow':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'הושלם';
    case 'overdue': return 'פג תוקף';
    case 'today': return 'היום';
    case 'tomorrow': return 'מחר';
    default: return 'קרוב';
  }
};

// Interface moved outside component
interface EventCardProps {
  event: UnifiedEvent;
  onEdit: (event: UnifiedEvent) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

// EventCard component moved outside main component
const EventCard: React.FC<EventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onComplete
}) => {
  const status = getEventStatus(event);
  const { customers } = useCustomerStore();
  const { leads } = useLeadStore();

  // Helper function to get customer/lead info
  const getAssociatedInfo = () => {
    // Check for customer ID first (if it exists and is not empty)
    if (event.customerId && event.customerId.trim() !== '') {
      const customer = customers.find(c => c.id === event.customerId);
      if (customer) {
        return {
          name: customer.name,
          phone: customer.phone,
          type: 'לקוח'
        };
      }
    }
    
    // Check for lead ID (if it exists and is not empty)
    if (event.leadId && event.leadId.trim() !== '') {
      const lead = leads.find(l => l.id === event.leadId);
      if (lead) {
        return {
          name: lead.name,
          phone: lead.phone,
          type: 'ליד'
        };
      }
    }
    
    // Fallback to customer name if no IDs are set
    if (event.customerName && event.customerName.trim() !== '') {
      return {
        name: event.customerName,
        phone: null,
        type: 'לקוח'
      };
    }
    
    return null;
  };

  const associatedInfo = getAssociatedInfo();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            {event.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {associatedInfo ? `${associatedInfo.type}: ${associatedInfo.name}` : 'לא צוין'}
              </span>
            </div>
            {associatedInfo?.phone && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">📞</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {associatedInfo.phone}
                </span>
              </div>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${
              event.eventType === 'reminder' 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                : event.eventType === 'meeting'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : event.eventType === 'task'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
            }`}>
              {event.eventType === 'reminder' ? 'תזכורת' : 
               event.eventType === 'meeting' ? 'פגישה' : 
               event.eventType === 'task' ? 'משימה' : 'ללא תזכורת'}
            </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      </div>

      {event.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {event.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{(() => {
              try {
                // Use the same logic as leads (which works perfectly)
                // Extract date directly from the ISO string to avoid timezone issues
                const match = event.startTime.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/);
                if (match) {
                  const datePart = match[1]; // YYYY-MM-DD
                  const [year, month, day] = datePart.split('-');
                  return `${day}/${month}/${year}`;
                }
                return 'תאריך לא תקין';
              } catch (error) {
                return 'תאריך לא תקין';
              }
            })()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{(() => {
              try {
                // Use the same logic as leads (which works perfectly)
                // Extract time directly from the ISO string to avoid timezone issues
                const match = event.startTime.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/);
                if (match) {
                  return match[2]; // Return HH:MM part directly
                }
                return 'שעה לא תקינה';
              } catch (error) {
                console.error('Error parsing time:', error);
                return 'שעה לא תקינה';
              }
            })()}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            <span>
              {event.eventType === 'reminder' && event.advanceNotice > 0 ? (
                `התראה: ${event.advanceNotice >= 1440 ? `${Math.floor(event.advanceNotice / 1440)} יום/ים` : 
                event.advanceNotice >= 60 ? `${Math.floor(event.advanceNotice / 60)} שעות` : 
                `${event.advanceNotice} דקות`} לפני`
              ) : (
                'ללא התראה'
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {event.isActive && event.eventType === 'reminder' && (
            <button
              onClick={() => onComplete(event.id)}
              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              title="סמן כהושלם"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(event)}
            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="ערוך אירוע"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="מחק"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Reminders = () => {
  const { 
    events,
    fetchEvents,
    addEvent, 
    updateEvent, 
    deleteEvent 
  } = useUnifiedEventStore();
  
  const { leads, fetchLeads } = useLeadStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const navigate = useNavigate();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [isCalendarEditDialogOpen, setIsCalendarEditDialogOpen] = useState(false);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    leadId: '',
    title: '',
    description: '',
    eventType: 'reminder' as 'reminder' | 'meeting' | 'task' | 'no-reminder',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: format(new Date(), 'HH:mm'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: format(new Date(), 'HH:mm'),
    advanceNotice: 1440 // 24 hours
  });

  // Update form data with current time when opening dialog
  const openCreateDialog = () => {
    const now = new Date();
    setFormData(prev => ({
      ...prev,
      startDate: format(now, 'yyyy-MM-dd'),
      startTime: format(now, 'HH:mm'),
      endDate: format(now, 'yyyy-MM-dd'),
      endTime: format(now, 'HH:mm')
    }));
    setIsDialogOpen(true);
  };

  // Load events on component mount
  React.useEffect(() => {
    fetchEvents();
    fetchLeads();
    fetchCustomers();
  }, [fetchEvents, fetchLeads, fetchCustomers]);

  // Show all events (reminder, meeting, task, no-reminder)
  const allEvents = events.filter(event => ['reminder', 'meeting', 'task', 'no-reminder'].includes(event.eventType));

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.customerName && event.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let eventDate: Date;
    try {
      eventDate = parseStoredDateTime(event.startTime);
      
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date(); // Fallback to current date
      }
    } catch (error) {
      eventDate = new Date(); // Fallback to current date
    }
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && event.isActive && !event.notified && isFuture(eventDate)) ||
      (statusFilter === 'completed' && !event.isActive) ||
      (statusFilter === 'overdue' && event.isActive && isPast(eventDate));
    
    // Date filtering
    const matchesDate = dateFilter === 'all' || (() => {
      const today = new Date();
      const tomorrow = addDays(today, 1);
      const weekFromNow = addDays(today, 7);
      const monthFromNow = addDays(today, 30);
      
      switch (dateFilter) {
        case 'today':
          return isToday(eventDate);
        case 'tomorrow':
          return isSameDay(eventDate, tomorrow);
        case 'week':
          return eventDate >= today && eventDate <= weekFromNow;
        case 'month':
          return eventDate >= today && eventDate <= monthFromNow;
        case 'custom':
          if (!customDateRange.startDate || !customDateRange.endDate) return true;
          const startDate = new Date(customDateRange.startDate);
          const endDate = new Date(customDateRange.endDate);
          return eventDate >= startDate && eventDate <= endDate;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!formData.title || !formData.startDate) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }
  
    // בדיקה שאין גם ליד וגם לקוח
    const hasCustomer =
      (formData.customerId && formData.customerId.trim() !== '') ||
      (formData.customerName && formData.customerName.trim() !== '');
    const hasLead = formData.leadId && formData.leadId.trim() !== '';
  
    if (hasCustomer && hasLead) {
      toast.error('ניתן לבחור רק לקוח או ליד, לא שניהם יחד');
      return;
    }
  
    try {
      // שימוש בפונקציה החדשה לפורמט תאריך ושעה מקומי
      const startTimeFormatted = formatToLocalISOString(formData.startDate, formData.startTime);
      const endTimeFormatted = formatToLocalISOString(
        formData.endDate || formData.startDate, 
        formData.endTime || formData.startTime
      );
  
      // שולחים לשרת בפורמט מקומי פשוט
      const eventData: UnifiedEventFormData = {
        title: formData.title,
        description: formData.description || '',
        eventType: formData.eventType,
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        advanceNotice: formData.advanceNotice || 0,
        isActive: true,
        notified: false,
        customerId: hasCustomer && formData.customerId ? formData.customerId : '',
        customerName: hasCustomer && formData.customerName ? formData.customerName : '',
        leadId: hasLead && formData.leadId ? formData.leadId : ''
      };
  
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        toast.success('האירוע עודכן בהצלחה');
      } else {
        await addEvent(eventData);
        toast.success('האירוע נוצר בהצלחה');
      }
  
      resetForm();
    } catch (error) {
      console.error('Error handling event form submission:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בטיפול באירוע');
    }
  };
  
  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      leadId: '',
      title: '',
      description: '',
      eventType: 'reminder' as 'reminder' | 'meeting' | 'task' | 'no-reminder',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: format(new Date(), 'HH:mm'),
      advanceNotice: 1440
    });
    setEditingEvent(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (event: UnifiedEvent) => {
    setEditingEvent(event);
  
    try {
      const start = parseStoredDateTime(event.startTime);
      const end = parseStoredDateTime(event.endTime);
  
      setFormData({
        customerId: event.customerId?.trim() || '',
        customerName: event.customerName?.trim() || '',
        leadId: event.leadId?.trim() || '',
        title: event.title,
        description: event.description || '',
        eventType: event.eventType,
        startDate: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endDate: format(end, 'yyyy-MM-dd'),
        endTime: format(end, 'HH:mm'),
        advanceNotice: event.advanceNotice
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error parsing event dates:', error);
      toast.error('שגיאה בטעינת האירוע לעריכה');
    }
  };
  

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התזכורת?')) {
      try {
        await deleteEvent(id);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateEvent(id, { isActive: false });
    } catch (error) {
      // Error is already handled in the store
    }
  };


  const groupedEvents = {
    today: filteredEvents.filter(e => getEventStatus(e) === 'today'),
    tomorrow: filteredEvents.filter(e => getEventStatus(e) === 'tomorrow'),
    upcoming: filteredEvents.filter(e => getEventStatus(e) === 'upcoming'),
    overdue: filteredEvents.filter(e => getEventStatus(e) === 'overdue'),
    completed: filteredEvents.filter(e => getEventStatus(e) === 'completed')
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-500" />
          אירועים ותזכורות
        </h1>
        <button
          onClick={openCreateDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          תזכורת חדשה
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש אירועים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל האירועים</option>
            <option value="active">פעילות</option>
            <option value="completed">הושלמו</option>
            <option value="overdue">פג תוקף</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל התאריכים</option>
            <option value="today">היום</option>
            <option value="tomorrow">מחר</option>
            <option value="week">השבוע</option>
            <option value="month">החודש</option>
            <option value="custom">טווח מותאם</option>
          </select>

          {dateFilter === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="תאריך התחלה"
              />
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="תאריך סיום"
              />
            </div>
          )}
        </div>
      </div>

      {/* Reminders by Category */}
      <div className="space-y-6">
        {/* Today's Events */}
        {groupedEvents.today.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              אירועים להיום ({groupedEvents.today.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.today.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow's Events */}
        {groupedEvents.tomorrow.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              אירועים למחר ({groupedEvents.tomorrow.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.tomorrow.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {groupedEvents.upcoming.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              אירועים קרובים ({groupedEvents.upcoming.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.upcoming.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Overdue Events */}
        {groupedEvents.overdue.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              אירועים שפג תוקפם ({groupedEvents.overdue.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.overdue.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Events */}
        {groupedEvents.completed.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              אירועים שהושלמו ({groupedEvents.completed.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.completed.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'לא נמצאו אירועים התואמים את החיפוש' : 'אין אירועים'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Reminder Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingEvent(null);
                }}
              />
              
              <div
                className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingEvent ? 'עריכת תזכורת' : 'תזכורת חדשה'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingEvent(null);
                    }}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שם הלקוח
                    </label>
                    <div className="space-y-2">
                      <select
                        value={formData.customerId}
                        onChange={(e) => {
                          const selectedCustomer = customers.find(c => c.id === e.target.value);
                          setFormData({ 
                            ...formData, 
                            customerId: e.target.value,
                            customerName: selectedCustomer ? selectedCustomer.name : '',
                            leadId: '' // Clear lead when selecting customer
                          });
                        }}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      >
                        <option value="">בחר לקוח קיים או הזן שם חדש למטה</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone && `(${customer.phone})`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          customerName: e.target.value, 
                          customerId: '', // Clear customer ID when typing new name
                          leadId: '' // Clear lead when typing customer name
                        })}
                        placeholder="או הזן שם לקוח חדש (אופציונלי)"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ליד (אופציונלי)
                    </label>
                    <select
                      value={formData.leadId || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        leadId: e.target.value,
                        customerId: '', // Clear customer when selecting lead
                        customerName: '' // Clear customer name when selecting lead
                      })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="">בחר ליד</option>
                      {leads.map((lead: any) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} - {lead.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      סוג אירוע
                    </label>
            <select
              value={formData.eventType}
              onChange={(e) => {
                const newEventType = e.target.value as 'reminder' | 'meeting' | 'task' | 'no-reminder';
                setFormData({ 
                  ...formData, 
                  eventType: newEventType,
                  advanceNotice: newEventType === 'no-reminder' ? 0 : formData.advanceNotice
                });
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              required
            >
              <option value="reminder">תזכורת</option>
              <option value="meeting">פגישה</option>
              <option value="task">משימה</option>
              <option value="no-reminder">ללא תזכורת</option>
            </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      כותרת התזכורת
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="לדוגמה: מעקב אחרי הלקוח"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תיאור (אופציונלי)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="פרטים נוספים על התזכורת..."
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        תאריך התזכורת
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        שעת התזכורת
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      התראה מוקדמת
                    </label>
                    <select
                      value={formData.advanceNotice}
                      onChange={(e) => setFormData({ ...formData, advanceNotice: parseInt(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value={15}>15 דקות לפני</option>
                      <option value={30}>30 דקות לפני</option>
                      <option value={60}>שעה לפני</option>
                      <option value={120}>שעתיים לפני</option>
                      <option value={360}>6 שעות לפני</option>
                      <option value={720}>12 שעות לפני</option>
                      <option value={1440}>יום לפני</option>
                      <option value={2880}>יומיים לפני</option>
                      <option value={30}>30 דקות לפני</option>
                      <option value={10080}>שבוע לפני</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingEvent(null);
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {editingEvent ? 'עדכן תזכורת' : 'צור תזכורת'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Calendar Event Edit Dialog */}
      <AnimatePresence>
        {isCalendarEditDialogOpen && editingCalendarEvent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={() => {
                  setIsCalendarEditDialogOpen(false);
                  setEditingCalendarEvent(null);
                }}
              />
              
              <div
                className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-500" />
                    עריכת אירוע יומן
                  </h2>
                  <button
                    onClick={() => {
                      setIsCalendarEditDialogOpen(false);
                      setEditingCalendarEvent(null);
                    }}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Event Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      כותרת האירוע
                    </label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingCalendarEvent.title}
                    </p>
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      סוג אירוע
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-900 dark:text-white">
                        {editingCalendarEvent.type === 'reminder' ? 'תזכורת' : 
                         editingCalendarEvent.type === 'lead' ? 'שיחת חזרה' : 
                         editingCalendarEvent.type === 'meeting' ? 'פגישה' : 'משימה'}
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
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">
                          {format(editingCalendarEvent.start, 'dd/MM/yyyy', { locale: he })}
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
                          {(() => {
                            try {
                              // Use format function as requested
                              return format(parseSimpleISOString(editingCalendarEvent.startTime || editingCalendarEvent.start), 'HH:mm');
                            } catch (error) {
                              return '00:00';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {editingCalendarEvent.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        תיאור
                      </label>
                      <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        {editingCalendarEvent.description}
                      </p>
                    </div>
                  )}

                  {/* Reminder Info */}
                  {(editingCalendarEvent.type === 'reminder' || editingCalendarEvent.type === 'lead') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        מידע תזכורת
                      </label>
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-orange-800 dark:text-orange-200 text-sm">
                            {editingCalendarEvent.type === 'reminder' ? 'תזכורת' : 'שיחת חזרה'} - ניתן להגדיר התראה מוקדמת
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        לעריכת פרטים נוספים של האירוע, נא לעבור לדף היומן
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setIsCalendarEditDialogOpen(false);
                        setEditingCalendarEvent(null);
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      סגור
                    </button>
                    <button
                      onClick={() => {
                        // Navigate to calendar page
                        navigate('/calendar');
                        setIsCalendarEditDialogOpen(false);
                        setEditingCalendarEvent(null);
                        toast.success('מעבר לדף היומן...', { icon: '📅' });
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      פתח ביומן
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reminders;