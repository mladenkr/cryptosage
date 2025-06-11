import { ChartData, CandlestickData, VolumeProfile, FibonacciLevel, SupportResistance, ChartPattern } from '../types';
import { apiService } from './api';

class InteractiveChartsService {
  private chartCache = new Map<string, ChartData>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCandlestickData(
    coinId: string,
    timeframe: '1h' | '4h' | '1d' | '1w' | '1M',
    days: number = 30
  ): Promise<CandlestickData[]> {
    try {
      const cacheKey = `${coinId}-${timeframe}-${days}`;
      const cached = this.chartCache.get(cacheKey);

      if (cached && cached.updated_at && (Date.now() - new Date(cached.updated_at).getTime()) < this.CACHE_DURATION) {
        return cached.candlestick_data || [];
      }

      // Get OHLC data from CoinGecko
      const ohlcData = await this.fetchOHLCData(coinId, days);
      const candlestickData = this.convertToCandlestickData(ohlcData, timeframe);

      // Cache the result
      const chartData: ChartData = {
        coin_id: coinId,
        timeframe,
        candlestick_data: candlestickData,
        volume_profile: await this.calculateVolumeProfile(candlestickData),
        fibonacci_levels: this.calculateFibonacciLevels(candlestickData),
        support_resistance: this.calculateSupportResistance(candlestickData),
        chart_patterns: this.detectChartPatterns(candlestickData),
        updated_at: new Date().toISOString()
      };

      this.chartCache.set(cacheKey, chartData);
      return candlestickData;
    } catch (error) {
      console.error('Error fetching candlestick data:', error);
      return [];
    }
  }

