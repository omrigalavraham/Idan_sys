import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, MessageCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { Lead } from '../../types';

interface LeadAnalysisProps {
  lead: Lead;
}

const LeadAnalysis: React.FC<LeadAnalysisProps> = ({ lead }) => {
  const { analysis, isLoading } = useAI(lead);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center p-4 md:p-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="ml-2"
          >
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
          </motion.div>
          <span className="text-sm md:text-base text-gray-600 dark:text-gray-300">
            מנתח את הליד...
          </span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 md:p-6">
        <div className="flex items-center justify-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          <span className="text-sm md:text-base text-center">
            לא ניתן לטעון את הניתוח כרגע
          </span>
        </div>
      </div>
    );
  }

  const sentimentColors = {
    positive: 'text-green-500 dark:text-green-400',
    negative: 'text-red-500 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400'
  };

  const sentimentText = {
    positive: 'חיובי',
    negative: 'שלילי', 
    neutral: 'נייטרלי'
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* Header - Always Visible */}
      <div 
        className="p-4 md:p-6 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                ניתוח AI
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                לחץ לפרטים נוספים
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">ציון:</span>
                <span className={`text-sm md:text-lg font-bold ${
                  analysis.potentialScore >= 70 ? 'text-green-500 dark:text-green-400' :
                  analysis.potentialScore >= 40 ? 'text-yellow-500 dark:text-yellow-400' : 
                  'text-red-500 dark:text-red-400'
                }`}>
                  {analysis.potentialScore}%
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-2 mt-1">
                <MessageCircle className={`w-3 h-3 md:w-4 md:h-4 ${sentimentColors[analysis.sentiment]}`} />
                <span className={`text-xs md:text-sm font-medium ${sentimentColors[analysis.sentiment]}`}>
                  {sentimentText[analysis.sentiment]}
                </span>
              </div>
            </div>
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800"
          >
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              
              {/* Classification & Next Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      סיווג
                    </p>
                    <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                      {analysis.classification}
                    </p>
                  </div>
                </div>

                {analysis.nextStatus && (
                  <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-purple-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                        סטטוס מומלץ הבא
                      </p>
                      <p className="text-sm md:text-base font-semibold text-purple-700 dark:text-purple-300 truncate">
                        {analysis.nextStatus}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommended Actions */}
              {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                  <h4 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">
                    פעולות מומלצות
                  </h4>
                  <ul className="space-y-2 md:space-y-3">
                    {analysis.recommendedActions.map((action, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2 md:gap-3 text-sm md:text-base text-gray-700 dark:text-gray-300"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5 md:mt-2" />
                        <span className="leading-relaxed">{action}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Additional Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-4 md:p-5">
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center">
                  הניתוח מבוסס על נתוני הליד והיסטוריית הפעילות
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadAnalysis;