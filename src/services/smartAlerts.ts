import { SmartAlert, UserPreferences, Coin } from '../types';
import { CryptoAnalyzer } from './technicalAnalysis';
import apiService from './api';

// Define AlertCondition interface since it's not in types
export interface AlertCondition {
  type: 'price_above' | 'price_below' | 'volume_spike' | 'technical_signal' | 'sentiment_change' | 'news_alert' | 'price_change_24h' | 'market_cap_change';
  value?: number;
  operator?: 'AND' | 'OR';
  signal_type?: string;
  keywords?: string[];
  description?: string;
  ai_context?: {
    support_levels?: number[];
    resistance_levels?: number[];
    trend_strength?: number;
    sentiment_score?: number;
    social_volume?: number;
    news_sentiment?: number;
  };
}

class SmartAlertsService {
  private alerts = new Map<string, SmartAlert[]>();
  private alertHistory = new Map<string, SmartAlert[]>();
  private readonly MAX_ALERTS_PER_USER = 50;
  private readonly ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown
  private cryptoAnalyzer = new CryptoAnalyzer();

  async createAlert(
    userId: string,
    coinId: string,
    conditions: AlertCondition[],
    preferences: UserPreferences
  ): Promise<SmartAlert | null> {
    try {
      const userAlerts = this.alerts.get(userId) || [];
      
      if (userAlerts.length >= this.MAX_ALERTS_PER_USER) {
        throw new Error('Maximum number of alerts reached');
      }

      const alert: SmartAlert = {
        id: this.generateAlertId(),
        coin_id: coinId,
        type: 'PRICE_TARGET', // Default type
        condition: this.formatConditions(conditions),
        target_value: conditions[0]?.value || 0,
        current_value: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        triggered_at: undefined,
        message: ''
      };

      userAlerts.push(alert);
      this.alerts.set(userId, userAlerts);

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  private formatConditions(conditions: AlertCondition[]): string {
    return conditions.map(condition => {
      switch (condition.type) {
        case 'price_above':
          return `Price > $${condition.value}`;
        case 'price_below':
          return `Price < $${condition.value}`;
        case 'volume_spike':
          return `Volume +${condition.value}%`;
        case 'technical_signal':
          return `Signal: ${condition.signal_type}`;
        case 'sentiment_change':
          return `Sentiment ±${condition.value}%`;
        case 'news_alert':
          return `News: ${condition.keywords?.join(', ')}`;
        default:
          return condition.type;
      }
    }).join(', ');
  }

  async checkAlerts(): Promise<SmartAlert[]> {
    const triggeredAlerts: SmartAlert[] = [];

    // Convert Map.entries() to Array to avoid iteration issues
    const alertEntries = Array.from(this.alerts.entries());

    for (const [userId, userAlerts] of alertEntries) {
      for (const alert of userAlerts) {
        if (alert.is_active) {
          const isTriggered = await this.evaluateAlert(alert);
          
          if (isTriggered) {
            alert.is_active = false;
            alert.triggered_at = new Date().toISOString();
            alert.message = await this.generateAlertMessage(alert);
            
            triggeredAlerts.push(alert);
            
            // Add to history
            const history = this.alertHistory.get(userId) || [];
            history.push({ ...alert });
            this.alertHistory.set(userId, history.slice(-100)); // Keep last 100 alerts
          }
        }
      }
    }

    return triggeredAlerts;
  }

  private async evaluateAlert(alert: SmartAlert): Promise<boolean> {
    try {
      // Check cooldown
      if (this.isInCooldown(alert)) {
        return false;
      }

      const coinData = await apiService.getCoinDetail(alert.coin_id);
      if (!coinData) return false;

      // Update current value
      alert.current_value = coinData.current_price;

      // Simple evaluation based on alert type
      switch (alert.type) {
        case 'PRICE_TARGET':
          return this.evaluatePriceTarget(alert, coinData);
        case 'TECHNICAL_BREAKOUT':
          return await this.evaluateTechnicalBreakout(alert, coinData);
        case 'VOLUME_SPIKE':
          return await this.evaluateVolumeSpike(alert, coinData);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating alert:', error);
      return false;
    }
  }

  private evaluatePriceTarget(alert: SmartAlert, coinData: Coin): boolean {
    const condition = alert.condition?.toLowerCase() || '';
    
    if (condition.includes('price >')) {
      return coinData.current_price > alert.target_value;
    } else if (condition.includes('price <')) {
      return coinData.current_price < alert.target_value;
    }
    
    return false;
  }

  private async evaluateTechnicalBreakout(alert: SmartAlert, coinData: Coin): Promise<boolean> {
    try {
      const analysis = await this.cryptoAnalyzer.analyzeCoin(coinData);
      
      // Check for technical signals
      if (analysis.signals.includes('Golden Cross') || 
          analysis.signals.includes('MACD Bullish') ||
          analysis.signals.includes('RSI Oversold')) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error evaluating technical breakout:', error);
      return false;
    }
  }

  private async evaluateVolumeSpike(alert: SmartAlert, coinData: Coin): Promise<boolean> {
    try {
      // Simple volume spike detection
      const priceHistory = await apiService.getCoinHistory(coinData.id, 'usd', 7);
      if (!priceHistory || !priceHistory.prices || priceHistory.prices.length < 2) return false;

      const currentVolume = coinData.total_volume;
      const avgVolume = currentVolume * 0.7; // Simplified average calculation
      
      const volumeIncrease = ((currentVolume - avgVolume) / avgVolume) * 100;
      return volumeIncrease > alert.target_value;
    } catch (error) {
      console.error('Error checking volume spike:', error);
      return false;
    }
  }

  private isInCooldown(alert: SmartAlert): boolean {
    if (!alert.triggered_at) return false;
    
    const timeSinceTriggered = Date.now() - new Date(alert.triggered_at).getTime();
    return timeSinceTriggered < this.ALERT_COOLDOWN;
  }

  private async generateAlertMessage(alert: SmartAlert): Promise<string> {
    try {
      const coinData = await apiService.getCoinDetail(alert.coin_id);
      if (!coinData) return 'Alert triggered';

      const symbol = coinData.symbol.toUpperCase();
      const price = coinData.current_price.toFixed(4);
      const change24h = coinData.price_change_percentage_24h.toFixed(2);

      let message = `🚨 ${symbol} Alert Triggered!\n`;
      message += `💰 Current Price: $${price}\n`;
      message += `📈 24h Change: ${change24h}%\n`;
      message += `📊 Condition: ${alert.condition}\n`;

      return message;
    } catch (error) {
      console.error('Error generating alert message:', error);
      return 'Alert triggered - unable to generate detailed message';
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for managing alerts
  async getUserAlerts(userId: string): Promise<SmartAlert[]> {
    return this.alerts.get(userId) || [];
  }

  async getAlertHistory(userId: string): Promise<SmartAlert[]> {
    return this.alertHistory.get(userId) || [];
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const userAlerts = this.alerts.get(userId) || [];
    const filteredAlerts = userAlerts.filter(alert => alert.id !== alertId);
    
    if (filteredAlerts.length < userAlerts.length) {
      this.alerts.set(userId, filteredAlerts);
      return true;
    }
    
    return false;
  }

  async updateAlert(userId: string, alertId: string, updates: Partial<SmartAlert>): Promise<SmartAlert | null> {
    const userAlerts = this.alerts.get(userId) || [];
    const alertIndex = userAlerts.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) return null;
    
    userAlerts[alertIndex] = { ...userAlerts[alertIndex], ...updates };
    this.alerts.set(userId, userAlerts);
    
    return userAlerts[alertIndex];
  }

  // Method to get suggested alerts based on user's portfolio
  async getSuggestedAlerts(userId: string, watchlist: string[]): Promise<AlertCondition[]> {
    const suggestions: AlertCondition[] = [];

    for (const coinId of watchlist) {
      try {
        const coinData = await apiService.getCoinDetail(coinId);

        if (coinData) {
          // Suggest price-based alerts
          const currentPrice = coinData.current_price;
          
          suggestions.push({
            type: 'price_above',
            value: currentPrice * 1.1, // 10% above current price
            operator: 'AND',
            description: `Price breaks above $${(currentPrice * 1.1).toFixed(4)}`
          });

          suggestions.push({
            type: 'price_below',
            value: currentPrice * 0.9, // 10% below current price
            operator: 'AND',
            description: `Price drops below $${(currentPrice * 0.9).toFixed(4)}`
          });

          // Suggest volume spike alert
          suggestions.push({
            type: 'volume_spike',
            value: 50, // 50% volume increase
            operator: 'AND',
            description: 'Volume increases by 50%'
          });
        }
      } catch (error) {
        console.warn(`Error generating suggestions for ${coinId}:`, error);
      }
    }

    return suggestions.slice(0, 10); // Return top 10 suggestions
  }

  // Method to start monitoring alerts (would be called periodically)
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        const triggeredAlerts = await this.checkAlerts();
        
        if (triggeredAlerts.length > 0) {
          console.log(`${triggeredAlerts.length} alerts triggered:`, triggeredAlerts);
          // Here you would send notifications to users
          // this.sendNotifications(triggeredAlerts);
        }
      } catch (error) {
        console.error('Error in alert monitoring:', error);
      }
    }, intervalMs);
  }
}

export const smartAlertsService = new SmartAlertsService(); 