  private async fetchOHLCData(coinId: string, days: number): Promise<any[]> {
    try {
      // Try CoinGecko OHLC endpoint
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
      );

      if (response.ok) {
        return await response.json();
      }

      // Fallback to price history and estimate OHLC
      const priceHistory = await apiService.getCoinHistory(coinId, 'usd', days);
      return this.estimateOHLCFromPrices(priceHistory);
    } catch (error) {
      console.error('Error fetching OHLC data:', error);
      return [];
    }
  }

  private estimateOHLCFromPrices(priceHistory: number[][]): any[] {
    if (!priceHistory || priceHistory.length === 0) return [];

    const ohlcData: any[] = [];
    const groupSize = Math.max(1, Math.floor(priceHistory.length / 100)); // Group into ~100 candles

    for (let i = 0; i < priceHistory.length; i += groupSize) {
      const group = priceHistory.slice(i, i + groupSize);
      if (group.length === 0) continue;

      const prices = group.map(p => p[1]);
      const timestamp = group[0][0];
      
      const open = prices[0];
      const close = prices[prices.length - 1];
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      
      // Set volume to 0 when not available - no mock data
      const volume = 0;

      ohlcData.push([timestamp, open, high, low, close, volume]);
    }

    return ohlcData;
  }

  private convertToCandlestickData(ohlcData: any[], timeframe: string): CandlestickData[] {
    return ohlcData.map(candle => ({
      timestamp: new Date(candle[0]).toISOString(),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5] || 0,
      timeframe
    }));
  }

  private async calculateVolumeProfile(candlestickData: CandlestickData[]): Promise<VolumeProfile[]> {
    if (!candlestickData || candlestickData.length === 0) return [];

    // Calculate price levels and volume distribution
    const priceRange = this.getPriceRange(candlestickData);
    const levelCount = 20; // Number of price levels
    const levelSize = (priceRange.max - priceRange.min) / levelCount;

    const volumeProfile: VolumeProfile[] = [];

    for (let i = 0; i < levelCount; i++) {
      const priceLevel = priceRange.min + (i * levelSize);
      const upperBound = priceLevel + levelSize;
      
      let totalVolume = 0;
      let buyVolume = 0;
      let sellVolume = 0;

      candlestickData.forEach(candle => {
        // Check if candle overlaps with this price level
        if (candle.low <= upperBound && candle.high >= priceLevel) {
          const volumeInLevel = candle.volume * this.getOverlapRatio(candle, priceLevel, upperBound);
          totalVolume += volumeInLevel;

          // Estimate buy/sell volume based on candle color
          if (candle.close > candle.open) {
            buyVolume += volumeInLevel * 0.6; // Bullish candle
            sellVolume += volumeInLevel * 0.4;
          } else {
            buyVolume += volumeInLevel * 0.4; // Bearish candle
            sellVolume += volumeInLevel * 0.6;
          }
        }
      });

      if (totalVolume > 0) {
        volumeProfile.push({
          price_level: priceLevel,
          total_volume: totalVolume,
          buy_volume: buyVolume,
          sell_volume: sellVolume,
          volume_percentage: 0 // Will be calculated after all levels
        });
      }
    }

    // Calculate volume percentages
    const totalVolumeAll = volumeProfile.reduce((sum, vp) => sum + (vp.total_volume || 0), 0);
    volumeProfile.forEach(vp => {
      if (vp.total_volume) {
        vp.volume_percentage = (vp.total_volume / totalVolumeAll) * 100;
      }
    });

    return volumeProfile.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
  }

  private getPriceRange(candlestickData: CandlestickData[]): { min: number; max: number } {
    const allPrices = candlestickData.flatMap(candle => [candle.high, candle.low]);
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices)
    };
  }

  private getOverlapRatio(candle: CandlestickData, levelLow: number, levelHigh: number): number {
    const candleRange = candle.high - candle.low;
    if (candleRange === 0) return 0;

    const overlapLow = Math.max(candle.low, levelLow);
    const overlapHigh = Math.min(candle.high, levelHigh);
    const overlap = Math.max(0, overlapHigh - overlapLow);

    return overlap / candleRange;
  }

  calculateFibonacciLevels(candlestickData: CandlestickData[]): FibonacciLevel[] {
    if (!candlestickData || candlestickData.length < 2) return [];

    const priceRange = this.getPriceRange(candlestickData);
    const range = priceRange.max - priceRange.min;

    const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const fibLevels: FibonacciLevel[] = [];

    fibRatios.forEach(ratio => {
      const level = priceRange.max - (range * ratio);
      const strength = this.calculateLevelStrength(level, candlestickData);

      fibLevels.push({
        level,
        ratio,
        type: ratio === 0 ? 'resistance' : ratio === 1 ? 'support' : 'retracement',
        strength,
        touches: this.countLevelTouches(level, candlestickData)
      });
    });

    return fibLevels;
  }

  private calculateSupportResistance(candlestickData: CandlestickData[]): SupportResistance[] {
    if (!candlestickData || candlestickData.length < 10) return [];

    const levels: SupportResistance[] = [];
    const window = 5; // Look for peaks/troughs in 5-candle windows

    for (let i = window; i < candlestickData.length - window; i++) {
      const current = candlestickData[i];
      const leftWindow = candlestickData.slice(i - window, i);
      const rightWindow = candlestickData.slice(i + 1, i + window + 1);

      // Check for resistance (local high)
      const isResistance = leftWindow.every(c => c.high <= current.high) &&
                          rightWindow.every(c => c.high <= current.high);

      // Check for support (local low)
      const isSupport = leftWindow.every(c => c.low >= current.low) &&
                       rightWindow.every(c => c.low >= current.low);

      if (isResistance) {
        levels.push({
          level: current.high,
          type: 'resistance',
          strength: this.calculateLevelStrength(current.high, candlestickData),
          touches: this.countLevelTouches(current.high, candlestickData),
          first_touch: current.timestamp,
          last_touch: this.getLastTouch(current.high, candlestickData)
        });
      }

      if (isSupport) {
        levels.push({
          level: current.low,
          type: 'support',
          strength: this.calculateLevelStrength(current.low, candlestickData),
          touches: this.countLevelTouches(current.low, candlestickData),
          first_touch: current.timestamp,
          last_touch: this.getLastTouch(current.low, candlestickData)
        });
      }
    }

    // Remove duplicate levels and sort by strength
    return this.consolidateLevels(levels);
  }

  private calculateLevelStrength(level: number, candlestickData: CandlestickData[]): number {
    const touches = this.countLevelTouches(level, candlestickData);
    const recentTouches = this.countRecentTouches(level, candlestickData, 30); // Last 30 candles
    const volumeAtLevel = this.getVolumeAtLevel(level, candlestickData);

    // Strength based on touches, recency, and volume
    let strength = Math.min(100, touches * 20); // Base strength from touches
    strength += recentTouches * 10; // Bonus for recent activity
    strength += Math.min(20, volumeAtLevel / 1000000); // Volume component

    return Math.round(strength);
  }

  private countLevelTouches(level: number, candlestickData: CandlestickData[], tolerance: number = 0.02): number {
    const toleranceAmount = level * tolerance;
    return candlestickData.filter(candle =>
      (candle.high >= level - toleranceAmount && candle.high <= level + toleranceAmount) ||
      (candle.low >= level - toleranceAmount && candle.low <= level + toleranceAmount)
    ).length;
  }

  private countRecentTouches(level: number, candlestickData: CandlestickData[], recentCount: number): number {
    const recentData = candlestickData.slice(-recentCount);
    return this.countLevelTouches(level, recentData);
  }

  private getVolumeAtLevel(level: number, candlestickData: CandlestickData[], tolerance: number = 0.02): number {
    const toleranceAmount = level * tolerance;
    return candlestickData
      .filter(candle =>
        candle.low <= level + toleranceAmount && candle.high >= level - toleranceAmount
      )
      .reduce((sum, candle) => sum + candle.volume, 0);
  }

  private getLastTouch(level: number, candlestickData: CandlestickData[]): string {
    const toleranceAmount = level * 0.02;
    
    for (let i = candlestickData.length - 1; i >= 0; i--) {
      const candle = candlestickData[i];
      if ((candle.high >= level - toleranceAmount && candle.high <= level + toleranceAmount) ||
          (candle.low >= level - toleranceAmount && candle.low <= level + toleranceAmount)) {
        return candle.timestamp;
      }
    }
    
    return candlestickData[0]?.timestamp || new Date().toISOString();
  }

  private consolidateLevels(levels: SupportResistance[]): SupportResistance[] {
    const consolidated: SupportResistance[] = [];
    const tolerance = 0.03; // 3% tolerance for consolidation

    levels.forEach(level => {
      const existing = consolidated.find(c =>
        Math.abs(c.level - level.level) / level.level < tolerance &&
        c.type === level.type
      );

      if (existing) {
        // Merge with existing level
        existing.touches += level.touches;
        existing.strength = Math.max(existing.strength, level.strength);
        if (new Date(level.last_touch) > new Date(existing.last_touch)) {
          existing.last_touch = level.last_touch;
        }
      } else {
        consolidated.push(level);
      }
    });

    return consolidated
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10); // Keep top 10 levels
  }

  private detectChartPatterns(candlestickData: CandlestickData[]): ChartPattern[] {
    if (!candlestickData || candlestickData.length < 20) return [];

    const patterns: ChartPattern[] = [];

    // Detect Head and Shoulders
    const headAndShoulders = this.detectHeadAndShoulders(candlestickData);
    if (headAndShoulders) patterns.push(headAndShoulders);

    // Detect Double Top/Bottom
    const doubleTopBottom = this.detectDoubleTopBottom(candlestickData);
    if (doubleTopBottom) patterns.push(doubleTopBottom);

    // Detect Triangle patterns
    const triangles = this.detectTriangles(candlestickData);
    patterns.push(...triangles);

    // Detect Flag/Pennant patterns
    const flagPennant = this.detectFlagPennant(candlestickData);
    if (flagPennant) patterns.push(flagPennant);

    return patterns;
  }

  private detectHeadAndShoulders(candlestickData: CandlestickData[]): ChartPattern | null {
    const recentData = candlestickData.slice(-50); // Look at last 50 candles
    if (recentData.length < 20) return null;

    // Find three peaks
    const peaks = this.findPeaks(recentData, 3);
    if (peaks.length < 3) return null;

    const [leftShoulder, head, rightShoulder] = peaks.slice(-3);

    // Check if it forms a head and shoulders pattern
    if (head.high > leftShoulder.high && head.high > rightShoulder.high &&
        Math.abs(leftShoulder.high - rightShoulder.high) / leftShoulder.high < 0.05) {
      
      return {
        pattern_type: 'HEAD_AND_SHOULDERS',
        confidence: this.calculatePatternConfidence('head_and_shoulders', [leftShoulder, head, rightShoulder]),
        start_date: leftShoulder.timestamp,
        end_date: rightShoulder.timestamp,
        target_price: this.calculateHeadAndShouldersTarget(leftShoulder, head, rightShoulder),
        key_levels: [leftShoulder.high, head.high, rightShoulder.high],
        description: 'Bearish reversal pattern with three peaks'
      };
    }

    return null;
  }

  private detectDoubleTopBottom(candlestickData: CandlestickData[]): ChartPattern | null {
    const recentData = candlestickData.slice(-40);
    if (recentData.length < 15) return null;

    const peaks = this.findPeaks(recentData, 2);
    const troughs = this.findTroughs(recentData, 2);

    // Check for double top
    if (peaks.length >= 2) {
      const [first, second] = peaks.slice(-2);
      if (Math.abs(first.high - second.high) / first.high < 0.03) {
        return {
          pattern_type: 'DOUBLE_TOP',
          confidence: this.calculatePatternConfidence('double_top', [first, second]),
          start_date: first.timestamp,
          end_date: second.timestamp,
          target_price: first.high - (first.high - Math.min(...recentData.map(c => c.low))),
          key_levels: [first.high, second.high],
          description: 'Bearish reversal pattern with two similar peaks'
        };
      }
    }

    // Check for double bottom
    if (troughs.length >= 2) {
      const [first, second] = troughs.slice(-2);
      if (Math.abs(first.low - second.low) / first.low < 0.03) {
        return {
          pattern_type: 'DOUBLE_BOTTOM',
          confidence: this.calculatePatternConfidence('double_bottom', [first, second]),
          start_date: first.timestamp,
          end_date: second.timestamp,
          target_price: first.low + (Math.max(...recentData.map(c => c.high)) - first.low),
          key_levels: [first.low, second.low],
          description: 'Bullish reversal pattern with two similar troughs'
        };
      }
    }

    return null;
  }

  private detectTriangles(candlestickData: CandlestickData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const recentData = candlestickData.slice(-30);
    
    if (recentData.length < 15) return patterns;

    const highs = recentData.map(c => c.high);
    const lows = recentData.map(c => c.low);

    // Check for ascending triangle (horizontal resistance, rising support)
    const resistanceLevel = Math.max(...highs.slice(-10));
    const supportTrend = this.calculateTrendSlope(lows);

    if (supportTrend > 0 && this.isHorizontalLevel(highs.slice(-10))) {
      patterns.push({
        pattern_type: 'TRIANGLE',
        confidence: 70,
        start_date: recentData[0].timestamp,
        end_date: recentData[recentData.length - 1].timestamp,
        target_price: resistanceLevel + (resistanceLevel - Math.min(...lows)),
        key_levels: [resistanceLevel, Math.min(...lows)],
        description: 'Bullish continuation pattern with rising support'
      });
    }

    return patterns;
  }

  private detectFlagPennant(candlestickData: CandlestickData[]): ChartPattern | null {
    const recentData = candlestickData.slice(-20);
    if (recentData.length < 10) return null;

    // Look for strong move followed by consolidation
    const priceMove = (recentData[recentData.length - 1].close - recentData[0].open) / recentData[0].open;
    
    if (Math.abs(priceMove) > 0.1) { // 10% move
      const consolidationData = recentData.slice(-10);
      const volatility = this.calculateVolatility(consolidationData);
      
      if (volatility < 0.05) { // Low volatility consolidation
        return {
          pattern_type: 'FLAG',
          confidence: 65,
          start_date: recentData[0].timestamp,
          end_date: recentData[recentData.length - 1].timestamp,
          target_price: recentData[recentData.length - 1].close + (priceMove * recentData[0].open),
          key_levels: [recentData[0].open, recentData[recentData.length - 1].close],
          description: `${priceMove > 0 ? 'Bullish' : 'Bearish'} continuation pattern`
        };
      }
    }

    return null;
  }

  private findPeaks(data: CandlestickData[], minPeaks: number): CandlestickData[] {
    const peaks: CandlestickData[] = [];
    const window = 3;

    for (let i = window; i < data.length - window; i++) {
      const current = data[i];
      const leftWindow = data.slice(i - window, i);
      const rightWindow = data.slice(i + 1, i + window + 1);

      if (leftWindow.every(c => c.high <= current.high) &&
          rightWindow.every(c => c.high <= current.high)) {
        peaks.push(current);
      }
    }

    return peaks.sort((a, b) => b.high - a.high).slice(0, minPeaks * 2);
  }

  private findTroughs(data: CandlestickData[], minTroughs: number): CandlestickData[] {
    const troughs: CandlestickData[] = [];
    const window = 3;

    for (let i = window; i < data.length - window; i++) {
      const current = data[i];
      const leftWindow = data.slice(i - window, i);
      const rightWindow = data.slice(i + 1, i + window + 1);

      if (leftWindow.every(c => c.low >= current.low) &&
          rightWindow.every(c => c.low >= current.low)) {
        troughs.push(current);
      }
    }

    return troughs.sort((a, b) => a.low - b.low).slice(0, minTroughs * 2);
  }

  private calculatePatternConfidence(patternType: string, keyPoints: CandlestickData[]): number {
    // Base confidence varies by pattern type
    const baseConfidence = {
      'head_and_shoulders': 75,
      'double_top': 70,
      'double_bottom': 70,
      'ascending_triangle': 65,
      'bull_flag': 60,
      'bear_flag': 60
    };

    let confidence = baseConfidence[patternType as keyof typeof baseConfidence] || 50;

    // Adjust based on volume confirmation
    const avgVolume = keyPoints.reduce((sum, point) => sum + point.volume, 0) / keyPoints.length;
    if (avgVolume > 1000000) confidence += 10; // High volume confirmation

    // Adjust based on pattern clarity
    const priceRange = Math.max(...keyPoints.map(p => p.high)) - Math.min(...keyPoints.map(p => p.low));
    const avgPrice = keyPoints.reduce((sum, point) => sum + point.close, 0) / keyPoints.length;
    const rangeRatio = priceRange / avgPrice;
    
    if (rangeRatio > 0.1) confidence += 5; // Clear price movement

    return Math.min(100, Math.max(30, confidence));
  }

  private calculateHeadAndShouldersTarget(
    leftShoulder: CandlestickData,
    head: CandlestickData,
    rightShoulder: CandlestickData
  ): number {
    const necklineLevel = (leftShoulder.low + rightShoulder.low) / 2;
    const headHeight = head.high - necklineLevel;
    return necklineLevel - headHeight; // Target below neckline
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private isHorizontalLevel(values: number[], tolerance: number = 0.02): boolean {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.every(val => Math.abs(val - avg) / avg < tolerance);
  }

  private calculateVolatility(data: CandlestickData[]): number {
    if (data.length < 2) return 0;
    
    const returns = data.slice(1).map((candle, index) =>
      Math.log(candle.close / data[index].close)
    );
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  async getChartData(coinId: string, timeframe: string): Promise<ChartData | null> {
    try {
      const cacheKey = `${coinId}-${timeframe}`;
      const cached = this.chartCache.get(cacheKey);

      if (cached && cached.updated_at && (Date.now() - new Date(cached.updated_at).getTime()) < this.CACHE_DURATION) {
        return cached;
      }

      const days = this.getDaysFromTimeframe(timeframe);
      const candlestickData = await this.getCandlestickData(coinId, timeframe as any, days);

      const chartData: ChartData = {
        coin_id: coinId,
        timeframe,
        candlestick_data: candlestickData,
        volume_profile: await this.calculateVolumeProfile(candlestickData),
        fibonacci_levels: this.calculateFibonacciLevels(candlestickData),
        support_resistance: this.calculateSupportResistance(candlestickData),
        chart_patterns: this.detectChartPatterns(candlestickData),
        updated_at: new Date().toISOString()
      };

      this.chartCache.set(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error getting chart data:', error);
      return null;
    }
  }

  private getDaysFromTimeframe(timeframe: string): number {
    const timeframeDays = {
      '1h': 7,
      '4h': 30,
      '1d': 90,
      '1w': 365,
      '1M': 1095
    };
    return timeframeDays[timeframe as keyof typeof timeframeDays] || 30;
  }
}

export const interactiveChartsService = new InteractiveChartsService(); 