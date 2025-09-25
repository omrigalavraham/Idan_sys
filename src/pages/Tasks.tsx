import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Plus, Search, Calendar, Filter, ArrowUpDown, User, Edit2, Trash2,
  CheckCircle, Circle, Clock3, X
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { parseSimpleISOString, createLocalDateTime } from '../utils/dateUtils';
import { useLeadStore } from '../store/leadStore';
import { useTaskStore, Task, TaskFormData } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

type TaskStatus = 'ממתין' | 'בביצוע' | 'הושלם';
type SortField = 'dueDate' | 'priority' | 'title';
type SortDirection = 'asc' | 'desc';

const Tasks = () => {
  const { leads } = useLeadStore();
  const { users, fetchUsers } = useUserStore();
  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { user: currentUser } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'הכל'>('הכל');
  const [priorityFilter, setPriorityFilter] = useState<string | 'הכל'>('הכל');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [, setShowAllTasks] = useState(false);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'הושלם':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'בביצוע':
        return <Clock3 className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'גבוה':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'בינוני':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'נמוך':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Load tasks and users on component mount
  React.useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [fetchTasks, fetchUsers]);


  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'הכל' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'הכל' || task.priority === priorityFilter;
      
      // User filtering logic:
      // 1. If a specific user is selected, show only their tasks
      // 2. If no user is selected, show only current user's tasks (default behavior)
      let matchesUser = true;
      if (selectedUserId) {
        // When a specific user is selected, show only their tasks
        // Ensure both IDs are strings for comparison
        const taskAssignedTo = String(task.assignedTo);
        const selectedUserIdStr = String(selectedUserId);
        matchesUser = taskAssignedTo === selectedUserIdStr;
        
      } else {
        // Default behavior: show only current user's tasks
        const taskAssignedTo = String(task.assignedTo);
        const currentUserIdStr = String(currentUser?.id);
        matchesUser = taskAssignedTo === currentUserIdStr;
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesUser;
    })
    .sort((a, b) => {
      if (sortField === 'dueDate') {
        const getTaskDate = (task: Task) => {
          const match = task.dueDate.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/);
          if (match) {
            const [, datePart, timePart] = match;
            return createLocalDateTime(datePart, timePart);
          } else {
            return parseSimpleISOString(task.dueDate);
          }
        };
        
        return sortDirection === 'asc' 
          ? getTaskDate(a).getTime() - getTaskDate(b).getTime()
          : getTaskDate(b).getTime() - getTaskDate(a).getTime();
      }
      if (sortField === 'priority') {
        const priorityOrder = { גבוה: 3, בינוני: 2, נמוך: 1 };
        return sortDirection === 'asc'
          ? priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
          : priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      }
      return sortDirection === 'asc'
        ? a[sortField].localeCompare(b[sortField])
        : b[sortField].localeCompare(a[sortField]);
    });

  const tasksByStatus = {
    'ממתין': filteredTasks.filter(task => task.status === 'ממתין'),
    'בביצוע': filteredTasks.filter(task => task.status === 'בביצוע'),
    'הושלם': filteredTasks.filter(task => task.status === 'הושלם')
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter users based on current user's role
  const getFilteredUsers = () => {
    if (!currentUser) return users;
    
    switch (currentUser.role) {
      case 'admin':
        // Admin can see all users
        return users;
      case 'manager':
        // Manager can only see their assigned agents
        return users.filter(user => 
          user.role === 'agent' && user.managerId === currentUser.id
        );
      case 'agent':
        // Agent can only see themselves
        return users.filter(user => user.id === currentUser.id);
      default:
        return users;
    }
  };

  // Check if user selection should be shown
  const shouldShowUserSelection = () => {
    if (!currentUser) return true;
    return currentUser.role !== 'agent';
  };


  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">משימות</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Tasks by User button for Admin */}
          {currentUser?.role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowUserFilter(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
            >
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">משימות לפי משתמש</span>
              <span className="sm:hidden">לפי משתמש</span>
            </motion.button>
          )}
          
          {/* Tasks by Representative button for Manager */}
          {currentUser?.role === 'manager' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowUserFilter(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
            >
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">משימות לפי נציג</span>
              <span className="sm:hidden">לפי נציג</span>
            </motion.button>
          )}
          
          {/* My Tasks button for Agents */}
          {currentUser?.role === 'agent' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedUserId('');
                setShowAllTasks(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
            >
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">המשימות שלי</span>
              <span className="sm:hidden">שלי</span>
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">משימה חדשה</span>
            <span className="sm:hidden">חדשה</span>
          </motion.button>
        </div>
      </div>

      {/* User Filter Indicator */}
      {selectedUserId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              מציג משימות עבור: {users.find(u => u.id === selectedUserId)?.name || selectedUserId}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedUserId('');
              setShowAllTasks(false);
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            title={currentUser?.role === 'agent' ? 'חזור למשימות שלי' : 'חזור לכל המשימות'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters - Mobile Optimized */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש משימות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm min-h-[44px] ${
              showFilters
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">סינון</span>
          </button>
          
          <button
            onClick={() => handleSort('dueDate')}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 text-sm text-gray-700 dark:text-white min-h-[44px]"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">מיון</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סטטוס
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'הכל')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="הכל">הכל</option>
                  <option value="ממתין">ממתין</option>
                  <option value="בביצוע">בביצוע</option>
                  <option value="הושלם">הושלם</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  עדיפות
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="הכל">הכל</option>
                  <option value="גבוה">גבוה</option>
                  <option value="בינוני">בינוני</option>
                  <option value="נמוך">נמוך</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מיון לפי
                </label>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortDirection(direction as SortDirection);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="dueDate-asc">תאריך יעד (מהמוקדם למאוחר)</option>
                  <option value="dueDate-desc">תאריך יעד (מהמאוחר למוקדם)</option>
                  <option value="priority-desc">עדיפות (מהגבוה לנמוך)</option>
                  <option value="priority-asc">עדיפות (מהנמוך לגבוה)</option>
                  <option value="title-asc">כותרת (א-ת)</option>
                  <option value="title-desc">כותרת (ת-א)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Kanban Board - Mobile Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {(['ממתין', 'בביצוע', 'הושלם'] as TaskStatus[]).map((status) => (
          <div key={status} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getStatusIcon(status)}
                {status}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                {tasksByStatus[status].length}
              </span>
            </div>

            <Reorder.Group
              axis="y"
              values={tasksByStatus[status]}
              onReorder={() => {}} // Simplified for now - drag and drop can be enhanced later
              className="space-y-4"
            >
              {tasksByStatus[status].map((task) => (
                <Reorder.Item key={task.id} value={task}>
                  <div
                    className="bg-white dark:bg-gray-700 rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm md:text-base">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDialogOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
                              try {
                                await deleteTask(task.id);
                              } catch (error) {
                                // Error is already handled in the store
                              }
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.leadId && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {leads.find(l => l.id === task.leadId)?.name || 'ליד לא נמצא'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 dark:text-gray-400 gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs sm:text-sm">
                          {(() => {
                            try {
                              const match = task.dueDate.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/);
                              if (match) {
                                const [, datePart, timePart] = match;
                                const date = createLocalDateTime(datePart, timePart);
                                return format(date, 'dd/MM/yyyy HH:mm', { locale: he });
                              } else {
                                return format(parseSimpleISOString(task.dueDate), 'dd/MM/yyyy HH:mm', { locale: he });
                              }
                            } catch (error) {
                              return 'תאריך לא תקין';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-xs sm:text-sm truncate">
                          {users.find(u => u.id === task.assignedTo)?.name || task.assignedTo}
                        </span>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {tasksByStatus[status].length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                אין משימות בסטטוס זה
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Form Dialog */}
      <TaskFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        leads={leads}
        users={getFilteredUsers()}
        showUserSelection={shouldShowUserSelection()}
        currentUser={currentUser}
        onSubmit={async (taskData) => {
          try {
            if (selectedTask) {
              await updateTask(selectedTask.id, taskData);
            } else {
              await addTask(taskData);
            }
            setIsDialogOpen(false);
            setSelectedTask(null);
          } catch (error) {
            console.error('Error submitting task:', error);
            // Error is already handled in the store
          }
        }}
      />

      {/* User Selection Dialog */}
      <UserSelectionDialog
        isOpen={showUserFilter}
        onClose={() => setShowUserFilter(false)}
        onSelectUser={(userId) => {
          if (userId === '') {
            // Show all tasks
            setSelectedUserId('');
            setShowAllTasks(false);
          } else {
            // Show specific user's tasks
            setSelectedUserId(userId);
            setShowAllTasks(false);
          }
          setShowUserFilter(false);
        }}
        users={getFilteredUsers()}
        currentUser={currentUser}
      />
    </div>
  );
};

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: TaskFormData) => void;
  task?: Task | null;
  leads: any[];
  users: any[];
  showUserSelection: boolean;
  currentUser: any;
}

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  leads,
  users,
  showUserSelection,
  currentUser,
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'ממתין',
    dueDate: '',
    assignedTo: '',
    priority: 'בינוני',
    leadId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Separate state for date and time inputs
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  // Update form data when task changes
  React.useEffect(() => {
    if (task) {
      // Parse the ISO date string to separate date and time for form inputs
      // Handle time like in leads (which works perfectly)
      let taskDate;
      if (task.dueDate) {
        const match = task.dueDate.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/);
        if (match) {
          const [, datePart, timePart] = match;
          taskDate = createLocalDateTime(datePart, timePart);
        } else {
          taskDate = parseSimpleISOString(task.dueDate);
        }
      } else {
        taskDate = new Date();
      }
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        dueDate: task.dueDate || '',
        assignedTo: task.assignedTo || '',
        priority: task.priority,
        leadId: task.leadId || '',
      });
      // Set separate date and time inputs
      setDateInput(format(taskDate, 'yyyy-MM-dd'));
      setTimeInput(format(taskDate, 'HH:mm'));
    } else {
      // For new tasks, auto-assign based on user role and set current date/time
      let defaultAssignedTo = '';
      if (currentUser) {
        if (currentUser.role === 'agent') {
          // Agent creates task for themselves
          defaultAssignedTo = currentUser.id;
        } else if (currentUser.role === 'manager' || currentUser.role === 'admin') {
          // Manager/Admin creates task for themselves by default (can be changed)
          defaultAssignedTo = currentUser.id;
        }
      }
      
      const now = new Date();
      setFormData({
        title: '',
        description: '',
        status: 'ממתין',
        dueDate: now.toISOString(),
        assignedTo: defaultAssignedTo,
        priority: 'בינוני',
        leadId: '',
      });
      // Set separate date and time inputs
      setDateInput(format(now, 'yyyy-MM-dd'));
      setTimeInput(format(now, 'HH:mm'));
    }
  }, [task, isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      toast.error('כותרת המשימה נדרשת');
      return;
    }
    
    if (!dateInput) {
      toast.error('תאריך יעד נדרש');
      return;
    }
    
    // Only validate user selection if the field is shown and no user is selected
    if (showUserSelection && !formData.assignedTo) {
      toast.error('יש לבחור משתמש להקצאה');
      return;
    }
    
    // If no user is selected and user selection is not shown (agent), auto-assign to current user
    if (!formData.assignedTo && currentUser) {
      formData.assignedTo = currentUser.id;
    }
    
    // Combine date and time into ISO string like in leads (which works perfectly)
    const combinedDateTime = `${dateInput}T${timeInput || '00:00'}:00.000Z`;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        dueDate: combinedDateTime
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={onClose}
            />
            
            <div
              className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {task ? 'עריכת משימה' : 'משימה חדשה'}
                </h2>
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
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תיאור
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      סטטוס
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="ממתין">ממתין</option>
                      <option value="בביצוע">בביצוע</option>
                      <option value="הושלם">הושלם</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      עדיפות
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    >
                      <option value="נמוך">נמוך</option>
                      <option value="בינוני">בינוני</option>
                      <option value="גבוה">גבוה</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תאריך יעד
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שעת יעד
                    </label>
                    <input
                      type="time"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>

                  {showUserSelection ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        הוקצה ל
                      </label>
                      <select
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      >
                        <option value="">בחר משתמש (אופציונלי)</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    // Hidden input for agents to maintain assignedTo value
                    <input
                      type="hidden"
                      name="assignedTo"
                      value={formData.assignedTo}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שייך לליד
                  </label>
                  <select
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  >
                    <option value="">בחר ליד</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))}
                  </select>
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
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'שומר...' : (task ? 'עדכון' : 'יצירה')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface UserSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  users: any[];
  currentUser: any;
}

const UserSelectionDialog: React.FC<UserSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  users,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDialogTitle = () => {
    if (currentUser?.role === 'admin') {
      return 'בחר משתמש';
    } else if (currentUser?.role === 'manager') {
      return 'בחר נציג';
    }
    return 'בחר משתמש';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={onClose}
            />
            
            <div
              className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {getDialogTitle()}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="חיפוש משתמשים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {/* Show All Tasks option for admin and manager */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <button
                    onClick={() => onSelectUser('')}
                    className="w-full text-right p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-blue-50 dark:bg-blue-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">
                          הצג את כל המשימות
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          {currentUser?.role === 'admin' ? 'כל המשימות במערכת' : 'כל המשימות של הנציגים'}
                        </div>
                      </div>
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  </button>
                )}
                
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user.id)}
                    className="w-full text-right p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {user.role === 'admin' ? 'מנהל מערכת' : 
                           user.role === 'manager' ? 'מנהל' : 
                           user.role === 'agent' ? 'נציג' : user.role}
                        </div>
                      </div>
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    לא נמצאו משתמשים
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Tasks;