import { Lead } from '../types';

export interface LeadAnalytics {
  totalLeads: number;
  newLeadsCount: number;
  convertedLeadsCount: number;
  averageConversionTime: number;
  conversionRate: number;
  sourceDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  timeToFirstContact: number;
  averageFollowUps: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async analyzeLeads(leads: Lead[], startDate?: Date, endDate?: Date): Promise<LeadAnalytics> {
    let filteredLeads = [...leads];

    if (startDate) {
      filteredLeads = filteredLeads.filter(lead => 
        new Date(lead.createdAt) >= startDate
      );
    }

    if (endDate) {
      filteredLeads = filteredLeads.filter(lead => 
        new Date(lead.createdAt) <= endDate
      );
    }

    const newLeads = filteredLeads.filter(lead => 
      new Date(lead.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const convertedLeads = filteredLeads.filter(lead => 
      lead.status === 'עסקה נסגרה'
    );

    const conversionTimes = convertedLeads.map(lead => {
      const createdAt = new Date(lead.createdAt);
      const convertedAt = new Date(lead.updatedAt);
      return convertedAt.getTime() - createdAt.getTime();
    });

    const sourceDistribution = filteredLeads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = filteredLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLeads: filteredLeads.length,
      newLeadsCount: newLeads.length,
      convertedLeadsCount: convertedLeads.length,
      averageConversionTime: conversionTimes.length ? 
        conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length : 0,
      conversionRate: filteredLeads.length ? 
        (convertedLeads.length / filteredLeads.length) * 100 : 0,
      sourceDistribution,
      statusDistribution,
      timeToFirstContact: this.calculateAverageTimeToFirstContact(filteredLeads),
      averageFollowUps: this.calculateAverageFollowUps(filteredLeads)
    };
  }

  private calculateAverageTimeToFirstContact(leads: Lead[]): number {
    const times = leads
      .filter(lead => lead.lastContact)
      .map(lead => {
        const createdAt = new Date(lead.createdAt);
        const firstContact = new Date(lead.lastContact);
        return firstContact.getTime() - createdAt.getTime();
      });

    return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateAverageFollowUps(leads: Lead[]): number {
    const followUps = leads.map(lead => lead.history?.length || 0);
    return followUps.length ? followUps.reduce((a, b) => a + b, 0) / followUps.length : 0;
  }

  async generateReport(analytics: LeadAnalytics): Promise<string> {
    const report = {
      generatedAt: new Date().toISOString(),
      data: analytics,
      summary: {
        performance: analytics.conversionRate > 20 ? 'מצוין' : 
                    analytics.conversionRate > 10 ? 'טוב' : 'דורש שיפור',
        recommendations: this.generateRecommendations(analytics)
      }
    };

    return JSON.stringify(report, null, 2);
  }

  private generateRecommendations(analytics: LeadAnalytics): string[] {
    const recommendations: string[] = [];

    if (analytics.conversionRate < 10) {
      recommendations.push('שיפור תהליך המכירה נדרש - שקול הדרכת צוות');
    }

    if (analytics.timeToFirstContact > 24 * 60 * 60 * 1000) {
      recommendations.push('זמן תגובה ללידים ארוך מדי - נדרש שיפור במהירות התגובה');
    }

    if (analytics.averageFollowUps < 2) {
      recommendations.push('מספר המעקבים נמוך - הגבר תדירות המעקב');
    }

    return recommendations;
  }
}

export const analyticsService = AnalyticsService.getInstance();