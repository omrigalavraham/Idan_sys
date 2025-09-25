import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  PhoneCall,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Target,
  Activity,
  Info,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useReportsStore } from '../store/reportsStore';
import useAuthStore from '../store/authStore';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

const Reports = () => {
  const { 
    reportsData, 
    isLoading, 
    error, 
    fetchReportsData, 
    clearError 
  } = useReportsStore();
  const { user } = useAuthStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load reports data on component mount and when period changes
  useEffect(() => {
    fetchReportsData(selectedPeriod);
  }, [selectedPeriod, fetchReportsData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReportsData(selectedPeriod);
    setIsRefreshing(false);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    clearError();
  };

  // Prepare data for status distribution chart
  const statusData = {
    labels: reportsData?.charts.statusDistribution.map(item => item.status) || [],
    datasets: [
      {
        data: reportsData?.charts.statusDistribution.map(item => item.count) || [],
        backgroundColor: [
          '#3b82f6', // Blue
          '#10b981', // Green
          '#6366f1', // Indigo
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#06b6d4', // Cyan
          '#84cc16', // Lime
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Prepare data for leads by source
  const sourceData = {
    labels: reportsData?.charts.sourceDistribution.map(item => item.source) || [],
    datasets: [
      {
        label: 'לידים לפי מקור',
        data: reportsData?.charts.sourceDistribution.map(item => item.count) || [],
        backgroundColor: [
          '#3b82f6', // Blue
          '#10b981', // Green
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#06b6d4', // Cyan
          '#84cc16', // Lime
          '#f97316', // Orange
        ],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Prepare data for payment status distribution
  const paymentStatusData = {
    labels: reportsData?.charts.paymentStatusDistribution.map(item => item.payment_status) || [],
    datasets: [
      {
        label: 'סכום (₪)',
        data: reportsData?.charts.paymentStatusDistribution.map(item => item.total_amount) || [],
        backgroundColor: [
          '#10b981', // Green for שולם
          '#f59e0b', // Amber for תשלום חלקי
          '#ef4444', // Red for ממתין לתשלום
          '#3b82f6', // Blue for others
        ],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Prepare data for recent activity
  const activityData = {
    labels: reportsData?.charts.recentActivity.map(item => 
      format(parseISO(item.date), 'dd/MM', { locale: he })
    ) || [],
    datasets: [
      {
        label: 'לידים חדשים',
        data: reportsData?.charts.recentActivity.map(item => item.leads_count) || [],
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };


  const stats = reportsData ? [
    {
      title: 'סה״כ לידים',
      value: reportsData.summary.totalLeads.toLocaleString(),
      change: `${reportsData.summary.weekGrowth >= 0 ? '+' : ''}${reportsData.summary.weekGrowth.toFixed(1)}%`,
      positive: reportsData.summary.weekGrowth >= 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'לידים חדשים השבוע',
      value: reportsData.summary.newLeadsThisWeek.toLocaleString(),
      change: `${reportsData.summary.weekGrowth >= 0 ? '+' : ''}${reportsData.summary.weekGrowth.toFixed(1)}%`,
      positive: reportsData.summary.weekGrowth >= 0,
      icon: PhoneCall,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'לידים שהומרו',
      value: reportsData.summary.convertedLeads.toLocaleString(),
      change: `${reportsData.summary.conversionRate.toFixed(1)}% המרה`,
      positive: true,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'פוטנציאל כולל',
      value: `₪${reportsData.summary.totalPotentialValue.toLocaleString()}`,
      change: `${reportsData.summary.totalCustomers} לקוחות`,
      positive: true,
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ] : [];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            שגיאה בטעינת הדוחות
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
              דוחות וניתוח נתונים
            </h1>
            <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400">
              סקירה מקיפה של ביצועי המערכת
            </p>
          </div>
        </div>
        
        {/* User info - Mobile optimized */}
        <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs md:text-sm text-blue-800 dark:text-blue-300 font-medium">
            דוחות אישיים: מוצגים נתונים של {user?.name || 'המשתמש הנוכחי'} בלבד
          </span>
        </div>
        
        {/* Controls - Mobile Layout */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm md:text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">7 ימים אחרונים</option>
            <option value="30">30 ימים אחרונים</option>
            <option value="90">90 ימים אחרונים</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 md:py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">רענן</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">טוען נתונים...</p>
          </div>
        </div>
      )}

      {/* Stats Grid - Mobile Optimized */}
      {!isLoading && reportsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
                <span className={`text-xs md:text-sm font-semibold flex items-center gap-1 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" /> : <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4" />}
                  {stat.change}
                </span>
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                {stat.value}
              </h2>
              <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 font-medium">
                {stat.title}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid - Mobile Optimized */}
      {!isLoading && reportsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Status Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                התפלגות סטטוסים
              </h3>
            </div>
            <div className="h-64 md:h-80">
              <Doughnut
                data={statusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                          size: window.innerWidth < 768 ? 12 : 14,
                          weight: 'bold'
                        }
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                      }
                    }
                  },
                }}
              />
            </div>
          </div>

          {/* Leads by Source */}
          <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                לידים לפי מקור
              </h3>
            </div>
            <div className="h-64 md:h-80">
              <Bar
                data={sourceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.parsed.y} לידים`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        font: {
                          size: window.innerWidth < 768 ? 10 : 12
                        }
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        font: {
                          size: window.innerWidth < 768 ? 10 : 12
                        }
                      },
                      grid: {
                        display: false
                      }
                    }
                  },
                }}
              />
            </div>
          </div>

          {/* Payment Status Distribution */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                כסף ששולם לפי סטטוסים
              </h3>
            </div>
            <div className="h-80">
              <Bar
                data={paymentStatusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ₪${context.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₪${value.toLocaleString()}`,
                        font: {
                          size: 12
                        }
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        font: {
                          size: 12
                        }
                      },
                      grid: {
                        display: false
                      }
                    }
                },
              }}
            />
          </div>
        </div>

          {/* Recent Activity */}
        <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                פעילות אחרונה
          </h3>
            </div>
            <div className="h-80">
              <Bar
                data={activityData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.parsed.y} לידים חדשים`
                      }
                    }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                          size: 12
                        }
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        font: {
                          size: 12
                        }
                      },
                      grid: {
                        display: false
                      }
                    }
                  },
                }}
              />
            </div>
          </div>

      </div>
      )}
    </div>
  );
};

export default Reports;