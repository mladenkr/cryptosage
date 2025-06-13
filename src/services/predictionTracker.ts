import { EnhancedCryptoAnalysis } from './enhancedAIAnalysis';
import { CryptoAnalysis } from './technicalAnalysis';

export interface PredictionRecord {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  timestamp: number;
  predictionTimestamp: number;
  
  // Original prediction data
  originalPrice: number;
  predictions: {
    '1h': number;
    '4h': number;
    '24h': number;
    '7d': number;
  };
  confidence: number;
  recommendation: 'LONG' | 'SHORT';
  overallScore: number;
  
  // Actual performance data (updated hourly)
  actualPrices: {
    '1h'?: number;
    '4h'?: number;
    '24h'?: number;
    '7d'?: number;
  };
  actualChanges: {
    '1h'?: number;
    '4h'?: number;
    '24h'?: number;
    '7d'?: number;
  };
  
  // Accuracy metrics
  accuracyScores: {
    '1h'?: number;
    '4h'?: number;
    '24h'?: number;
    '7d'?: number;
  };
  overallAccuracy?: number;
  
  // Status
  isComplete: boolean;
  lastUpdated: number;
}

export interface PredictionAccuracyStats {
  totalPredictions: number;
  completedPredictions: number;
  averageAccuracy: number;
  accuracyByTimeframe: {
    '1h': number;
    '4h': number;
    '24h': number;
    '7d': number;
  };
  accuracyByConfidence: {
    high: number; // 80%+
    medium: number; // 60-80%
    low: number; // <60%
  };
  bestPerformingTimeframe: string;
  worstPerformingTimeframe: string;
  recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  lastUpdated: number;
}

export interface CoinAccuracyHistory {
  coinId: string;
  coinSymbol: string;
  totalPredictions: number;
  averageAccuracy: number;
  recentAccuracy: number; // Last 7 days
  bestTimeframe: string;
  worstTimeframe: string;
  confidenceReliability: number; // How well confidence correlates with accuracy
  lastPredictionDate: number;
}

