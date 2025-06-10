import { MarketHeatmapData, CorrelationMatrix, Coin } from '../types';
import { apiService } from './api';

class HeatmapService {
  private heatmapCache = new Map<string, MarketHeatmapData[]>();
  private correlationCache = new Map<string, CorrelationMatrix>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  async getMarketHeatmap(
    metric: 'price_change_24h' | 'price_change_7d' | 'market_cap' | 'volume_24h' = 'price_change_24h',
    limit: number = 100
  ): Promise<MarketHeatmapData[]> {
    try {
      const cacheKey = `heatmap-${metric}-${limit}`;
      const cached = this.heatmapCache.get(cacheKey);

      if (cached && cached[0]?.updated_at && this.isCacheValid(cached[0].updated_at)) {
        return cached;
      }

      // Get market data from our existing API service
      const coins = await apiService.getTopCoins(limit);
      if (!coins || coins.length === 0) {
        return [];
      }

      const heatmapData = this.generateHeatmapData(coins, metric);
      this.heatmapCache.set(cacheKey, heatmapData);

      return heatmapData;
    } catch (error) {
      console.error('Error generating market heatmap:', error);
      return [];
    }
  }

  private generateHeatmapData(coins: Coin[], metric: string): MarketHeatmapData[] {
    return coins
      .filter(coin => this.isValidCoin(coin))
      .map(coin => {
        const value = this.getMetricValue(coin, metric);
        const size = this.calculateSize(coin, metric);
        const color = this.calculateColor(value, metric);

        return {
          coin_id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          value,
          size,
          color,
          metric,
          market_cap: coin.market_cap,
          volume_24h: coin.total_volume,
          price_change_24h: coin.price_change_percentage_24h,
          price_change_7d: coin.price_change_percentage_7d || 0,
          updated_at: new Date().toISOString()
        };
      })
      .sort((a, b) => b.size - a.size); // Sort by size (market cap usually)
  }

