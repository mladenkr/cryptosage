import { cacheService } from './cacheService';
import { cryptoAnalyzer } from './technicalAnalysis';
import { coinGeckoApi } from './api';

class ScheduledDataFetcher {
  private intervalId: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isFetching = false;

  /**
   * Initialize the scheduled data fetcher
   * This will check every minute if it's time to fetch new data
   */
  init(): void {
    if (this.isInitialized) return;

    console.log('Initializing scheduled data fetcher...');
    
    // Check immediately on init
    this.checkAndFetchData();
    
    // Then check every minute
    this.intervalId = setInterval(() => {
      this.checkAndFetchData();
    }, 60000); // Check every minute

    this.isInitialized = true;
    console.log('Scheduled data fetcher initialized');
  }

  /**
   * Stop the scheduled data fetcher
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isInitialized = false;
    console.log('Scheduled data fetcher stopped');
  }

  /**
   * Check if it's time to fetch data and do so if needed
   */
  private async checkAndFetchData(): Promise<void> {
    // Prevent multiple simultaneous fetches
    if (this.isFetching) return;

    const cacheStatus = cacheService.getCacheStatus();
    
    // If we have fresh data, no need to fetch
    if (cacheStatus.hasCache && cacheStatus.isFresh) {
      return;
    }

    // If it's time for the next fetch
    if (cacheService.isTimeForNextFetch()) {
      console.log('Time for scheduled data fetch...');
      await this.fetchDataNow();
    }
  }

  /**
   * Force fetch data now (used for initial load and scheduled updates)
   */
  async fetchDataNow(): Promise<boolean> {
    if (this.isFetching) {
      console.log('Data fetch already in progress, skipping...');
      return false;
    }

    this.isFetching = true;
    console.log('Starting scheduled data fetch...');

    try {
      // Fetch fresh crypto analysis data
      const recommendations = await cryptoAnalyzer.getTop10Recommendations();
      
      if (recommendations && recommendations.length > 0) {
        // Cache the new data with hourly schedule
        cacheService.cacheRecommendations(recommendations);
        
        console.log(`Successfully fetched and cached ${recommendations.length} recommendations`);
        
        // Also update performance data in background
        this.updatePerformanceDataInBackground();
        
        return true;
      } else {
        console.warn('No recommendations received from crypto analyzer');
        return false;
      }
    } catch (error) {
      console.error('Error during scheduled data fetch:', error);
      return false;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Update performance data in background (don't block the main fetch)
   */
  private async updatePerformanceDataInBackground(): Promise<void> {
    try {
      await cacheService.updatePerformanceData(async (coinId: string) => {
        try {
          const coinData = await coinGeckoApi.getCoinDetail(coinId);
          return coinData.market_data?.current_price?.usd || 0;
        } catch (error) {
          console.warn(`Failed to get price for ${coinId}:`, error);
          return 0;
        }
      });
    } catch (error) {
      console.warn('Error updating performance data:', error);
    }
  }

  /**
   * Get the status of the data fetcher
   */
  getStatus(): {
    isInitialized: boolean;
    isFetching: boolean;
    cacheStatus: ReturnType<typeof cacheService.getCacheStatus>;
  } {
    return {
      isInitialized: this.isInitialized,
      isFetching: this.isFetching,
      cacheStatus: cacheService.getCacheStatus()
    };
  }

  /**
   * Get time until next scheduled fetch in human readable format
   */
  getTimeUntilNextFetch(): string {
    const minutes = cacheService.getTimeUntilNextFetch();
    
    if (minutes === 0) return 'Fetching now...';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Check if the fetcher is currently fetching data
   */
  isFetchingData(): boolean {
    return this.isFetching;
  }
}

export const scheduledDataFetcher = new ScheduledDataFetcher(); 