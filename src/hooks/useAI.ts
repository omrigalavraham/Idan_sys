import { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { Lead } from '../types';

interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  classification: string;
  potentialScore: number;
  recommendedActions: string[];
  nextStatus: string | null;
}

export const useAI = (lead: Lead) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLeadAnalysis = async (lead: Lead): Promise<AnalysisResult> => {
    try {
      await aiService.initialize();
      const result = await aiService.analyzeLead(lead);
      const nextStatus = await aiService.predictNextStatus(lead);
      return {
        sentiment: result.sentiment as 'positive' | 'negative' | 'neutral',
        classification: result.classification,
        potentialScore: result.potentialScore,
        recommendedActions: result.recommendedActions,
        nextStatus
      };
    } catch (error) {
      console.error('Error analyzing lead:', error);
      throw error;
    }
  };

  useEffect(() => {
    const analyzeLead = async () => {
      try {
        setIsLoading(true);
        const result = await getLeadAnalysis(lead);
        setAnalysis(result);
      } catch (error) {
        console.error('Error in useAI hook:', error);
        setAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeLead();
  }, [lead]);

  return {
    analysis,
    isLoading,
    getLeadAnalysis
  };
};