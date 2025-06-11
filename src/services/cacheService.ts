import { CryptoAnalysis } from './technicalAnalysis';
import { shouldForceRefresh } from '../config/deployment';

export interface CachedRecommendations {
  recommendations: CryptoAnalysis[];
  timestamp: number;
  date: string;
  fetchedAt: Date;
  nextFetchTime: Date;
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
  private readonly MARKET_DATA_KEY = 'crypto_market_data';
  private readonly HOURLY_CACHE_KEY = 'crypto_hourly_cache_schedule';
  
  // Hourly fetch interval (1 hour in milliseconds)
  private readonly HOURLY_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Calculate the next scheduled fetch time based on rolling hourly intervals
   * Always fetches 1 hour from the current time
   */
  private getNextFetchTime(): Date {
    const now = new Date();
    // Next fetch is always exactly 1 hour from now
    return new Date(now.getTime() + this.HOURLY_INTERVAL);
  }

  /**
   * Check if it's time for the next scheduled fetch
   */
  isTimeForNextFetch(): boolean {
    // Always return true if new deployment detected
    if (shouldForceRefresh()) {
      return true;
    }

    const cached = this.getCachedRecommendations();
    if (!cached) return true;
    
    const now = new Date();
    return now >= cached.nextFetchTime;
  }

  /**
   * Get time remaining until next fetch in minutes
   */
  getTimeUntilNextFetch(): number {
    const cached = this.getCachedRecommendations();
    if (!cached) return 0;
    
    const now = new Date();
    const timeDiff = cached.nextFetchTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(timeDiff / (60 * 1000)));
  }

  // Get cached recommendations (only returns valid hourly cached data)
  getCachedRecommendations(): CachedRecommendations | null {
    try {
      // Check for new deployment first
      if (shouldForceRefresh()) {
        console.log('New deployment detected, clearing all cache');
        this.clearAllData();
        return null;
      }

      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: CachedRecommendations = JSON.parse(cached);
      
      // Ensure dates are properly parsed
      data.fetchedAt = new Date(data.fetchedAt);
      data.nextFetchTime = new Date(data.nextFetchTime);
      
      // Check if we're still within the valid hour window
      const now = new Date();
      if (now >= data.nextFetchTime) {
        // Cache has expired, remove it
        this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // Cache new recommendations with hourly schedule
  cacheRecommendations(recommendations: CryptoAnalysis[]): void {
    try {
      const now = new Date();
      const nextFetchTime = this.getNextFetchTime();
      
      const cacheData: CachedRecommendations = {
        recommendations,
        timestamp: now.getTime(),
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format
        fetchedAt: now,
        nextFetchTime: nextFetchTime
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      
      // Also save for performance tracking
      this.saveForPerformanceTracking(recommendations);
      
      console.log(`Data cached at ${now.toLocaleString()}, next fetch scheduled for ${nextFetchTime.toLocaleString()}`);
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  }

  // Cache market data (for coin lists, prices, etc.) - also follows hourly schedule
  cacheMarketData(key: string, data: any): void {
    try {
      const now = new Date();
      const nextFetchTime = this.getNextFetchTime();
      
      const cacheData = {
        data,
        timestamp: now.getTime(),
        fetchedAt: now,
        nextFetchTime: nextFetchTime
      };
      localStorage.setItem(`${this.MARKET_DATA_KEY}_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching market data:', error);
    }
  }

  // Get cached market data (respects hourly schedule)
  getCachedMarketData(key: string): any | null {
    try {
      const cached = localStorage.getItem(`${this.MARKET_DATA_KEY}_${key}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Parse dates if they exist
      if (data.fetchedAt) data.fetchedAt = new Date(data.fetchedAt);
      if (data.nextFetchTime) data.nextFetchTime = new Date(data.nextFetchTime);
      
      const now = new Date();
      
      // Check if cache is still valid based on hourly schedule
      if (data.nextFetchTime && now >= data.nextFetchTime) {
        localStorage.removeItem(`${this.MARKET_DATA_KEY}_${key}`);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error reading cached market data:', error);
      return null;
    }
  }

  // Clear cache
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Clear all market data cache
  clearMarketDataCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.MARKET_DATA_KEY)) {
        localStorage.removeItem(key);
      }
    });
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

  // Update performance data with current prices (within cache window)
  async updatePerformanceData(getCurrentPrice: (coinId: string) => Promise<number>): Promise<void> {
    try {
      const history = this.getPerformanceHistory();
      if (history.length === 0) return;

      // Only update within the current hourly cache window
      const cached = this.getCachedRecommendations();
      if (!cached) return;

      // Update the most recent performance data
      const latestPerformance = history[0];
      
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
      latestPerformance.timestamp = Date.now();

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

  // Check if we need new recommendations (based on hourly schedule)
  needsNewRecommendations(): boolean {
    return this.isTimeForNextFetch();
  }

  // Get cache age in hours
  getCacheAge(): number {
    const cached = this.getCachedRecommendations();
    if (!cached) return 0;
    
    const now = Date.now();
    return (now - cached.timestamp) / (60 * 60 * 1000);
  }

  // Check if cache is fresh (within current hour window)
  isCacheFresh(): boolean {
    return !this.isTimeForNextFetch();
  }

  // Get comprehensive cache status with hourly schedule info
  getCacheStatus(): { 
    hasCache: boolean; 
    ageHours: number; 
    isFresh: boolean; 
    nextFetchTime: Date | null;
    minutesUntilNextFetch: number;
    fetchedAt: Date | null;
  } {
    const cached = this.getCachedRecommendations();
    
    if (!cached) {
      return {
        hasCache: false,
        ageHours: 0,
        isFresh: false,
        nextFetchTime: this.getNextFetchTime(),
        minutesUntilNextFetch: 0,
        fetchedAt: null
      };
    }

    return {
      hasCache: true,
      ageHours: this.getCacheAge(),
      isFresh: this.isCacheFresh(),
      nextFetchTime: cached.nextFetchTime,
      minutesUntilNextFetch: this.getTimeUntilNextFetch(),
      fetchedAt: cached.fetchedAt
    };
  }

  // Clear all data
  clearAllData(): void {
    this.clearCache();
    this.clearMarketDataCache();
    localStorage.removeItem(this.PERFORMANCE_KEY);
  }

  // Export data for backup
  exportData(): { recommendations: CachedRecommendations | null; performance: DailyPerformance[] } {
    return {
      recommendations: this.getCachedRecommendations(),
      performance: this.getPerformanceHistory()
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

  // Clean up old cache entries (now based on hourly schedule)
  cleanupOldCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.MARKET_DATA_KEY)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.nextFetchTime) {
            const nextFetch = new Date(data.nextFetchTime);
            if (new Date() >= nextFetch) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove invalid cache entries
          localStorage.removeItem(key);
        }
      }
    });

    // Check main cache
    const cached = this.getCachedRecommendations();
    if (!cached) {
      this.clearCache();
    }
  }
}

export const cacheService = new CacheService(); 