  private isValidCoin(coin: Coin): boolean {
    // Filter out stablecoins, wrapped tokens, and invalid data
    const symbol = coin.symbol.toLowerCase();
    const name = coin.name.toLowerCase();
    
    const excludedSymbols = ['usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'weth', 'wbtc', 'steth'];
    const excludedPatterns = ['wrapped', 'staked', 'usd', 'dollar'];
    
    return !excludedSymbols.includes(symbol) &&
           !excludedPatterns.some(pattern => name.includes(pattern)) &&
           coin.market_cap > 0 &&
           coin.current_price > 0;
  }

  private getMetricValue(coin: Coin, metric: string): number {
    switch (metric) {
      case 'price_change_24h':
        return coin.price_change_percentage_24h;
      case 'price_change_7d':
        return coin.price_change_percentage_7d || 0;
      case 'market_cap':
        return coin.market_cap;
      case 'volume_24h':
        return coin.total_volume;
      default:
        return coin.price_change_percentage_24h;
    }
  }

  private calculateSize(coin: Coin, metric: string): number {
    // Size is typically based on market cap for visual representation
    if (metric === 'market_cap') {
      return coin.market_cap;
    } else if (metric === 'volume_24h') {
      return coin.total_volume;
    } else {
      // For price change metrics, use market cap for size
      return coin.market_cap;
    }
  }

  private calculateColor(value: number, metric: string): string {
    if (metric === 'market_cap' || metric === 'volume_24h') {
      // For absolute values, use blue scale
      const intensity = Math.min(1, Math.log10(value) / 12); // Normalize to 0-1
      const blue = Math.floor(255 * intensity);
      return `rgb(0, 100, ${blue})`;
    } else {
      // For percentage changes, use red/green scale
      const normalizedValue = Math.max(-50, Math.min(50, value)); // Clamp to -50% to +50%
      const intensity = Math.abs(normalizedValue) / 50;
      
      if (normalizedValue >= 0) {
        // Green for positive changes
        const green = Math.floor(255 * (0.3 + intensity * 0.7));
        return `rgb(0, ${green}, 0)`;
      } else {
        // Red for negative changes
        const red = Math.floor(255 * (0.3 + intensity * 0.7));
        return `rgb(${red}, 0, 0)`;
      }
    }
  }

  async getCorrelationMatrix(coinIds: string[], timeframe: '24h' | '7d' | '30d' = '24h'): Promise<CorrelationMatrix | null> {
    try {
      const cacheKey = `correlation-${coinIds.sort().join(',')}-${timeframe}`;
      const cached = this.correlationCache.get(cacheKey);

      if (cached && this.isCacheValid(cached.updated_at)) {
        return cached;
      }

      // Get coin data for correlation calculation
      const coins = await this.getCoinsData(coinIds);
      if (!coins || coins.length < 2) {
        return null;
      }

      const correlationMatrix = await this.calculateCorrelationMatrix(coins, timeframe);
      this.correlationCache.set(cacheKey, correlationMatrix);

      return correlationMatrix;
    } catch (error) {
      console.error('Error calculating correlation matrix:', error);
      return null;
    }
  }

  private async getCoinsData(coinIds: string[]): Promise<Coin[]> {
    try {
      // Get data for specific coins
      const coins: Coin[] = [];
      
      for (const coinId of coinIds) {
        try {
          const coinData = await apiService.getCoinDetail(coinId);
          if (coinData) {
            coins.push(coinData);
          }
        } catch (error) {
          console.warn(`Failed to get data for coin ${coinId}:`, error);
        }
      }

      return coins;
    } catch (error) {
      console.error('Error getting coins data:', error);
      return [];
    }
  }

  private async calculateCorrelationMatrix(coins: Coin[], timeframe: string): Promise<CorrelationMatrix> {
    const matrix: number[][] = [];
    const size = coins.length;

    // Initialize matrix
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(0);
    }

    // Calculate correlations
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with itself
        } else {
          matrix[i][j] = await this.calculatePairCorrelation(coins[i], coins[j], timeframe);
          matrix[j][i] = matrix[i][j]; // Symmetric matrix
        }
      }
    }

    return {
      coins: coins.map(c => c.id),
      matrix,
      timeframe,
      updated_at: new Date().toISOString()
    };
  }

  private async calculatePairCorrelation(coinA: Coin, coinB: Coin, timeframe: string): Promise<number> {
    try {
      // Get historical price data for both coins
      const days = this.getTimeframeDays(timeframe);
      
      const [priceHistoryA, priceHistoryB] = await Promise.all([
        apiService.getCoinHistory(coinA.id, 'usd', days),
        apiService.getCoinHistory(coinB.id, 'usd', days)
      ]);

      if (!priceHistoryA || !priceHistoryB || 
          priceHistoryA.length < 2 || priceHistoryB.length < 2) {
        // Fallback to current data correlation
        return this.calculateCurrentDataCorrelation(coinA, coinB);
      }

      // Calculate returns
      const returnsA = this.calculateReturns(priceHistoryA);
      const returnsB = this.calculateReturns(priceHistoryB);

      // Align data (take minimum length)
      const minLength = Math.min(returnsA.length, returnsB.length);
      const alignedReturnsA = returnsA.slice(-minLength);
      const alignedReturnsB = returnsB.slice(-minLength);

      // Calculate Pearson correlation coefficient
      return this.calculatePearsonCorrelation(alignedReturnsA, alignedReturnsB);
    } catch (error) {
      console.warn(`Error calculating correlation between ${coinA.symbol} and ${coinB.symbol}:`, error);
      return this.calculateCurrentDataCorrelation(coinA, coinB);
    }
  }

  private calculateCurrentDataCorrelation(coinA: Coin, coinB: Coin): number {
    // Fallback correlation based on current market data
    const priceChangeA = coinA.price_change_percentage_24h;
    const priceChangeB = coinB.price_change_percentage_24h;
    const marketCapRankA = coinA.market_cap_rank;
    const marketCapRankB = coinB.market_cap_rank;

    // Price movement correlation
    const sameDirection = (priceChangeA >= 0 && priceChangeB >= 0) || 
                         (priceChangeA < 0 && priceChangeB < 0);
    const magnitudeDiff = Math.abs(Math.abs(priceChangeA) - Math.abs(priceChangeB));
    
    let correlation = 0.3; // Base crypto correlation
    
    if (sameDirection) {
      correlation += 0.3;
      if (magnitudeDiff < 5) correlation += 0.2;
      else if (magnitudeDiff < 10) correlation += 0.1;
    }

    // Market cap rank correlation
    const rankDiff = Math.abs(marketCapRankA - marketCapRankB);
    if (rankDiff <= 10) correlation += 0.1;
    else if (rankDiff <= 50) correlation += 0.05;

    return Math.max(0, Math.min(1, correlation));
  }

  private calculateReturns(priceHistory: number[][]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < priceHistory.length; i++) {
      const currentPrice = priceHistory[i][1];
      const previousPrice = priceHistory[i - 1][1];
      
      if (previousPrice > 0) {
        const returnValue = (currentPrice - previousPrice) / previousPrice;
        returns.push(returnValue);
      }
    }
    
    return returns;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + (val * y[i]), 0);
    const sumX2 = x.reduce((sum, val) => sum + (val * val), 0);
    const sumY2 = y.reduce((sum, val) => sum + (val * val), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    if (denominator === 0) {
      return 0;
    }

    const correlation = numerator / denominator;
    return Math.max(-1, Math.min(1, correlation)); // Clamp to [-1, 1]
  }

  private getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  }

  async getSectorHeatmap(): Promise<MarketHeatmapData[]> {
    try {
      const cacheKey = 'sector-heatmap';
      const cached = this.heatmapCache.get(cacheKey);

      if (cached && cached[0]?.updated_at && this.isCacheValid(cached[0].updated_at)) {
        return cached;
      }

      // Get top coins and categorize by sector
      const coins = await apiService.getTopCoins(200);
      if (!coins || coins.length === 0) {
        return [];
      }

      const sectorData = this.categorizeBySector(coins);
      const heatmapData = this.generateSectorHeatmap(sectorData);
      
      this.heatmapCache.set(cacheKey, heatmapData);
      return heatmapData;
    } catch (error) {
      console.error('Error generating sector heatmap:', error);
      return [];
    }
  }

  private categorizeBySector(coins: Coin[]): { [sector: string]: Coin[] } {
    const sectors: { [sector: string]: Coin[] } = {
      'Layer 1': [],
      'DeFi': [],
      'Smart Contracts': [],
      'Exchange Tokens': [],
      'Gaming': [],
      'Meme Coins': [],
      'Privacy': [],
      'Infrastructure': [],
      'Other': []
    };

    coins.forEach(coin => {
      const symbol = coin.symbol.toLowerCase();
      const name = coin.name.toLowerCase();

      if (['btc', 'eth', 'ada', 'sol', 'dot', 'avax', 'matic', 'atom'].includes(symbol)) {
        sectors['Layer 1'].push(coin);
      } else if (['uni', 'aave', 'comp', 'mkr', 'snx', 'crv', 'sushi'].includes(symbol) ||
                 name.includes('defi') || name.includes('swap') || name.includes('finance')) {
        sectors['DeFi'].push(coin);
      } else if (['bnb', 'cro', 'ftt', 'kcs', 'ht'].includes(symbol)) {
        sectors['Exchange Tokens'].push(coin);
      } else if (name.includes('game') || name.includes('gaming') || ['axs', 'sand', 'mana'].includes(symbol)) {
        sectors['Gaming'].push(coin);
      } else if (['doge', 'shib', 'floki', 'pepe'].includes(symbol) || name.includes('meme')) {
        sectors['Meme Coins'].push(coin);
      } else if (['xmr', 'zcash', 'dash'].includes(symbol) || name.includes('privacy')) {
        sectors['Privacy'].push(coin);
      } else if (name.includes('oracle') || name.includes('infrastructure') || ['link', 'grt'].includes(symbol)) {
        sectors['Infrastructure'].push(coin);
      } else {
        sectors['Other'].push(coin);
      }
    });

    return sectors;
  }

  private generateSectorHeatmap(sectorData: { [sector: string]: Coin[] }): MarketHeatmapData[] {
    const heatmapData: MarketHeatmapData[] = [];

    Object.entries(sectorData).forEach(([sector, coins]) => {
      if (coins.length === 0) return;

      const totalMarketCap = coins.reduce((sum, coin) => sum + coin.market_cap, 0);
      const avgPriceChange24h = coins.reduce((sum, coin) => sum + coin.price_change_percentage_24h, 0) / coins.length;
      const avgPriceChange7d = coins.reduce((sum, coin) => sum + (coin.price_change_percentage_7d || 0), 0) / coins.length;
      const totalVolume = coins.reduce((sum, coin) => sum + coin.total_volume, 0);

      heatmapData.push({
        coin_id: sector.toLowerCase().replace(/\s+/g, '-'),
        symbol: sector.toUpperCase(),
        name: sector,
        value: avgPriceChange24h,
        size: totalMarketCap,
        color: this.calculateColor(avgPriceChange24h, 'price_change_24h'),
        metric: 'sector_performance',
        market_cap: totalMarketCap,
        volume_24h: totalVolume,
        price_change_24h: avgPriceChange24h,
        price_change_7d: avgPriceChange7d,
        updated_at: new Date().toISOString()
      });
    });

    return heatmapData.sort((a, b) => (b.size || 0) - (a.size || 0));
  }

  private isCacheValid(updatedAt: string): boolean {
    if (!updatedAt) return false;
    return (Date.now() - new Date(updatedAt).getTime()) < this.CACHE_DURATION;
  }

  // Utility method to get heatmap data for specific coins
  async getCustomHeatmap(coinIds: string[], metric: string): Promise<MarketHeatmapData[]> {
    try {
      const coins = await this.getCoinsData(coinIds);
      if (!coins || coins.length === 0) {
        return [];
      }

      return this.generateHeatmapData(coins, metric);
    } catch (error) {
      console.error('Error generating custom heatmap:', error);
      return [];
    }
  }

  // Method to get correlation strength categories
  getCorrelationStrength(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'Very Strong';
    if (abs >= 0.6) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'Very Weak';
  }

  // Method to get top correlated pairs
  getTopCorrelatedPairs(correlationMatrix: CorrelationMatrix, limit: number = 10): Array<{
    coinA: string;
    coinB: string;
    correlation: number;
    strength: string;
  }> {
    const pairs: Array<{
      coinA: string;
      coinB: string;
      correlation: number;
      strength: string;
    }> = [];

    for (let i = 0; i < correlationMatrix.coins.length; i++) {
      for (let j = i + 1; j < correlationMatrix.coins.length; j++) {
        const correlation = correlationMatrix.matrix[i][j];
        pairs.push({
          coinA: correlationMatrix.coins[i],
          coinB: correlationMatrix.coins[j],
          correlation,
          strength: this.getCorrelationStrength(correlation)
        });
      }
    }

    return pairs
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, limit);
  }
}

export const heatmapService = new HeatmapService(); 