class PredictionTracker {
  private readonly STORAGE_KEY = 'cryptosage_prediction_records';
  private readonly STATS_KEY = 'cryptosage_prediction_stats';
  private readonly COIN_HISTORY_KEY = 'cryptosage_coin_accuracy_history';
  private readonly MAX_RECORDS = 10000; // Keep last 10k predictions
  private readonly UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicUpdates();
  }

  // Save new predictions for tracking
  savePredictions(analyses: (EnhancedCryptoAnalysis | CryptoAnalysis)[]): void {
    try {
      const existingRecords = this.getPredictionRecords();
      const timestamp = Date.now();
      
      const newRecords: PredictionRecord[] = analyses.map(analysis => {
        const isEnhanced = 'predictions' in analysis;
        
        return {
          id: `${analysis.coin.id}_${timestamp}`,
          coinId: analysis.coin.id,
          coinSymbol: analysis.coin.symbol,
          coinName: analysis.coin.name,
          timestamp,
          predictionTimestamp: timestamp,
          originalPrice: analysis.coin.current_price,
          predictions: isEnhanced ? analysis.predictions : {
            '1h': analysis.predicted1hChange,
            '4h': analysis.predicted1hChange * 2.5,
            '24h': analysis.predicted1hChange * 8,
            '7d': analysis.predicted1hChange * 20
          },
          confidence: analysis.confidence,
          recommendation: analysis.recommendation,
          overallScore: analysis.overallScore,
          actualPrices: {},
          actualChanges: {},
          accuracyScores: {},
          isComplete: false,
          lastUpdated: timestamp
        };
      });

      // Add new records and keep only the most recent ones
      const allRecords = [...newRecords, ...existingRecords].slice(0, this.MAX_RECORDS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allRecords));
      
      console.log(`📊 Saved ${newRecords.length} new prediction records for tracking`);
    } catch (error) {
      console.error('Error saving predictions for tracking:', error);
    }
  }

  // Get all prediction records
  getPredictionRecords(): PredictionRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading prediction records:', error);
      return [];
    }
  }

  // Update actual prices and calculate accuracy
  async updatePredictionAccuracy(): Promise<void> {
    try {
      const records = this.getPredictionRecords();
      const incompleteRecords = records.filter(record => !record.isComplete);
      
      if (incompleteRecords.length === 0) {
        console.log('📊 No incomplete prediction records to update');
        return;
      }

      console.log(`📊 Updating accuracy for ${incompleteRecords.length} prediction records`);

      // Group records by coin to minimize API calls
      const coinGroups = new Map<string, PredictionRecord[]>();
      incompleteRecords.forEach(record => {
        if (!coinGroups.has(record.coinId)) {
          coinGroups.set(record.coinId, []);
        }
        coinGroups.get(record.coinId)!.push(record);
      });

      // Update each coin's records
      for (const [coinId, coinRecords] of Array.from(coinGroups.entries())) {
        await this.updateCoinPredictions(coinId, coinRecords);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Save updated records
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      
      // Update statistics
      this.updateAccuracyStats();
      this.updateCoinHistories();
      
      console.log('📊 Prediction accuracy update completed');
    } catch (error) {
      console.error('Error updating prediction accuracy:', error);
    }
  }

  // Update predictions for a specific coin
  private async updateCoinPredictions(coinId: string, records: PredictionRecord[]): Promise<void> {
    try {
      // Fetch current price from CoinGecko
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch price for ${coinId}`);
        return;
      }

      const data = await response.json();
      const currentPrice = data[coinId]?.usd;
      
      if (!currentPrice) {
        console.warn(`No price data for ${coinId}`);
        return;
      }

      const now = Date.now();

      // Update each record for this coin
      records.forEach(record => {
        const timeSincePrediction = now - record.predictionTimestamp;
        const hoursElapsed = timeSincePrediction / (1000 * 60 * 60);

        // Update actual prices and changes based on elapsed time
        if (hoursElapsed >= 1 && !record.actualPrices['1h']) {
          record.actualPrices['1h'] = currentPrice;
          record.actualChanges['1h'] = ((currentPrice - record.originalPrice) / record.originalPrice) * 100;
          record.accuracyScores['1h'] = this.calculateAccuracyScore(record.predictions['1h'], record.actualChanges['1h']!);
        }

        if (hoursElapsed >= 4 && !record.actualPrices['4h']) {
          record.actualPrices['4h'] = currentPrice;
          record.actualChanges['4h'] = ((currentPrice - record.originalPrice) / record.originalPrice) * 100;
          record.accuracyScores['4h'] = this.calculateAccuracyScore(record.predictions['4h'], record.actualChanges['4h']!);
        }

        if (hoursElapsed >= 24 && !record.actualPrices['24h']) {
          record.actualPrices['24h'] = currentPrice;
          record.actualChanges['24h'] = ((currentPrice - record.originalPrice) / record.originalPrice) * 100;
          record.accuracyScores['24h'] = this.calculateAccuracyScore(record.predictions['24h'], record.actualChanges['24h']!);
        }

        if (hoursElapsed >= 168 && !record.actualPrices['7d']) { // 7 days = 168 hours
          record.actualPrices['7d'] = currentPrice;
          record.actualChanges['7d'] = ((currentPrice - record.originalPrice) / record.originalPrice) * 100;
          record.accuracyScores['7d'] = this.calculateAccuracyScore(record.predictions['7d'], record.actualChanges['7d']!);
          record.isComplete = true;
        }

        // Calculate overall accuracy if we have at least 1h data
        if (record.accuracyScores['1h'] !== undefined) {
          const scores = Object.values(record.accuracyScores).filter(score => score !== undefined) as number[];
          record.overallAccuracy = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }

        record.lastUpdated = now;
      });

    } catch (error) {
      console.error(`Error updating predictions for ${coinId}:`, error);
    }
  }

  // Calculate accuracy score (0-100, where 100 is perfect prediction)
  private calculateAccuracyScore(predicted: number, actual: number): number {
    const error = Math.abs(predicted - actual);
    
    // Perfect prediction = 100 points
    // Error of 1% = 95 points
    // Error of 5% = 75 points
    // Error of 10% = 50 points
    // Error of 20% = 25 points
    // Error of 50%+ = 0 points
    
    if (error === 0) return 100;
    if (error <= 1) return 95;
    if (error <= 2) return 90;
    if (error <= 5) return 75;
    if (error <= 10) return 50;
    if (error <= 20) return 25;
    if (error <= 50) return 10;
    return 0;
  }

  // Get accuracy statistics
  getAccuracyStats(): PredictionAccuracyStats | null {
    try {
      const stored = localStorage.getItem(this.STATS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading accuracy stats:', error);
      return null;
    }
  }

  // Get coin accuracy histories
  getCoinHistories(): CoinAccuracyHistory[] {
    try {
      const stored = localStorage.getItem(this.COIN_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading coin histories:', error);
      return [];
    }
  }

  // Get accuracy history for a specific coin
  getCoinAccuracy(coinId: string): CoinAccuracyHistory | null {
    const histories = this.getCoinHistories();
    return histories.find(history => history.coinId === coinId) || null;
  }

  // Get recent predictions for a coin (for display in coin info)
  getCoinRecentPredictions(coinId: string, limit: number = 5): PredictionRecord[] {
    const records = this.getPredictionRecords();
    return records
      .filter(record => record.coinId === coinId)
      .sort((a, b) => b.predictionTimestamp - a.predictionTimestamp)
      .slice(0, limit);
  }

  // Update overall accuracy statistics
  private updateAccuracyStats(): void {
    try {
      const records = this.getPredictionRecords();
      const completedRecords = records.filter(record => record.overallAccuracy !== undefined);
      
      if (completedRecords.length === 0) {
        return;
      }

      // Calculate overall stats
      const totalPredictions = records.length;
      const completedPredictions = completedRecords.length;
      const averageAccuracy = completedRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / completedRecords.length;

      // Calculate accuracy by timeframe
      const timeframes = ['1h', '4h', '24h', '7d'] as const;
      const accuracyByTimeframe = {} as any;
      
      timeframes.forEach(timeframe => {
        const recordsWithTimeframe = records.filter(record => record.accuracyScores[timeframe] !== undefined);
        if (recordsWithTimeframe.length > 0) {
          accuracyByTimeframe[timeframe] = recordsWithTimeframe.reduce((sum, record) => 
            sum + record.accuracyScores[timeframe]!, 0) / recordsWithTimeframe.length;
        } else {
          accuracyByTimeframe[timeframe] = 0;
        }
      });

      // Calculate accuracy by confidence level
      const highConfidenceRecords = completedRecords.filter(record => record.confidence >= 80);
      const mediumConfidenceRecords = completedRecords.filter(record => record.confidence >= 60 && record.confidence < 80);
      const lowConfidenceRecords = completedRecords.filter(record => record.confidence < 60);

      const accuracyByConfidence = {
        high: highConfidenceRecords.length > 0 ? 
          highConfidenceRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / highConfidenceRecords.length : 0,
        medium: mediumConfidenceRecords.length > 0 ? 
          mediumConfidenceRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / mediumConfidenceRecords.length : 0,
        low: lowConfidenceRecords.length > 0 ? 
          lowConfidenceRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / lowConfidenceRecords.length : 0,
      };

      // Find best and worst performing timeframes
      const timeframeAccuracies = Object.entries(accuracyByTimeframe) as [string, number][];
      const bestPerformingTimeframe = timeframeAccuracies.reduce((best, current) => 
        current[1] > best[1] ? current : best)[0];
      const worstPerformingTimeframe = timeframeAccuracies.reduce((worst, current) => 
        current[1] < worst[1] ? current : worst)[0];

      // Calculate recent trend (last 30 days vs previous 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
      
      const recentRecords = completedRecords.filter(record => record.predictionTimestamp >= thirtyDaysAgo);
      const previousRecords = completedRecords.filter(record => 
        record.predictionTimestamp >= sixtyDaysAgo && record.predictionTimestamp < thirtyDaysAgo);

      let recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
      
      if (recentRecords.length > 0 && previousRecords.length > 0) {
        const recentAvg = recentRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / recentRecords.length;
        const previousAvg = previousRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / previousRecords.length;
        
        const difference = recentAvg - previousAvg;
        if (difference > 2) recentTrend = 'IMPROVING';
        else if (difference < -2) recentTrend = 'DECLINING';
      }

      const stats: PredictionAccuracyStats = {
        totalPredictions,
        completedPredictions,
        averageAccuracy,
        accuracyByTimeframe,
        accuracyByConfidence,
        bestPerformingTimeframe,
        worstPerformingTimeframe,
        recentTrend,
        lastUpdated: Date.now()
      };

      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Error updating accuracy stats:', error);
    }
  }

  // Update individual coin accuracy histories
  private updateCoinHistories(): void {
    try {
      const records = this.getPredictionRecords();
      const coinHistories = new Map<string, CoinAccuracyHistory>();

      // Group records by coin
      const coinGroups = new Map<string, PredictionRecord[]>();
      records.forEach(record => {
        if (!coinGroups.has(record.coinId)) {
          coinGroups.set(record.coinId, []);
        }
        coinGroups.get(record.coinId)!.push(record);
      });

      // Calculate history for each coin
      Array.from(coinGroups.entries()).forEach(([coinId, coinRecords]) => {
        const completedRecords = coinRecords.filter(record => record.overallAccuracy !== undefined);
        
        if (completedRecords.length === 0) return;

        const totalPredictions = coinRecords.length;
        const averageAccuracy = completedRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / completedRecords.length;

        // Recent accuracy (last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentRecords = completedRecords.filter(record => record.predictionTimestamp >= sevenDaysAgo);
        const recentAccuracy = recentRecords.length > 0 ? 
          recentRecords.reduce((sum, record) => sum + record.overallAccuracy!, 0) / recentRecords.length : averageAccuracy;

        // Best and worst timeframes
        const timeframes = ['1h', '4h', '24h', '7d'] as const;
        const timeframeAccuracies = timeframes.map(timeframe => {
          const recordsWithTimeframe = completedRecords.filter(record => record.accuracyScores[timeframe] !== undefined);
          const accuracy = recordsWithTimeframe.length > 0 ? 
            recordsWithTimeframe.reduce((sum, record) => sum + record.accuracyScores[timeframe]!, 0) / recordsWithTimeframe.length : 0;
          return { timeframe, accuracy };
        });

        const bestTimeframe = timeframeAccuracies.reduce((best, current) => 
          current.accuracy > best.accuracy ? current : best).timeframe;
        const worstTimeframe = timeframeAccuracies.reduce((worst, current) => 
          current.accuracy < worst.accuracy ? current : worst).timeframe;

        // Confidence reliability (correlation between confidence and accuracy)
        const confidenceAccuracyPairs = completedRecords.map(record => ({
          confidence: record.confidence,
          accuracy: record.overallAccuracy!
        }));
        
        const confidenceReliability = this.calculateCorrelation(
          confidenceAccuracyPairs.map(pair => pair.confidence),
          confidenceAccuracyPairs.map(pair => pair.accuracy)
        );

        const lastPredictionDate = Math.max(...coinRecords.map(record => record.predictionTimestamp));

        coinHistories.set(coinId, {
          coinId,
          coinSymbol: coinRecords[0].coinSymbol,
          totalPredictions,
          averageAccuracy,
          recentAccuracy,
          bestTimeframe,
          worstTimeframe,
          confidenceReliability,
          lastPredictionDate
        });
      });

      // Save coin histories
      const historiesArray = Array.from(coinHistories.values());
      localStorage.setItem(this.COIN_HISTORY_KEY, JSON.stringify(historiesArray));
    } catch (error) {
      console.error('Error updating coin histories:', error);
    }
  }

  // Calculate correlation coefficient
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Start periodic updates
  private startPeriodicUpdates(): void {
    // Update immediately
    setTimeout(() => this.updatePredictionAccuracy(), 5000);
    
    // Then update every hour
    this.updateTimer = setInterval(() => {
      this.updatePredictionAccuracy();
    }, this.UPDATE_INTERVAL);
  }

  // Stop periodic updates
  stopPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Clear all prediction data (for testing/reset)
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STATS_KEY);
    localStorage.removeItem(this.COIN_HISTORY_KEY);
    console.log('📊 All prediction tracking data cleared');
  }
}

// Export singleton instance
export const predictionTracker = new PredictionTracker(); 