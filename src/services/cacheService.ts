import { CryptoAnalysis } from './technicalAnalysis';

export interface CachedRecommendations {
  recommendations: CryptoAnalysis[];
  timestamp: number;
  date: string;
}

export interface PerformanceData {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  initialPrice: number;
  currentPrice: number;
  priceChange24h: number;
  percentageChange: number;
  recommendation: string;
  aiScore: number;
  investment: number; // $100 investment
  currentValue: number;
  profit: number;
}

export interface DailyPerformance {
  date: string;
  timestamp: number;
  totalInvestment: number;
  totalCurrentValue: number;
  totalProfit: number;
  totalProfitPercentage: number;
  performances: PerformanceData[];
  averagePerformance: number;
  bestPerformer: PerformanceData | null;
  worstPerformer: PerformanceData | null;
}

class CacheService {
  private readonly CACHE_KEY = 'crypto_ai_recommendations';
  private readonly PERFORMANCE_KEY = 'crypto_ai_performance';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Get cached recommendations
  getCachedRecommendations(): CachedRecommendations | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: CachedRecommendations = JSON.parse(cached);
      
      // Check if cache is still valid (within 24 hours)
      const now = Date.now();
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // Cache new recommendations
  cacheRecommendations(recommendations: CryptoAnalysis[]): void {
    try {
      const cacheData: CachedRecommendations = {
        recommendations,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      
      // Also save for performance tracking
      this.saveForPerformanceTracking(recommendations);
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  }

  // Clear cache
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Save recommendations for performance tracking
  private saveForPerformanceTracking(recommendations: CryptoAnalysis[]): void {
    try {
      const performanceData: PerformanceData[] = recommendations.map(analysis => ({
        coinId: analysis.coin.id,
        coinName: analysis.coin.name,
        coinSymbol: analysis.coin.symbol,
        initialPrice: analysis.coin.current_price,
        currentPrice: analysis.coin.current_price,
        priceChange24h: 0,
        percentageChange: 0,
        recommendation: analysis.recommendation,
        aiScore: analysis.overallScore,
        investment: 100, // $100 investment per coin
        currentValue: 100,
        profit: 0,
      }));

      const dailyPerformance: DailyPerformance = {
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        totalInvestment: recommendations.length * 100,
        totalCurrentValue: recommendations.length * 100,
        totalProfit: 0,
        totalProfitPercentage: 0,
        performances: performanceData,
        averagePerformance: 0,
        bestPerformer: null,
        worstPerformer: null,
      };

      // Get existing performance history
      const existingHistory = this.getPerformanceHistory();
      const updatedHistory = [dailyPerformance, ...existingHistory.slice(0, 29)]; // Keep last 30 days

      localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving performance tracking data:', error);
    }
  }

  // Get performance history
  getPerformanceHistory(): DailyPerformance[] {
    try {
      const history = localStorage.getItem(this.PERFORMANCE_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading performance history:', error);
      return [];
    }
  }

  // Update performance data with current prices
  async updatePerformanceData(getCurrentPrice: (coinId: string) => Promise<number>): Promise<void> {
    try {
      const history = this.getPerformanceHistory();
      if (history.length === 0) return;

      // Update the most recent performance data
      const latestPerformance = history[0];
      const now = Date.now();
      const timeDiff = now - latestPerformance.timestamp;
      
      // Only update if it's been at least 1 hour since last update
      if (timeDiff < 60 * 60 * 1000) return;

      // Update prices for each coin
      for (const performance of latestPerformance.performances) {
        try {
          const currentPrice = await getCurrentPrice(performance.coinId);
          performance.currentPrice = currentPrice;
          performance.priceChange24h = currentPrice - performance.initialPrice;
          performance.percentageChange = ((currentPrice - performance.initialPrice) / performance.initialPrice) * 100;
          performance.currentValue = (performance.investment * currentPrice) / performance.initialPrice;
          performance.profit = performance.currentValue - performance.investment;
        } catch (error) {
          console.error(`Error updating price for ${performance.coinId}:`, error);
        }
      }

      // Calculate totals
      latestPerformance.totalCurrentValue = latestPerformance.performances.reduce(
        (sum, p) => sum + p.currentValue, 0
      );
      latestPerformance.totalProfit = latestPerformance.totalCurrentValue - latestPerformance.totalInvestment;
      latestPerformance.totalProfitPercentage = (latestPerformance.totalProfit / latestPerformance.totalInvestment) * 100;
      latestPerformance.averagePerformance = latestPerformance.performances.reduce(
        (sum, p) => sum + p.percentageChange, 0
      ) / latestPerformance.performances.length;

      // Find best and worst performers
      latestPerformance.bestPerformer = latestPerformance.performances.reduce((best, current) =>
        current.percentageChange > (best?.percentageChange || -Infinity) ? current : best
      );
      latestPerformance.worstPerformer = latestPerformance.performances.reduce((worst, current) =>
        current.percentageChange < (worst?.percentageChange || Infinity) ? current : worst
      );

      // Update timestamp
      latestPerformance.timestamp = now;

      // Save updated history
      localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error updating performance data:', error);
    }
  }

  // Get latest performance data
  getLatestPerformance(): DailyPerformance | null {
    const history = this.getPerformanceHistory();
    return history.length > 0 ? history[0] : null;
  }

  // Check if we need new recommendations
  needsNewRecommendations(): boolean {
    const cached = this.getCachedRecommendations();
    return cached === null;
  }

  // Get cache age in hours
  getCacheAge(): number {
    const cached = this.getCachedRecommendations();
    if (!cached) return 24; // Return 24 hours if no cache

    const now = Date.now();
    const ageMs = now - cached.timestamp;
    return ageMs / (60 * 60 * 1000); // Convert to hours
  }

  // Clear all data (for testing)
  clearAllData(): void {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.PERFORMANCE_KEY);
  }

  // Export data for backup
  exportData(): { recommendations: CachedRecommendations | null; performance: DailyPerformance[] } {
    return {
      recommendations: this.getCachedRecommendations(),
      performance: this.getPerformanceHistory(),
    };
  }

  // Import data from backup
  importData(data: { recommendations?: CachedRecommendations; performance?: DailyPerformance[] }): void {
    try {
      if (data.recommendations) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(data.recommendations));
      }
      if (data.performance) {
        localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(data.performance));
      }
    } catch (error) {
      console.error('Error importing data:', error);
    }
  }
}

export const cacheService = new CacheService(); 