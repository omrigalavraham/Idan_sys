import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, Search, Filter, UserCheck, UserX, Building2, Archive } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useClientStore } from '../store/clientStore';
import { useAuthStore } from '../store/authStore';
import useCustomerStore from '../store/customerStore';
import { useSystemClientStore } from '../store/systemClientStore';
import { User, Customer } from '../types';
import { WhatsAppConnection } from '../components/whatsapp';

type UserRole = 'admin' | 'manager' | 'agent';

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { users, deletedUsers, fetchUsers, fetchDeletedUsers, addUser, updateUser, deleteUser, restoreUser, toggleUserStatus } = useUserStore();
  const { currentClient } = useClientStore();
  const { user: currentUser } = useAuthStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { clients: systemClients, fetchClients } = useSystemClientStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent' as UserRole,
    clientId: '',
    department: '',
    phone: '',
    notes: '',
    managerId: ''
  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // פונקציה לוולידציה של טלפון
  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  // פונקציה לוולידציה של סיסמה
  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    if (!/[0-9]/.test(password)) return false; // לפחות מספר אחד
    if (!/[a-z]/.test(password)) return false; // לפחות אות קטנה באנגלית
    if (!/[A-Z]/.test(password)) return false; // לפחות אות גדולה באנגלית
    return true;
  };

  // פונקציה לקבלת הודעות שגיאה לסיסמה
  const getPasswordErrors = (password: string) => {
    const errors = [];
    if (password.length < 8) errors.push('לפחות 8 תווים');
    if (!/[0-9]/.test(password)) errors.push('לפחות מספר אחד');
    if (!/[a-z]/.test(password)) errors.push('לפחות אות קטנה באנגלית');
    if (!/[A-Z]/.test(password)) errors.push('לפחות אות גדולה באנגלית');
    return errors;
  };

  // פונקציה לטעינת פרטי לקוח
  const loadClientDetails = (clientId: string) => {
    if (!clientId) return;
    
    const customer = customers.find((c: Customer) => c.id === clientId);
    if (customer) {
      console.log('Loading customer details:', customer);
      console.log('Customer clientId:', customer.clientId);
      setFormData(prev => ({
        ...prev,
        email: customer.email || '',
        phone: customer.phone || '',
        name: customer.name || '',
        clientId: customer.clientId || '' // עדכון אוטומטי של Client ID
      }));
      
      // הודעה למשתמש אם הלקוח לא משויך ל-system client
      if (!customer.clientId) {
        alert(`הלקוח "${customer.name}" לא משויך לשום system client. יש לערוך את הלקוח ולשייך אותו קודם.`);
      }
    }
  };

  // פונקציה לטעינת לקוחות זמינים (כל הלקוחות חוץ מהמשתמש הנוכחי)
  const getAvailableClients = () => {
    if (currentUser?.role === 'admin') {
      // מנהל מערכת רואה את כל הלקוחות (customers)
      console.log('🔍 UserManagement - Available customers:', customers);
      console.log('🔍 Customer details:');
      customers.forEach((customer, index) => {
        console.log(`${index + 1}. Name: ${customer.name}, ID: ${customer.id}, Client ID: ${customer.clientId}`);
      });
      return customers;
    }
    return [];
  };

  useEffect(() => {
    // Load users and customers on component mount only if authenticated
    if (currentUser) {
      fetchUsers();
      fetchCustomers();
      fetchClients();
    }
  }, [fetchUsers, fetchCustomers, fetchClients, currentUser]);

  // Function to handle toggling between active and deleted users
  const handleToggleDeletedUsers = async () => {
    if (!showDeletedUsers) {
      // Pass manager ID if current user is a manager
      if (currentUser?.role === 'manager') {
        await fetchDeletedUsers(currentUser.id);
      } else {
        // For admins and others, fetch all deleted users
        await fetchDeletedUsers();
      }
    }
    setShowDeletedUsers(!showDeletedUsers);
  };

  // פונקציה לקביעת אילו משתמשים המשתמש הנוכחי יכול לראות
  const getVisibleUsers = () => {
    if (!currentUser) return [];
    
    if (showDeletedUsers) {
      // Anyone can now see deleted users (no longer admin-only)
      return deletedUsers;
    }
    
    switch (currentUser.role) {
      case 'admin':
        // מנהל מערכת רואה הכל
        return users;
      case 'manager':
        // מנהל רואה רק את הנציגים שמשויכים אליו
        return users.filter(user => user.role === 'agent' && user.managerId === currentUser.id);
      case 'agent':
        // נציג רואה רק את עצמו
        return users.filter(user => user.id === currentUser.id);
      default:
        return [];
    }
  };

  const visibleUsers = getVisibleUsers();
  
  const filteredUsers = visibleUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('שגיאה: משתמש לא מחובר');
      return;
    }
    
    // בדיקת הרשאות ליצירת משתמש
    if (!editingUser) {
      if (currentUser.role === 'agent') {
        alert('נציג לא יכול ליצור משתמשים חדשים');
        return;
      }
      if (currentUser.role === 'manager' && formData.role !== 'agent') {
        alert('מנהל יכול ליצור רק נציגים');
        return;
      }
      // מנהל מערכת יכול ליצור כל סוג של משתמש
      // אין צורך בבדיקה נוספת עבור admin
    }
    
    // Validation for phone - required and must be 10 digits
    if (!formData.phone || !validatePhone(formData.phone)) {
      alert('נא להזין מספר טלפון תקין (10 ספרות)');
      return;
    }

    // Validation for password - required for new users and must meet criteria
    if (!editingUser && (!formData.password || !validatePassword(formData.password))) {
      const errors = getPasswordErrors(formData.password || '');
      alert(`הסיסמה אינה תקינה. חסרים: ${errors.join(', ')}`);
      return;
    }

    // Validation for password when editing (if password is provided)
    if (editingUser && formData.password && !validatePassword(formData.password)) {
      const errors = getPasswordErrors(formData.password);
      alert(`הסיסמה אינה תקינה. חסרים: ${errors.join(', ')}`);
      return;
    }

    // Validation for agent created by admin - must have manager
    if (currentUser?.role === 'admin' && formData.role === 'agent' && !formData.managerId) {
      alert('נציג חייב להיות משויך למנהל');
      return;
    }

    // קביעת clientId ו-managerId לפי הלוגיקה החדשה
    let finalClientId: string | undefined = formData.clientId || undefined;
    let finalManagerId: string | undefined = formData.managerId;
    
    if (currentUser?.role === 'admin') {
      if (formData.role === 'agent') {
        // נציג חייב להיות משויך למנהל
        finalManagerId = formData.managerId;
      } else {
        // אדמין ומנהל לא משויכים ללקוח או למנהל
        finalManagerId = undefined;
      }
    } else if (currentUser?.role === 'manager') {
      // מנהל יוצר נציג - לא צריך לקוח, אבל צריך מנהל
      finalManagerId = currentUser.id;
    }

    const userData = {
      ...formData,
      permissions: [], // יוגדר אוטומטית לפי התפקיד
      password: formData.password || undefined,
      clientId: finalClientId,
      managerId: finalManagerId
    };

    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
      } else {
        // For new users, password is required
        if (!formData.password) {
          alert('נא להזין סיסמה למשתמש חדש');
          return;
        }
        await addUser(userData, currentUser.id);
        
        // אם יצרנו משתמש חדש מסוג מנהל, נווט לניהול לקוחות מערכת
        if (formData.role === 'manager') {
          resetForm();
          navigate('/clients');
          return;
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      // Error is already handled in the store, no need to show additional alert
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'agent', // מנהלים יכולים ליצור רק נציגים
      clientId: '',
      department: '',
      phone: '',
      notes: '',
      managerId: ''
    });
    setSelectedClientId('');
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role: user.role,
      clientId: user.clientId || '',
      department: user.department || '',
      phone: user.phoneNumber || '',
      notes: user.notes || '',
      managerId: user.managerId || ''
    });
    setSelectedClientId(''); // איפוס בחירת לקוח בעריכה
    setIsDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      deleteUser(userId);
    }
  };

  const handleRestore = async (userId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך לשחזר את המשתמש?')) {
      try {
        await restoreUser(userId);
        // Refresh the deleted users list
        if (currentUser?.role === 'manager') {
          await fetchDeletedUsers(currentUser.id);
        } else {
          await fetchDeletedUsers();
        }
      } catch (error) {
        console.error('Error restoring user:', error);
      }
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'לא משויך';
    const systemClient = systemClients.find(c => c.id === clientId);
    return systemClient?.name || 'לקוח מערכת לא נמצא';
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'לא משויך';
    const manager = users.find(u => u.id === managerId);
    return manager?.name || 'מנהל לא נמצא';
  };

  // Force re-render when currentClient changes
  useEffect(() => {
    // This will trigger a re-render when the current client changes
  }, [currentClient]);

  const getRoleDisplay = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'מנהל מערכת';
      case 'manager': return 'מנהל';
      case 'agent': return 'נציג';
      default: return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'agent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            {showDeletedUsers ? 'משתמשים מחוקים' : 'ניהול משתמשים'}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {currentUser && (
            <button
              onClick={handleToggleDeletedUsers}
              className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 min-h-[44px] text-base ${
                showDeletedUsers 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {showDeletedUsers ? 'חזור למשתמשים פעילים' : 'משתמשים מחוקים'}
              </span>
            </button>
          )}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && !showDeletedUsers && (
            <button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-h-[44px] text-base"
            >
              <Plus className="w-4 h-4" />
              {currentUser?.role === 'manager' ? 'הוסף נציג' : 'הוסף משתמש'}
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Connection - רק למנהלים */}
      {currentUser?.role === 'manager' && (
        <div className="mb-6">
          <WhatsAppConnection />
        </div>
      )}

      {/* Filters - only show for active users */}
      {!showDeletedUsers && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש משתמשים..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="all">כל התפקידים</option>
              {currentUser?.role === 'admin' && <option value="admin">מנהל מערכת</option>}
              {currentUser?.role === 'admin' && <option value="manager">מנהל</option>}
              <option value="agent">נציג</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center gap-2 justify-center sm:justify-start">
              <Filter className="w-4 h-4" />
              {filteredUsers.length} משתמשים
            </div>
          </div>
        </div>
      )}

      {/* Search for deleted users */}
      {showDeletedUsers && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש משתמשים מחוקים..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
              />
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2 justify-center sm:justify-start">
              <Archive className="w-4 h-4" />
              {filteredUsers.length} משתמשים מחוקים
            </div>
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className={`bg-white p-4 md:p-6 rounded-lg shadow-sm border ${
            showDeletedUsers 
              ? 'border-red-200 bg-red-50' 
              : 'border-gray-200'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  showDeletedUsers 
                    ? 'bg-red-100' 
                    : 'bg-blue-100'
                }`}>
                  {showDeletedUsers ? (
                    <Archive className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                  ) : (
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm md:text-base truncate ${
                    showDeletedUsers ? 'text-red-900' : 'text-gray-900'
                  }`}>{user.name}</h3>
                  <p className={`text-xs md:text-sm truncate ${
                    showDeletedUsers ? 'text-red-600' : 'text-gray-600'
                  }`}>{user.email}</p>
                </div>
              </div>
              {!showDeletedUsers && (
                <div className="flex gap-1">
                  {(currentUser?.role === 'admin' || 
                    (currentUser?.role === 'manager' && user.role === 'agent' && user.managerId === currentUser.id) ||
                    (currentUser?.role === 'agent' && user.id === currentUser.id)) && (
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {(currentUser?.role === 'admin' || 
                    (currentUser?.role === 'manager' && user.role === 'agent' && user.managerId === currentUser.id)) && (
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`p-2 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        user.status === 'active'
                          ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={user.status === 'active' ? 'השבת משתמש' : 'הפעל משתמש'}
                    >
                      {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  )}
                  {(currentUser?.role === 'admin' || 
                    (currentUser?.role === 'manager' && user.role === 'agent' && user.managerId === currentUser.id)) && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              {showDeletedUsers && (
                <div className="flex gap-1">
                  {(currentUser?.role === 'admin' || 
                    (currentUser?.role === 'manager' && user.role === 'agent' && user.managerId === currentUser.id)) && (
                    <button
                      onClick={() => handleRestore(user.id)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="שחזר משתמש"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">תפקיד:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {getRoleDisplay(user.role)}
                </span>
              </div>

              {user.clientId && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 flex-shrink-0">לקוח:</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium truncate">{getClientName(user.clientId)}</span>
                  </div>
                </div>
              )}

              {user.role === 'agent' && user.managerId && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 flex-shrink-0">מנהל:</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium truncate">{getManagerName(user.managerId)}</span>
                  </div>
                </div>
              )}

              {user.department && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 flex-shrink-0">מחלקה:</span>
                  <span className="text-xs md:text-sm truncate">{user.department}</span>
                </div>
              )}

              {user.phoneNumber && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 flex-shrink-0">טלפון:</span>
                  <span className="text-xs md:text-sm" dir="ltr">{user.phoneNumber}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">סטטוס:</span>
                <div className="flex items-center gap-1">
                  {showDeletedUsers ? (
                    <>
                      <Archive className="w-3 h-3 text-red-500" />
                      <span className="text-xs md:text-sm text-red-600">מחוק</span>
                    </>
                  ) : user.status === 'active' ? (
                    <>
                      <UserCheck className="w-3 h-3 text-green-500" />
                      <span className="text-xs md:text-sm text-green-600">פעיל</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3 h-3 text-red-500" />
                      <span className="text-xs md:text-sm text-red-600">לא פעיל</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-xs md:text-sm text-gray-600 flex-shrink-0">נוצר:</span>
                <span className="text-xs md:text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : 'לא מוגדר'}</span>
              </div>

              {user.deletedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">נמחק:</span>
                  <span className="text-sm text-red-600">{user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('he-IL') : 'לא מוגדר'}</span>
                </div>
              )}
            </div>

            {user.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">{user.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          {showDeletedUsers ? (
            <>
              <Archive className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-500">לא נמצאו משתמשים מחוקים</p>
            </>
          ) : (
            <>
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">לא נמצאו משתמשים</p>
            </>
          )}
        </div>
      )}

      {/* Add/Edit User Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'עריכת משתמש' : 
               currentUser?.role === 'manager' ? 'הוספת נציג חדש' : 'הוספת משתמש חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* פרטים בסיסיים - שורה אחת */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אימייל *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoComplete="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* סיסמה - רוחב מלא */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'השאר ריק כדי לא לשנות' : 'הקלד סיסמה'}
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formData.password && !validatePassword(formData.password)
                      ? 'border-red-500 focus:ring-red-500'
                      : formData.password && validatePassword(formData.password)
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {formData.password && (
                  <div className="mt-2">
                    <div className="text-xs grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        לפחות 8 תווים
                      </div>
                      <div className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        לפחות מספר אחד
                      </div>
                      <div className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        לפחות אות קטנה באנגלית
                      </div>
                      <div className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        לפחות אות גדולה באנגלית
                      </div>
                    </div>
                  </div>
                )}
                {!editingUser && !formData.password && (
                  <p className="text-xs text-gray-500 mt-1">
                    הסיסמה חייבת להכיל לפחות 8 תווים, מספר, אות גדולה ואות קטנה באנגלית
                  </p>
                )}
              </div>
              
              {/* תפקיד ולקוח מערכת */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* בחירת תפקיד - רק לאדמינים */}
              {currentUser?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תפקיד *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormData({ 
                        ...formData, 
                        role: newRole,
                        managerId: '' // איפוס מנהל כאשר משנים תפקיד
                      });
                      setSelectedClientId(''); // איפוס בחירת לקוח כאשר משנים תפקיד
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">מנהל מערכת</option>
                    <option value="manager">מנהל</option>
                    <option value="agent">נציג</option>
                  </select>
                </div>
              )}

              {/* עבור מנהלים - הצג את התפקיד כטקסט קבוע */}
              {currentUser?.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תפקיד
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    נציג
                  </div>
                </div>
              )}

              {/* בחירת לקוח מערכת - רק לאדמינים */}
              {currentUser?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    לקוח מערכת (Client ID)
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">ללא שיוך לקוח מערכת</option>
                    {systemClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.companyName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    קישור המשתמש לקוח מערכת יגביל את התכונות שיראה
                  </p>
                </div>
              )}
              </div>

              {/* בחירת לקוח - רק לאדמינים, רק עבור מנהלים */}
              {currentUser?.role === 'admin' && formData.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    טען פרטים מלקוח (אופציונלי)
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      loadClientDetails(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחר לקוח לטעינת פרטים</option>
                    {getAvailableClients().map((customer: Customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    בחירת לקוח תטען אוטומטית את הפרטים שלו לטופס ותעשה שיוך ל-Client ID (אם הלקוח משויך)
                  </p>
                </div>
              )}

              {/* שיוך למנהל - עבור נציגים שנוצרים על ידי מנהל */}
              {formData.role === 'agent' && currentUser?.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מנהל אחראי
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                    {currentUser.name}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    הנציג יהיה משויך אליך כמנהל
                  </p>
                </div>
              )}

              {/* שיוך למנהל - עבור נציגים שנוצרים על ידי אדמין */}
              {formData.role === 'agent' && currentUser?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מנהל אחראי *
                  </label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">בחר מנהל</option>
                    {users.filter(user => user.role === 'manager').map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    נא לבחור מנהל שיהיה אחראי על הנציג
                  </p>
                </div>
              )}

              {/* מחלקה וטלפון */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מחלקה
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    טלפון *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, ''); // רק מספרים
                      if (value.length <= 10) {
                        setFormData({ ...formData, phone: value });
                      }
                    }}
                    placeholder="0501234567"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    נא להזין 10 ספרות בלבד
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingUser ? 'עדכן' : 'הוסף'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;