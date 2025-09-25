export class AIService {
  private positiveWords = new Set([
    // ביטויי עניין והסכמה
    'מעוניין', 'מצוין', 'טוב', 'נהדר', 'מעולה', 'בסדר', 'מסכים', 'אשמח',
    'מתעניין', 'רוצה', 'בעד', 'מתאים', 'מוכן', 'מתלהב', 'מרוצה',
    'נשמע טוב', 'מעניין אותי', 'אהבתי', 'מתאים לי', 'נראה מעולה',
    'אפשר', 'בשמחה', 'מעדיף', 'מחכה', 'מצפה', 'מתרגש',
    
    // ביטויי דחיפות
    'בהקדם', 'מהר', 'דחוף', 'מיידי', 'עכשיו', 'היום', 'מחר',
    
    // ביטויי התקדמות
    'להתקדם', 'להתחיל', 'לסגור', 'לחתום', 'להמשיך', 'להצטרף',
    
    // ביטויי שביעות רצון
    'מרוצה', 'מוצא חן', 'אוהב את זה', 'נראה לי טוב', 'מתלהב',
    
    // ביטויי נכונות לתשלום
    'מוכן לשלם', 'אשלם', 'התקציב מתאים', 'המחיר בסדר', 'משתלם',
    
    // ביטויי אמון
    'סומך עליכם', 'מאמין', 'בטוח בכם', 'יש לכם ניסיון', 'מקצועי'
  ]);

  private negativeWords = new Set([
    // ביטויי דחייה
    'לא', 'יקר', 'בעיה', 'קשה', 'מסובך', 'מוותר', 'עזוב', 'יקר מדי',
    'מתנגד', 'נגד', 'אין', 'בלי', 'מסרב', 'דוחה', 'מתקשה', 'נפנף',
    
    // ביטויי חוסר עניין
    'לא מעוניין', 'לא צריך', 'לא רוצה', 'לא בא בחשבון', 'לא מתאים',
    'לא היה רציני', 'לא היה כל כך רציני',
    
    // ביטויי תקציב
    'אין תקציב', 'יקר מדי', 'לא יכול להרשות', 'מחיר גבוה', 'לא משתלם',
    
    // ביטויי חשש
    'חושש', 'מפחד', 'לא בטוח', 'מודאג', 'מהסס', 'צריך לחשוב',
    
    // ביטויי דחייה בזמן
    'לא עכשיו', 'אולי בעתיד', 'בהמשך', 'נדבר בעוד כמה חודשים',
    'נדבר בעוד שבועיים', 'תתקשר בעוד שבוע', 'תחזור אלי עוד חודש',
    
    // ביטויי חוסר אמון
    'לא מאמין', 'לא סומך', 'צריך לבדוק', 'נשמע חשוד', 'לא משכנע'
  ]);

  private hesitationWords = new Set([
    // ביטויי היסוס בסיסיים
    'אולי', 'אחשוב', 'נראה', 'יכול להיות', 'אבדוק', 'צריך לבדוק',
    'לא בטוח', 'אתייעץ', 'אשקול', 'בהמשך', 'מאוחר יותר',
    
    // ביטויי דחייה עדינים
    'נדבר שוב', 'אחזור אליך', 'אתקשר שוב', 'צריך להתייעץ',
    
    // ביטויי חוסר ודאות
    'צריך לחשוב על זה', 'אני עדיין לא בטוח', 'יש לי התלבטות',
    'צריך לשקול', 'לא החלטתי עדיין', 'תן לי לחשוב',
    
    // ביטויי השוואה
    'אני בודק אופציות', 'יש לי עוד הצעות', 'משווה מחירים',
    'מתייעץ עם אחרים', 'בודק מתחרים'
  ]);

  private urgencyWords = new Set([
    // ביטויי דחיפות מיידית
    'דחוף', 'מיידי', 'בהקדם', 'עכשיו', 'היום', 'מחר',
    'חשוב', 'קריטי', 'בדחיפות', 'מהר', 'בימים הקרובים',
    
    // ביטויי לחץ זמן
    'אין זמן', 'צריך מהר', 'לא יכול לחכות', 'חייב עכשיו',
    'דוחק הזמן', 'מתי הכי מהר', 'בלי דיחוי',
    
    // ביטויי תזמון ספציפי
    'עד סוף השבוע', 'עד סוף החודש', 'לפני החג',
    'בשבוע הבא', 'בחודש הקרוב', 'בימים הקרובים'
  ]);

  public initialize() {
    return Promise.resolve();
  }

  private countWordTypes(text: string) {
    const words = text.toLowerCase().split(/\s+/);
    let counts = {
      positive: 0,
      negative: 0,
      hesitation: 0,
      urgency: 0
    };

    words.forEach(word => {
      if (this.positiveWords.has(word)) counts.positive++;
      if (this.negativeWords.has(word)) counts.negative++;
      if (this.hesitationWords.has(word)) counts.hesitation++;
      if (this.urgencyWords.has(word)) counts.urgency++;
    });

    return counts;
  }

  private calculatePotentialScore(lead: any) {
    let score = 50; // ציון בסיס

    // ניתוח הערות
    if (lead.notes) {
      const counts = this.countWordTypes(lead.notes);
      score += counts.positive * 5;
      score -= counts.negative * 8;
      score -= counts.hesitation * 3;
      score += counts.urgency * 4;
    }

    // התאמה לפי סטטוס
    switch (lead.status) {
      case 'חדש':
        score += 10;
        break;
      case 'נשלחה הצעת מחיר':
        score += 20;
        break;
      case 'עסקה נסגרה':
        score = 100;
        break;
      case 'לא מעוניין':
      case 'הסרה מהמאגר':
        score = 0;
        break;
      case 'אין מענה':
        score -= 10;
        break;
      case 'אין מענה 2':
        score -= 20;
        break;
      case 'רוצה לחשוב':
        score -= 5;
        break;
    }

    // הגבלת הציון לטווח 0-100
    return Math.max(0, Math.min(100, score));
  }

  private getSentiment(lead: any) {
    if (!lead.notes) return 'neutral';

    const counts = this.countWordTypes(lead.notes);
    
    // בדיקת ביטויים שליליים ספציפיים
    const hasStrongNegative = lead.notes.includes('לא היה רציני') || 
                             lead.notes.includes('נפנף') ||
                             lead.notes.includes('לא מעוניין');

    if (hasStrongNegative) return 'negative';

    // חישוב יחס בין ביטויים חיוביים לשליליים
    const positiveRatio = counts.positive / (counts.positive + counts.negative + counts.hesitation);
    
    if (positiveRatio > 0.6) return 'positive';
    if (positiveRatio < 0.3) return 'negative';
    return 'neutral';
  }

  private getClassification(lead: any) {
    const potentialScore = this.calculatePotentialScore(lead);
    const sentiment = this.getSentiment(lead);

    if (potentialScore >= 80) return 'ליד חם';
    if (potentialScore >= 60) return 'ליד מבטיח';
    if (potentialScore >= 40) return 'ליד בינוני';
    return 'ליד קר';
  }

  private getRecommendedActions(lead: any): string[] {
    const actions: string[] = [];
    const sentiment = this.getSentiment(lead);
    const counts = lead.notes ? this.countWordTypes(lead.notes) : { positive: 0, negative: 0, hesitation: 0, urgency: 0 };

    // המלצות לפי סטטוס
    switch (lead.status) {
      case 'חדש':
        actions.push('ליצור קשר בהקדם');
        actions.push('להכין הצעת מחיר ראשונית');
        break;
      case 'נשלחה הצעת מחיר':
        actions.push('לבצע שיחת מעקב על ההצעה');
        actions.push('לשלוח חומר שיווקי נוסף');
        break;
      case 'אין מענה':
        actions.push('לנסות ליצור קשר בשעה אחרת');
        actions.push('לשלוח הודעת SMS/WhatsApp');
        break;
      case 'רוצה לחשוב':
        actions.push('לתזמן שיחת מעקב');
        actions.push('לשלוח מידע נוסף על היתרונות');
        break;
    }

    // המלצות לפי ניתוח טקסט
    if (counts.hesitation > 0) {
      actions.push('להתמקד בהסרת חששות');
      actions.push('להציע פגישת היכרות');
    }

    if (counts.urgency > 0) {
      actions.push('לתעדף טיפול בליד');
      actions.push('להציע פתרון מהיר');
    }

    if (sentiment === 'negative') {
      actions.push('לברר את הסיבות להיסוס');
      actions.push('להציע הטבה מיוחדת');
    }

    // החזרת מקסימום 4 המלצות
    return actions.slice(0, 4);
  }

  public analyzeLead(lead: any) {
    const sentiment = this.getSentiment(lead);
    const potentialScore = this.calculatePotentialScore(lead);
    const classification = this.getClassification(lead);
    const recommendedActions = this.getRecommendedActions(lead);

    return {
      sentiment,
      classification,
      potentialScore,
      recommendedActions
    };
  }

  public predictNextStatus(lead: any) {
    const sentiment = this.getSentiment(lead);
    const potentialScore = this.calculatePotentialScore(lead);

    switch (lead.status) {
      case 'חדש':
        return sentiment === 'positive' ? 'נשלחה הצעת מחיר' : 'אין מענה';
      case 'נשלחה הצעת מחיר':
        return potentialScore >= 70 ? 'עסקה נסגרה' : 'רוצה לחשוב';
      case 'אין מענה':
        return 'אין מענה 2';
      case 'רוצה לחשוב':
        return sentiment === 'positive' ? 'נשלחה הצעת מחיר' : 'לא מעוניין';
      default:
        return lead.status;
    }
  }
}

const aiService = new AIService();
export { aiService };