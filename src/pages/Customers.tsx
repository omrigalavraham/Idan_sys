import React, { useState } from 'react';
import { 
  Search, Edit2, Trash2, Download, Phone, ChevronDown, ChevronUp, Mail, Calendar, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import useCustomerStore from '../store/customerStore';
import CustomerEditDialog from '../components/customers/CustomerEditDialog';
import toast from 'react-hot-toast';
import { Customer } from '../types';
import * as XLSX from 'xlsx';

const Customers = () => {
  const { customers, fetchCustomers, updateCustomer, deleteCustomer } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // Toggle all customers expansion
  const toggleAllCustomers = () => {
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (expandedCustomers.size > 0) {
      // If some are expanded, collapse all
      setExpandedCustomers(new Set());
    } else {
      // If none are expanded, expand all
      setExpandedCustomers(new Set(filtered.map(customer => customer.id)));
    }
  };

  // Toggle customer card expansion
  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Check if customer is expanded
  const isCustomerExpanded = (customerId: string) => {
    return expandedCustomers.has(customerId);
  };

  // Load customers on component mount and when page becomes visible
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Refresh data when page becomes visible
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCustomers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePhoneClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    const israelPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.substring(1)}`;
    const phoneUrl = `https://wa.me/${israelPhone}`;
    window.open(phoneUrl, '_blank');
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
      try {
        await deleteCustomer(customerId);
        toast.success('הלקוח נמחק בהצלחה');
      } catch (error) {
        toast.error('שגיאה במחיקת הלקוח');
        console.error('Error deleting customer:', error);
      }
    }
  };

  const handleSaveCustomer = async (updatedCustomer: Customer) => {
    try {
      await updateCustomer(updatedCustomer.id, updatedCustomer);
      toast.success('הלקוח עודכן בהצלחה');
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      toast.error('שגיאה בעדכון הלקוח');
      console.error('Error updating customer:', error);
    }
  };

  const handleExportToExcel = () => {
    try {
      const data = customers.map(customer => ({
        'שם': customer.name,
        'טלפון': customer.phone,
        'אימייל': customer.email || '',
        'סטטוס': customer.status,
        'סכום עסקה': customer.totalAmount || 0,
        'סטטוס תשלום': customer.paymentStatus,
        'כתובת': customer.address || '',
        'חברה': customer.company || '',
        'ח.פ/ע.מ': customer.vatNumber || '',
        'שיוך נציג': customer.assignedTo || '',
        'הערות': customer.notes || '',
        'סוג תשלום': customer.paymentType === 'amount' ? 'סכום' : customer.paymentType === 'percentage' ? 'אחוזים' : '',
        'ערך תשלום': customer.paymentType === 'amount' 
          ? `₪${Number(customer.paymentValue || 0).toLocaleString()}`
          : customer.paymentType === 'percentage' 
          ? `${customer.paymentValue || 0}%`
          : '',
        'תדירות חיוב': customer.billingFrequency || '',
        'סוג מע"מ': customer.vatType === 'plus' ? '+ מע"מ' : customer.vatType === 'included' ? 'כולל מע"מ' : '',
        'מע"מ כלול בתשלום': customer.paymentVatIncluded ? 'כן' : 'לא',
        'שירותים/מוצרים': customer.products ? customer.products.join(', ') : '',
        'מספר תשלומים': customer.payments?.[0]?.installments || 1,
        'סכום תשלום חודשי': customer.payments?.[0]?.installment_amount || 0,
        'תאריך תשלום ראשון': customer.payments?.[0]?.start_date 
          ? format(new Date(customer.payments[0].start_date), 'dd/MM/yyyy', { locale: he })
          : customer.startDate 
          ? format(new Date(customer.startDate), 'dd/MM/yyyy', { locale: he })
          : '',
        'סה"כ לתשלום': customer.payments?.[0]?.total_amount || customer.totalAmount || 0
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'לקוחות');
      
      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
      ];
      
      const fileName = `לקוחות_${format(new Date(), 'dd-MM-yyyy', { locale: he })}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('הקובץ יוצא בהצלחה');
    } catch (error) {
      toast.error('שגיאה בייצוא הקובץ');
      console.error('Error exporting to Excel:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">מעקב לקוחות</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAllCustomers}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
          >
            {expandedCustomers.size > 0 ? (
              <>
                <ChevronUp className="w-5 h-5" />
                צמצם הכל
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                הרחב הכל
              </>
            )}
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors active:scale-95"
          >
            <Download className="w-5 h-5" />
            ייצוא לאקסל
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Customers Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            {/* Customer Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-medium text-white">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {customer.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    customer.status === 'פעיל' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : customer.status === 'ממתין להתחלה'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                      : customer.status === 'לקוח VIP'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {customer.status}
                  </span>
                  {customer.totalAmount && (
                    <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                      ₪{customer.totalAmount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                <button
                  onClick={(e) => handlePhoneClick(customer.phone, e)}
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors truncate"
                >
                  {customer.phone}
                </button>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {customer.email}
                  </span>
                </div>
              )}
              {customer.company && (
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  <strong>חברה:</strong> {customer.company}
                </div>
              )}
            </div>            {/* Creation Date */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                נוצר ב: {customer.createdAt ? format(new Date(customer.createdAt), 'dd/MM/yyyy', { locale: he }) : 'לא זמין'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isCustomerExpanded(customer.id) ? 'מוצג במלואו' : 'לחץ לפרטים נוספים'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(customer)}
                  className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                  title="ערוך לקוח"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                  title="מחק לקוח"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleCustomerExpansion(customer.id)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-900/20 rounded-lg transition-colors"
                  title={isCustomerExpanded(customer.id) ? "צמצם" : "הרחב"}
                >
                  {isCustomerExpanded(customer.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Content */}
            <AnimatePresence>
              {isCustomerExpanded(customer.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                >
                  <div className="space-y-4">
                    {/* Additional Details */}
                    <div className="grid grid-cols-1 gap-3">
                      {customer.company && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">חברה</div>
                          <div className="text-sm text-blue-800 dark:text-blue-200">{customer.company}</div>
                        </div>
                      )}
                      
                      {customer.address && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">כתובת</div>
                          <div className="text-sm text-green-800 dark:text-green-200">{customer.address}</div>
                        </div>
                      )}
                      
                      {customer.assignedTo && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">נציג מטפל</div>
                          <div className="text-sm text-purple-800 dark:text-purple-200">{customer.assignedTo}</div>
                        </div>
                      )}
                      
                      {customer.notes && (
                        <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">הערות</div>
                          <div className="text-sm text-gray-800 dark:text-gray-200">{customer.notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Payment Status */}
                    {customer.paymentStatus && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">סטטוס תשלום</div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">{customer.paymentStatus}</div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'לא נמצאו לקוחות התואמים לחיפוש' : 'לא נמצאו לקוחות'}
          </p>
        </div>
      )}

      <CustomerEditDialog
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />
    </div>
  );
};

export default Customers;