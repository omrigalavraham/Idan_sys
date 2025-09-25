import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Building2, Package,
  CreditCard, Calculator, ChevronDown, ChevronUp,
  AlertCircle, Check, Bell
} from 'lucide-react';
import { Customer, Lead } from '../../types';
import { useLeadStore } from '../../store/leadStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface CreateCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: Omit<Customer, 'id'>) => void;
  lead?: Lead | null;
}

const VAT_RATE = 0.18; // 18% VAT rate

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lead
}) => {
  const { leads } = useLeadStore();
  const { user, clientConfig } = useAuthStore();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(lead || null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  
  // Get available statuses based on user role and client config
  const getAvailableCustomerStatuses = () => {
    if (user?.role === 'admin') {
      return ['פעיל', 'ממתין להתחלה', 'לקוח VIP', 'מושעה', 'לא פעיל'];
    }
    return clientConfig?.customer_statuses?.map((s: any) => s.name) || ['פעיל'];
  };

  const getAvailablePaymentStatuses = () => {
    if (user?.role === 'admin') {
      return ['ממתין לתשלום', 'שולם', 'תשלום חלקי', 'בוטל', 'החזר', 'חוב'];
    }
    return clientConfig?.payment_statuses?.map((s: any) => s.name) || ['ממתין לתשלום'];
  };

  const [formData, setFormData] = useState<Partial<Customer>>({
    status: getAvailableCustomerStatuses()[0] || 'פעיל',
    billingFrequency: 'חד פעמי',
    products: [],
    totalAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    paymentStatus: getAvailablePaymentStatuses()[0] || 'ממתין לתשלום',
    vatType: 'plus', // Default to plus VAT
    paymentType: 'amount', // Default to amount payment
    paymentValue: 0,
    paymentVatIncluded: false
  });

  const [showPaymentPlan, setShowPaymentPlan] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState({
    numberOfPayments: 1,
    monthlyAmount: 0,
    firstPaymentDate: new Date().toISOString().split('T')[0]
  });

  const [showReminder, setShowReminder] = useState(false);
  const [reminderData, setReminderData] = useState({
    title: '',
    description: '',
    reminderDate: '',
    reminderTime: '10:00',
    advanceNotice: 1440 // 24 hours in minutes
  });

  // Get leads that can be converted to customers
  const eligibleLeads = leads.filter(lead => 
    lead.status === 'עסקה נסגרה'
  );
  
  const filteredEligibleLeads = eligibleLeads.filter(lead =>
    !leadSearchQuery || 
    lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
    lead.phone.includes(leadSearchQuery)
  );

  useEffect(() => {
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId: selectedLead.id,
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || '',
        notes: selectedLead.notes || '',
      }));
    }
  }, [selectedLead]);

  useEffect(() => {
    if (formData.totalAmount && paymentPlan.numberOfPayments) {
      let totalWithVat: number;
      
      if (formData.vatType === 'plus') {
        // When VAT is added on top
        totalWithVat = formData.totalAmount * (1 + VAT_RATE);
      } else {
        // When amount includes VAT
        totalWithVat = formData.totalAmount;
      }
      
      const monthlyAmount = totalWithVat / paymentPlan.numberOfPayments;
      setPaymentPlan(prev => ({
        ...prev,
        monthlyAmount: Number(monthlyAmount.toFixed(2))
      }));
    }
  }, [formData.totalAmount, formData.vatType, paymentPlan.numberOfPayments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקת פרטים בסיסיים
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error('נא למלא את כל הפרטים הבסיסיים (שם, טלפון, אימייל)');
      return;
    }

    if (!selectedLead) {
      toast.error('נא לבחור ליד');
      return;
    }

    // בדיקת פרטי עסקה
    if (!formData.products || formData.products.length === 0 || formData.products.every(p => !p.trim())) {
      toast.error('נא למלא את שדה השירותים/מוצרים שנרכשו');
      return;
    }

    // Validation is now handled by payment value validation below

    if (!formData.billingFrequency) {
      toast.error('נא לבחור תדירות חיוב');
      return;
    }

    if (!formData.startDate) {
      toast.error('נא לבחור תאריך תחילת עבודה');
      return;
    }

    if (!formData.paymentStatus) {
      toast.error('נא לבחור סטטוס תשלום');
      return;
    }

    // בדיקת פרטי תשלום
    if (!formData.paymentValue || formData.paymentValue <= 0) {
      toast.error('נא למלא סכום או אחוז תשלום חוקי');
      return;
    }

    if (formData.paymentType === 'percentage' && (formData.paymentValue < 1 || formData.paymentValue > 100)) {
      toast.error('אחוז התשלום חייב להיות בין 1% ל-100%');
      return;
    }

    // בדיקת פריסת תשלומים (אם נבחרה)
    if (showPaymentPlan) {
      if (!paymentPlan.numberOfPayments || paymentPlan.numberOfPayments < 1) {
        toast.error('נא לבחור מספר תשלומים חוקי');
        return;
      }

      if (!paymentPlan.firstPaymentDate) {
        toast.error('נא לבחור תאריך תשלום ראשון');
        return;
      }
    }

    // Calculate payment amount based on payment type
    let paymentAmount = 0;
    let finalAmount = 0;
    
    if (formData.paymentType === 'amount' && formData.paymentValue) {
      paymentAmount = formData.paymentValue;
      if (formData.vatType === 'plus') {
        finalAmount = paymentAmount * (1 + VAT_RATE);
      } else {
        finalAmount = paymentAmount;
      }
    } else if (formData.paymentType === 'percentage' && formData.paymentValue) {
      // For percentage, we need a base amount to calculate from
      // We'll use the totalAmount as the base amount
      const baseAmount = formData.totalAmount || 0;
      paymentAmount = baseAmount * (formData.paymentValue / 100);
      if (formData.paymentVatIncluded) {
        finalAmount = paymentAmount;
      } else {
        finalAmount = paymentAmount * (1 + VAT_RATE);
      }
    } else {
      // If no payment value is set, use the totalAmount
      paymentAmount = formData.totalAmount || 0;
      finalAmount = formData.totalAmount || 0;
    }

    const finalData = {
      ...formData,
      leadId: selectedLead.id,
      totalAmount: finalAmount,
      paymentPlan: showPaymentPlan ? {
        ...paymentPlan,
        monthlyAmount: paymentAmount / paymentPlan.numberOfPayments
      } : undefined,
      payments: [{
        id: 0,
        customer_id: 0,
        total_amount: paymentAmount,
        payment_status: formData.paymentStatus || 'ממתין לתשלום',
        start_date: showPaymentPlan ? paymentPlan.firstPaymentDate : formData.startDate,
        installments: showPaymentPlan ? paymentPlan.numberOfPayments : 1,
        installment_amount: showPaymentPlan ? (paymentAmount / paymentPlan.numberOfPayments) : paymentAmount,
        payment_type: formData.paymentType || 'amount',
        payment_value: formData.paymentValue || 0,
        vat_included: formData.paymentVatIncluded || false,
        notes: `תשלום עבור: ${formData.products?.join(', ') || 'שירות'}`
      }]
    };

    // Create customer first
    onSubmit(finalData as unknown as Omit<Customer, 'id'>);

    // Add reminder if configured - will be handled after customer creation
    if (showReminder && reminderData.title && reminderData.reminderDate) {
      // Store reminder data for later use
      sessionStorage.setItem('pendingReminder', JSON.stringify({
        customerName: formData.name || '',
        title: reminderData.title,
        description: reminderData.description,
        reminderDate: reminderData.reminderDate,
        reminderTime: reminderData.reminderTime,
        advanceNotice: reminderData.advanceNotice
      }));
    }
  };

  // Calculate display amounts based on payment value
  const paymentValue = formData.paymentValue || 0;
  let vatAmount: number;
  let totalWithVat: number;

  if (formData.paymentType === 'amount') {
    // For amount payment, use the payment value as base
    const baseAmount = paymentValue;
    if (formData.vatType === 'plus') {
      // VAT is added on top
      vatAmount = baseAmount * VAT_RATE;
      totalWithVat = baseAmount + vatAmount;
    } else {
      // Amount includes VAT - calculate VAT portion from total
      totalWithVat = baseAmount;
      vatAmount = baseAmount * (VAT_RATE / (1 + VAT_RATE));
    }
  } else {
    // For percentage payment, we need a base amount to calculate from
    // For now, we'll use a default value or the payment value as base
    const baseAmount = paymentValue || 1000; // Default base amount for percentage calculation
    if (formData.paymentVatIncluded) {
      // Amount includes VAT
      totalWithVat = baseAmount;
      vatAmount = baseAmount * (VAT_RATE / (1 + VAT_RATE));
    } else {
      // VAT is added on top
      vatAmount = baseAmount * VAT_RATE;
      totalWithVat = baseAmount + vatAmount;
    }
  }

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
              className="relative w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-500" />
                  הקמת לקוח חדש
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* הודעת הסבר */}
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      שדות חובה ליצירת לקוח
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      יש למלא את כל השדות המסומנים ב-<span className="text-red-500 font-bold">*</span> כדי להקים לקוח חדש:
                      פרטים בסיסיים, פרטי עסקה ופריסת תשלומים (במידה ונבחרה).
                      הוספת תזכורות ופרטים נוספים היא אופציונלית.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* בחירת ליד */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setShowLeadSelector(!showLeadSelector)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedLead ? `ליד נבחר: ${selectedLead.name}` : 'בחר ליד'}
                    </span>
                    {showLeadSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                        {filteredEligibleLeads.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto">
                            {filteredEligibleLeads.map(lead => (
                              <button
                                key={lead.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowLeadSelector(false);
                                }}
                                className="w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</div>
                                </div>
                                {selectedLead?.id === lead.id && (
                                  <Check className="w-5 h-5 text-green-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            אין לידים זמינים ליצירת לקוח
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {/* פרטים בסיסיים */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        פרטים בסיסיים <span className="text-red-500">*</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שם מלא <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            טלפון <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            required
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            דוא"ל <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            סטטוס
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as Customer['status'] })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          >
                            {getAvailableCustomerStatuses().map(status => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* פרטים נוספים */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-500" />
                        פרטים נוספים
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            כתובת
                          </label>
                          <input
                            type="text"
                            value={formData.address || ''}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שם חברה
                          </label>
                          <input
                            type="text"
                            value={formData.company || ''}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ח.פ / עוסק מורשה
                          </label>
                          <input
                            type="text"
                            value={formData.vatNumber || ''}
                            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שיוך נציג
                          </label>
                          <input
                            type="text"
                            value={formData.assignedTo || ''}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* פרטי עסקה */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        פרטי עסקה <span className="text-red-500">*</span>
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שירותים / מוצרים שנרכשו <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={formData.products?.join('\n')}
                            onChange={(e) => setFormData({ ...formData, products: e.target.value.split('\n').filter(p => p.trim()) })}
                            rows={3}
                            placeholder="רשום כל שירות/מוצר בשורה נפרדת"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            required
                          />
                        </div>

                        {/* תשלום לפי */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            תשלום לפי
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                סוג תשלום
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, paymentType: 'amount', paymentValue: 0 })}
                                  className={`p-3 rounded-lg border-2 transition-colors ${
                                    formData.paymentType === 'amount'
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="font-medium">סכום</div>
                                    <div className="text-sm opacity-75">תשלום לפי סכום קבוע</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, paymentType: 'percentage', paymentValue: 0 })}
                                  className={`p-3 rounded-lg border-2 transition-colors ${
                                    formData.paymentType === 'percentage'
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="font-medium">אחוזים</div>
                                    <div className="text-sm opacity-75">תשלום לפי אחוז מהעסקה</div>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {formData.paymentType === 'amount' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    סכום תשלום
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={formData.paymentValue || ''}
                                      onChange={(e) => setFormData({ ...formData, paymentValue: parseFloat(e.target.value) })}
                                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-3 pr-8 py-2"
                                      min="0"
                                      step="0.01"
                                    />
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                      ₪
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    סוג מע"מ
                                  </label>
                                  <select
                                    value={formData.vatType}
                                    onChange={(e) => setFormData({ ...formData, vatType: e.target.value as 'plus' | 'included' })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                  >
                                    <option value="plus">+ מע"מ</option>
                                    <option value="included">כולל מע"מ</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {formData.paymentType === 'percentage' && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      אחוז תשלום
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={formData.paymentValue || ''}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value);
                                          if (value >= 1 && value <= 100) {
                                            setFormData({ ...formData, paymentValue: value });
                                          } else if (e.target.value === '') {
                                            setFormData({ ...formData, paymentValue: 0 });
                                          }
                                        }}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-3 pr-8 py-2"
                                        min="1"
                                        max="100"
                                        step="1"
                                        placeholder="1-100"
                                      />
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                        %
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      סכום (אופציונלי)
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={formData.totalAmount || ''}
                                        onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-3 pr-8 py-2"
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                      />
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                        ₪
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    חישוב מע"מ
                                  </label>
                                  <div className="space-y-2">
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="paymentVatIncluded"
                                        checked={!formData.paymentVatIncluded}
                                        onChange={() => setFormData({ ...formData, paymentVatIncluded: false })}
                                        className="mr-2"
                                      />
                                      <span className="text-sm">לא כולל מע"מ</span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="paymentVatIncluded"
                                        checked={formData.paymentVatIncluded}
                                        onChange={() => setFormData({ ...formData, paymentVatIncluded: true })}
                                        className="mr-2"
                                      />
                                      <span className="text-sm">כולל מע"מ</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* הצגת חישוב התשלום - רק לסכום */}
                            {formData.paymentType === 'amount' && formData.paymentValue && formData.paymentValue > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">חישוב תשלום:</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">סכום תשלום:</span>
                                    <span className="font-medium">₪{formData.paymentValue.toFixed(2)}</span>
                                  </div>
                                  {formData.vatType === 'plus' && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-300">+ מע"מ (18%):</span>
                                      <span className="font-medium">₪{(formData.paymentValue * 0.18).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                                    <span className="text-gray-700 dark:text-gray-200">סה"כ לתשלום:</span>
                                    <span>₪{formData.vatType === 'plus' ? (formData.paymentValue * 1.18).toFixed(2) : formData.paymentValue.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* הצגת חישוב התשלום - לאחוזים */}
                            {formData.paymentType === 'percentage' && formData.paymentValue && formData.paymentValue > 0 && formData.totalAmount && formData.totalAmount > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">חישוב תשלום לפי אחוזים:</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">סכום העסקה:</span>
                                    <span className="font-medium">₪{formData.totalAmount.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">אחוז תשלום:</span>
                                    <span className="font-medium">{formData.paymentValue}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">סכום תשלום:</span>
                                    <span className="font-medium">₪{((formData.totalAmount * formData.paymentValue) / 100).toFixed(2)}</span>
                                  </div>
                                  {!formData.paymentVatIncluded && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-300">+ מע"מ (18%):</span>
                                      <span className="font-medium">₪{(((formData.totalAmount * formData.paymentValue) / 100) * 0.18).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold pt-2 border-t border-green-200 dark:border-green-800">
                                    <span className="text-gray-700 dark:text-gray-200">סה"כ לתשלום:</span>
                                    <span>₪{formData.paymentVatIncluded 
                                      ? ((formData.totalAmount * formData.paymentValue) / 100).toFixed(2)
                                      : (((formData.totalAmount * formData.paymentValue) / 100) * 1.18).toFixed(2)
                                    }</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              תדירות חיוב <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.billingFrequency}
                              onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as 'חד פעמי' | 'חודשי' })}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                              required
                            >
                              <option value="חד פעמי">חד פעמי</option>
                              <option value="חודשי">חודשי</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              תאריך תחילת עבודה <span className="text-red-500">*</span>
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
                              סטטוס תשלום <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.paymentStatus}
                              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                              required
                            >
                              {getAvailablePaymentStatuses().map(status => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* פריסת תשלומים */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <button
                        type="button"
                        onClick={() => setShowPaymentPlan(!showPaymentPlan)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 dark:text-white mb-4"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                          פריסת תשלומים
                        </div>
                        {showPaymentPlan ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <AnimatePresence>
                        {showPaymentPlan && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  מספר תשלומים
                                </label>
                                <select
                                  value={paymentPlan.numberOfPayments}
                                  onChange={(e) => setPaymentPlan({ ...paymentPlan, numberOfPayments: parseInt(e.target.value) })}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                >
                                  {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num} תשלומים</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  תאריך תשלום ראשון
                                </label>
                                <input
                                  type="date"
                                  value={paymentPlan.firstPaymentDate}
                                  onChange={(e) => setPaymentPlan({ ...paymentPlan, firstPaymentDate: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                />
                              </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Calculator className="w-5 h-5 text-blue-500" />
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  פירוט תשלומים
                                </h4>
                              </div>
                              <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-300">
                                  סכום כולל: ₪{totalWithVat.toFixed(2)}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  תשלום חודשי: ₪{paymentPlan.monthlyAmount.toFixed(2)}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  מספר תשלומים: {paymentPlan.numberOfPayments}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* הערות */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        הערות
                      </label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      />
                    </div>

                    {/* תזכורות */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <button
                        type="button"
                        onClick={() => setShowReminder(!showReminder)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 dark:text-white mb-4"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-blue-500" />
                          הוספת תזכורת
                        </div>
                        {showReminder ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <AnimatePresence>
                        {showReminder && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                כותרת התזכורת
                              </label>
                              <input
                                type="text"
                                value={reminderData.title}
                                onChange={(e) => setReminderData({ ...reminderData, title: e.target.value })}
                                placeholder="לדוגמה: מעקב אחרי הלקוח"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                תיאור (אופציונלי)
                              </label>
                              <textarea
                                value={reminderData.description}
                                onChange={(e) => setReminderData({ ...reminderData, description: e.target.value })}
                                rows={2}
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
                                  value={reminderData.reminderDate}
                                  onChange={(e) => setReminderData({ ...reminderData, reminderDate: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  שעת התזכורת
                                </label>
                                <input
                                  type="time"
                                  value={reminderData.reminderTime}
                                  onChange={(e) => setReminderData({ ...reminderData, reminderTime: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                התראה מוקדמת
                              </label>
                              <select
                                value={reminderData.advanceNotice}
                                onChange={(e) => setReminderData({ ...reminderData, advanceNotice: parseInt(e.target.value) })}
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
                                <option value={10080}>שבוע לפני</option>
                              </select>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                  תקבל התראה ב-{reminderData.reminderDate && new Date(reminderData.reminderDate).toLocaleDateString('he-IL')} בשעה {reminderData.reminderTime}
                                </span>
                              </div>
                              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                התראה מוקדמת: {reminderData.advanceNotice >= 1440 ? `${Math.floor(reminderData.advanceNotice / 1440)} יום/ים` : 
                                reminderData.advanceNotice >= 60 ? `${Math.floor(reminderData.advanceNotice / 60)} שעות` : 
                                `${reminderData.advanceNotice} דקות`} לפני
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
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
                    צור לקוח
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

export default CreateCustomerDialog;