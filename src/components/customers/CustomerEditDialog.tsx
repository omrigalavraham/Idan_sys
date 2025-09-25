import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Building2, 
  Package,
  CreditCard, Calculator
} from 'lucide-react';
import { Customer } from '../../types';
import { useClientStore } from '../../store/clientStore';
import toast from 'react-hot-toast';

interface CustomerEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (customer: Customer) => void;
}

const CustomerEditDialog: React.FC<CustomerEditDialogProps> = ({
  isOpen,
  onClose,
  customer,
  onSave
}) => {
  const { currentClient } = useClientStore();
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    vatNumber: '',
    assignedTo: '',
    status: 'פעיל',
    notes: '',
    products: [],
    totalAmount: 0,
    billingFrequency: 'חד פעמי',
    startDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'ממתין לתשלום',
    vatType: 'plus',
    paymentType: 'amount',
    paymentValue: 0,
    paymentVatIncluded: false,
    payments: [{
      id: 0,
      customer_id: 0,
      total_amount: 0,
      payment_status: 'ממתין לתשלום',
      start_date: new Date(),
      installments: 1,
      installment_amount: 0,
      notes: ''
    }]
  });

    useEffect(() => {
      if (customer) {
      
      // Extract services as products - prioritize from services table, then from payments notes
      let products = customer.services?.map(service => service.service_name) || customer.products || [];
      
      // If no services found, try to extract from payments notes
      if (products.length === 0 && customer.payments && customer.payments.length > 0) {
        const paymentNotes = customer.payments[0]?.notes || '';
        if (paymentNotes.includes('תשלום עבור:')) {
          const servicePart = paymentNotes.split('תשלום עבור:')[1]?.trim();
          if (servicePart) {
            products = [servicePart];
          }
        }
      }
      
      // Get payment data from payments array or use customer data
      const paymentData = customer.payments?.[0];
      const totalAmount = paymentData?.total_amount || customer.totalAmount || 0;
      
      // For amount payment type, use the total amount as payment value
      // For percentage payment type, use the stored percentage from customer table
      let paymentValue = 0;
      if (customer.paymentType === 'amount' || customer.payment_type === 'amount') {
        paymentValue = Number(totalAmount) || 0;
      } else {
        // For percentage, use the value from customer table
        paymentValue = Number(customer.payment_value || customer.paymentValue || 0);
      }
      
      setFormData({
        name: customer.name || customer.full_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        company: customer.company || customer.company_name || '',
        vatNumber: customer.vatNumber || customer.vat_number || '',
        assignedTo: customer.assignedTo || customer.assigned_rep || '',
        status: customer.status || 'פעיל',
        notes: customer.notes || '',
        products: products,
        totalAmount: totalAmount,
        billingFrequency: customer.billingFrequency || customer.billing_frequency || 'חד פעמי',
        startDate: customer.start_date || customer.startDate || new Date().toISOString().split('T')[0],
        paymentStatus: customer.paymentStatus || customer.payment_status || 'ממתין לתשלום',
        vatType: customer.vatType || customer.vat_type || 'plus',
        paymentType: (customer.paymentType || customer.payment_type || 'amount') as 'amount' | 'percentage',
        paymentValue: paymentValue,
        paymentVatIncluded: customer.paymentVatIncluded || customer.payment_vat_included || false,
        payments: customer.payments || [{
          id: 0,
          customer_id: 0,
          total_amount: totalAmount,
          payment_status: customer.paymentStatus || customer.payment_status || 'ממתין לתשלום',
          start_date: customer.startDate || customer.start_date ? new Date(customer.startDate || customer.start_date || new Date()) : new Date(),
          installments: paymentData?.installments || 1,
          installment_amount: paymentData?.installment_amount || totalAmount,
          notes: paymentData?.notes || ''
        }]
      });
      
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error('נא למלא את כל שדות החובה');
      return;
    }


    // Transform the form data to match the expected API format
    const customerData = {
      ...formData,
      id: customer?.id, // Ensure the customer ID is included
      payments: formData.payments?.map(payment => ({
        ...payment,
        total_amount: payment.total_amount || totalWithVat,
        payment_status: payment.payment_status || formData.paymentStatus,
        start_date: payment.start_date || (formData.startDate ? new Date(formData.startDate) : new Date()),
        installments: payment.installments || 1,
        installment_amount: payment.installment_amount || (totalWithVat / (payment.installments || 1)),
        notes: payment.notes || `תשלום עבור: ${formData.products?.join(', ') || 'שירות'}`
      }))
    };

    onSave(customerData as Customer);
  };

  // Calculate VAT amounts based on payment type
  const VAT_RATE = 0.18; // 18% VAT
  let baseAmount: number;
  let vatAmount: number;
  let totalWithVat: number;

  if (formData.paymentType === 'amount') {
    baseAmount = Number(formData.paymentValue) || 0;
    if (formData.vatType === 'plus') {
      vatAmount = baseAmount * VAT_RATE;
      totalWithVat = baseAmount + vatAmount;
    } else {
      totalWithVat = baseAmount;
      vatAmount = baseAmount * (VAT_RATE / (1 + VAT_RATE));
    }
  } else {
    // For percentage payments, we need to calculate the actual amount
    // The paymentValue is the percentage, so we need a base amount
    // For now, we'll use the totalAmount as the base, but this should be configurable
    const baseAmountForPercentage = Number(formData.totalAmount) || 0;
    baseAmount = baseAmountForPercentage * ((Number(formData.paymentValue) || 0) / 100);
    if (formData.vatType === 'plus') {
      vatAmount = baseAmount * VAT_RATE;
      totalWithVat = baseAmount + vatAmount;
    } else {
      totalWithVat = baseAmount;
      vatAmount = baseAmount * (VAT_RATE / (1 + VAT_RATE));
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
              className="relative w-full max-w-5xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-500" />
                  עריכת לקוח
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {/* פרטים בסיסיים */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        פרטים בסיסיים
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שם מלא
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
                            טלפון
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
                            דוא"ל
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
                            <option value="פעיל">פעיל</option>
                            <option value="ממתין להתחלה">ממתין להתחלה</option>
                            <option value="לקוח VIP">לקוח VIP</option>
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
                        פרטי עסקה
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            שירותים / מוצרים שנרכשו
                          </label>
                          <textarea
                            value={formData.products?.join('\n') || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              products: e.target.value.split('\n').filter(p => p.trim()) 
                            })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            placeholder="הזן שירותים/מוצרים (כל אחד בשורה נפרדת)"
                          />
                        </div>

                        {/* תשלום לפי */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            תשלום לפי
                          </label>
                          <div className="flex gap-2 mb-4">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, paymentType: 'amount', paymentValue: 0 })}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                formData.paymentType === 'amount'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              סכום
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, paymentType: 'percentage', paymentValue: 0 })}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                formData.paymentType === 'percentage'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              אחוזים
                            </button>
                          </div>

                          {/* שדות לפי סוג התשלום */}
                          {formData.paymentType === 'amount' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    סכום תשלום
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={formData.paymentValue || ''}
                                      onChange={(e) => setFormData({ ...formData, paymentValue: parseFloat(e.target.value) || 0 })}
                                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-3 pr-8 py-2"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  חישוב מע"מ
                                </label>
                                <div className="flex gap-4">
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name="paymentVatIncluded"
                                      checked={!formData.paymentVatIncluded}
                                      onChange={() => setFormData({ ...formData, paymentVatIncluded: false })}
                                      className="mr-2"
                                    />
                                    לא כולל מע"מ
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name="paymentVatIncluded"
                                      checked={formData.paymentVatIncluded}
                                      onChange={() => setFormData({ ...formData, paymentVatIncluded: true })}
                                      className="mr-2"
                                    />
                                    כולל מע"מ
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* הצגת חישוב התשלום - רק לסכום */}
                          {formData.paymentType === 'amount' && formData.paymentValue && Number(formData.paymentValue) > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">חישוב תשלום:</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-300">סכום תשלום:</span>
                                  <span className="font-medium">₪{Number(formData.paymentValue).toFixed(2)}</span>
                                </div>
                                {formData.vatType === 'plus' && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">+ מע"מ (18%):</span>
                                    <span className="font-medium">₪{(Number(formData.paymentValue) * 0.18).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                                  <span className="text-gray-700 dark:text-gray-200">סה"כ לתשלום:</span>
                                  <span>₪{formData.vatType === 'plus' ? (Number(formData.paymentValue) * 1.18).toFixed(2) : Number(formData.paymentValue).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              תדירות חיוב
                            </label>
                            <select
                              value={formData.billingFrequency}
                              onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as 'חד פעמי' | 'חודשי' })}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            >
                              <option value="חד פעמי">חד פעמי</option>
                              <option value="חודשי">חודשי</option>
                              <option value="רבעוני">רבעוני</option>
                              <option value="שנתי">שנתי</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              תאריך תחילת עבודה
                            </label>
                            <input
                              type="date"
                              value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              סטטוס תשלום
                            </label>
                            <select
                              value={formData.paymentStatus}
                              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'ממתין לתשלום' | 'שולם' | 'בוטל' })}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                            >
                              {currentClient?.paymentStatuses?.map(status => (
                                <option key={status.id} value={status.name}>
                                  {status.icon} {status.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* פריסת תשלומים */}
                    {((formData.payments && formData.payments.length > 0) || (formData.totalAmount && formData.totalAmount > 0)) && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                          פריסת תשלומים
                        </h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                מספר תשלומים
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={formData.payments?.[0]?.installments || 1}
                                onChange={(e) => {
                                  const newInstallments = parseInt(e.target.value) || 1;
                                  setFormData({ 
                                    ...formData, 
                                    payments: [{
                                      id: formData.payments?.[0]?.id || 0,
                                      customer_id: formData.payments?.[0]?.customer_id || 0,
                                      total_amount: formData.payments?.[0]?.total_amount || (totalWithVat || 0),
                                      payment_status: formData.payments?.[0]?.payment_status || formData.paymentStatus || 'ממתין לתשלום',
                                      start_date: formData.payments?.[0]?.start_date || (formData.startDate ? new Date(formData.startDate) : new Date()),
                                      installments: newInstallments,
                                      installment_amount: totalWithVat / newInstallments,
                                      notes: formData.payments?.[0]?.notes || ''
                                    }]
                                  });
                                }}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                תאריך תשלום ראשון
                              </label>
                              <input
                                type="date"
                                value={formData.payments?.[0]?.start_date ? new Date(formData.payments[0].start_date).toISOString().split('T')[0] : (formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : '')}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  payments: [{
                                    id: formData.payments?.[0]?.id || 0,
                                    customer_id: formData.payments?.[0]?.customer_id || 0,
                                    total_amount: formData.payments?.[0]?.total_amount || (totalWithVat || 0),
                                    payment_status: formData.payments?.[0]?.payment_status || formData.paymentStatus || 'ממתין לתשלום',
                                    start_date: new Date(e.target.value),
                                    installments: formData.payments?.[0]?.installments || 1,
                                    installment_amount: formData.payments?.[0]?.installment_amount || totalWithVat,
                                    notes: formData.payments?.[0]?.notes || ''
                                  }]
                                })}
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
                                תשלום חודשי: ₪{((formData.payments?.[0]?.installments || 1) > 0 ? totalWithVat / (formData.payments?.[0]?.installments || 1) : totalWithVat).toFixed(2)}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                מספר תשלומים: {formData.payments?.[0]?.installments || 1}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                    שמור שינויים
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

export default CustomerEditDialog;