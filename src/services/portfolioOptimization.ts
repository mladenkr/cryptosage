import { PortfolioOptimization, Coin, CorrelationMatrix } from '../types';

class PortfolioOptimizationService {
  private correlationCache = new Map<string, CorrelationMatrix>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  async optimizePortfolio(
    coins: Coin[],
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
    targetReturn?: number
  ): Promise<PortfolioOptimization | null> {
    try {
      if (!coins || coins.length === 0) {
        return null;
      }

      const correlationMatrix = await this.calculateCorrelationMatrix(coins);
      const allocation = this.calculateOptimalAllocation(coins, riskTolerance, correlationMatrix);

      return {
        recommended_allocation: allocation,
        risk_score: this.calculatePortfolioRisk(allocation, correlationMatrix, coins),
        expected_return: this.calculateExpectedReturn(allocation, coins),
        sharpe_ratio: this.calculateSharpeRatio(allocation, coins),
        max_drawdown: this.calculateMaxDrawdown(allocation, coins),
        diversification_score: this.calculateDiversificationScore(allocation, correlationMatrix),
        correlation_matrix: this.formatCorrelationMatrix(correlationMatrix, coins)
      };
    } catch (error) {
      console.error('Error optimizing portfolio:', error);
      return null; // Return null instead of mock data
    }
  }

  private async calculateCorrelationMatrix(coins: Coin[]): Promise<CorrelationMatrix> {
    const coinIds = coins.map(c => c.id);
    const cacheKey = coinIds.sort().join(',');
    const cached = this.correlationCache.get(cacheKey);

    if (cached && (Date.now() - new Date(cached.updated_at).getTime()) < this.CACHE_DURATION) {
      return cached;
    }

    // Calculate correlation based on actual price change data
    const matrix = this.generateCorrelationFromPriceData(coins);
    const correlationMatrix: CorrelationMatrix = {
      coins: coinIds,
      matrix,
      timeframe: '30d',
      updated_at: new Date().toISOString()
    };

    this.correlationCache.set(cacheKey, correlationMatrix);
    return correlationMatrix;
  }

  private generateCorrelationFromPriceData(coins: Coin[]): number[][] {
    const size = coins.length;
    const matrix: number[][] = [];

    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with itself
        } else {
          // Calculate correlation based on price changes and market cap similarity
          const coinI = coins[i];
          const coinJ = coins[j];
          
          // Use actual market data to estimate correlation
          const priceChangeI = coinI.price_change_percentage_24h;
          const priceChangeJ = coinJ.price_change_percentage_24h;
          const marketCapRatioI = coinI.market_cap_rank;
          const marketCapRatioJ = coinJ.market_cap_rank;
          
          // Calculate correlation based on price movement similarity and market cap proximity
          const priceCorrelation = this.calculatePriceCorrelation(priceChangeI, priceChangeJ);
          const marketCapCorrelation = this.calculateMarketCapCorrelation(marketCapRatioI, marketCapRatioJ);
          
          // Weighted average of correlations
          const correlation = (priceCorrelation * 0.7) + (marketCapCorrelation * 0.3);
          matrix[i][j] = Math.round(correlation * 100) / 100;
          matrix[j][i] = matrix[i][j]; // Symmetric matrix
        }
      }
    }

    return matrix;
  }

  private calculatePriceCorrelation(changeI: number, changeJ: number): number {
    // Simple correlation based on price change direction and magnitude
    const sameDirection = (changeI >= 0 && changeJ >= 0) || (changeI < 0 && changeJ < 0);
    const magnitudeDiff = Math.abs(Math.abs(changeI) - Math.abs(changeJ));
    
    let correlation = 0.3; // Base crypto correlation
    
    if (sameDirection) {
      correlation += 0.3;
      // Higher correlation if similar magnitude
      if (magnitudeDiff < 5) correlation += 0.2;
      else if (magnitudeDiff < 10) correlation += 0.1;
    }
    
    return Math.max(0, Math.min(1, correlation));
  }

  private calculateMarketCapCorrelation(rankI: number, rankJ: number): number {
    // Assets with similar market cap ranks tend to be more correlated
    const rankDiff = Math.abs(rankI - rankJ);
    
    if (rankDiff <= 5) return 0.8; // Very similar ranks
    if (rankDiff <= 20) return 0.6; // Similar ranks
    if (rankDiff <= 50) return 0.4; // Moderate difference
    return 0.2; // Large difference
  }

  private calculateOptimalAllocation(
    coins: Coin[],
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
    correlationMatrix: CorrelationMatrix
  ): { [coinId: string]: number } {
    const allocation: { [coinId: string]: number } = {};
    
    // Risk-based allocation weights
    const riskWeights = {
      CONSERVATIVE: { btc: 0.4, eth: 0.3, stablecoins: 0.2, others: 0.1 },
      MODERATE: { btc: 0.3, eth: 0.25, stablecoins: 0.1, others: 0.35 },
      AGGRESSIVE: { btc: 0.2, eth: 0.2, stablecoins: 0.05, others: 0.55 }
    };

    const weights = riskWeights[riskTolerance];
    
    // Filter out stablecoins and wrapped tokens for main allocation
    const validCoins = coins.filter(coin => !this.isExcludedToken(coin));
    
    if (validCoins.length === 0) {
      return {};
    }

    // Allocate to major coins first
    validCoins.forEach(coin => {
      let weight = 0;
      
      if (coin.symbol.toLowerCase() === 'btc') {
        weight = weights.btc;
      } else if (coin.symbol.toLowerCase() === 'eth') {
        weight = weights.eth;
      } else {
        // Distribute remaining weight based on market cap and volatility
        const marketCapWeight = coin.market_cap / this.getTotalMarketCap(validCoins);
        const volatilityAdjustment = this.getVolatilityAdjustment(coin, riskTolerance);
        weight = (weights.others * marketCapWeight * volatilityAdjustment);
      }

      allocation[coin.id] = Math.round(weight * 100) / 100;
    });

    // Normalize to ensure total allocation equals 100%
    this.normalizeAllocation(allocation);

    return allocation;
  }

  private isExcludedToken(coin: Coin): boolean {
    const symbol = coin.symbol.toLowerCase();
    const name = coin.name.toLowerCase();
    
    // Exclude stablecoins, wrapped tokens, and staked tokens
    const stablecoinSymbols = ['usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd'];
    const wrappedTokens = ['weth', 'wbtc', 'wbnb', 'wmatic', 'wavax'];
    const stakedTokens = ['steth', 'reth', 'cbeth', 'sfrxeth'];
    
    return stablecoinSymbols.includes(symbol) ||
           wrappedTokens.includes(symbol) ||
           stakedTokens.includes(symbol) ||
           name.includes('wrapped') ||
           name.includes('staked') ||
           name.includes('usd') ||
           name.includes('dollar');
  }

  private getTotalMarketCap(coins: Coin[]): number {
    return coins.reduce((sum, coin) => sum + coin.market_cap, 0);
  }

  private getVolatilityAdjustment(coin: Coin, riskTolerance: string): number {
    const volatility = Math.abs(coin.price_change_percentage_24h) / 100;
    
    switch (riskTolerance) {
      case 'CONSERVATIVE':
        return Math.max(0.1, 1 - volatility); // Prefer low volatility
      case 'MODERATE':
        return 1; // Neutral
      case 'AGGRESSIVE':
        return Math.min(2, 1 + volatility); // Prefer high volatility
      default:
        return 1;
    }
  }

  private normalizeAllocation(allocation: { [coinId: string]: number }): void {
    const total = Object.values(allocation).reduce((sum, weight) => sum + weight, 0);
    
    if (total > 0 && total !== 1) {
      Object.keys(allocation).forEach(coinId => {
        allocation[coinId] = Math.round((allocation[coinId] / total) * 100) / 100;
      });
    }
  }

  private calculatePortfolioRisk(
    allocation: { [coinId: string]: number },
    correlationMatrix: CorrelationMatrix,
    coins: Coin[]
  ): number {
    // Calculate portfolio risk using actual volatility data
    let portfolioVariance = 0;
    const coinIds = Object.keys(allocation);

    for (let i = 0; i < coinIds.length; i++) {
      for (let j = 0; j < coinIds.length; j++) {
        const coinI = coins.find(c => c.id === coinIds[i]);
        const coinJ = coins.find(c => c.id === coinIds[j]);
        
        if (coinI && coinJ) {
          const weightI = allocation[coinIds[i]];
          const weightJ = allocation[coinIds[j]];
          const volatilityI = Math.abs(coinI.price_change_percentage_24h) / 100;
          const volatilityJ = Math.abs(coinJ.price_change_percentage_24h) / 100;
          const correlation = correlationMatrix.matrix[i]?.[j] || 0;

          portfolioVariance += weightI * weightJ * volatilityI * volatilityJ * correlation;
        }
      }
    }

    return Math.sqrt(Math.abs(portfolioVariance)) * 100; // Convert to percentage
  }

  private calculateExpectedReturn(allocation: { [coinId: string]: number }, coins: Coin[]): number {
    let expectedReturn = 0;

    Object.entries(allocation).forEach(([coinId, weight]) => {
      const coin = coins.find(c => c.id === coinId);
      if (coin) {
        // Use 24h change as proxy for expected return
        expectedReturn += weight * coin.price_change_percentage_24h;
      }
    });

    return expectedReturn;
  }

  private calculateSharpeRatio(allocation: { [coinId: string]: number }, coins: Coin[]): number {
    const expectedReturn = this.calculateExpectedReturn(allocation, coins);
    const riskFreeRate = 2; // Assume 2% risk-free rate
    const portfolioRisk = this.calculatePortfolioRisk(allocation, { coins: [], matrix: [], timeframe: '', updated_at: '' }, coins);

    return portfolioRisk > 0 ? (expectedReturn - riskFreeRate) / portfolioRisk : 0;
  }

  private calculateMaxDrawdown(allocation: { [coinId: string]: number }, coins: Coin[]): number {
    // Calculate max drawdown based on ATH distances
    let weightedDrawdown = 0;

    Object.entries(allocation).forEach(([coinId, weight]) => {
      const coin = coins.find(c => c.id === coinId);
      if (coin && coin.ath > 0) {
        const drawdown = ((coin.ath - coin.current_price) / coin.ath) * 100;
        weightedDrawdown += weight * drawdown;
      }
    });

    return weightedDrawdown;
  }

  private calculateDiversificationScore(
    allocation: { [coinId: string]: number },
    correlationMatrix: CorrelationMatrix
  ): number {
    const weights = Object.values(allocation);
    
    if (weights.length === 0) return 0;

    // Concentration score (lower is better for diversification)
    const herfindahlIndex = weights.reduce((sum, weight) => sum + weight * weight, 0);
    const concentrationScore = (1 - herfindahlIndex) * 100;

    // Correlation score (lower average correlation is better)
    let avgCorrelation = 0;
    let pairCount = 0;

    for (let i = 0; i < correlationMatrix.matrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix.matrix[i].length; j++) {
        avgCorrelation += Math.abs(correlationMatrix.matrix[i][j]);
        pairCount++;
      }
    }

    avgCorrelation = pairCount > 0 ? avgCorrelation / pairCount : 0;
    const correlationScore = (1 - avgCorrelation) * 100;

    // Combined diversification score
    return (concentrationScore + correlationScore) / 2;
  }

  private formatCorrelationMatrix(
    correlationMatrix: CorrelationMatrix,
    coins: Coin[]
  ): { [coinId: string]: { [coinId: string]: number } } {
    const formatted: { [coinId: string]: { [coinId: string]: number } } = {};

    coins.forEach((coinI, i) => {
      formatted[coinI.id] = {};
      coins.forEach((coinJ, j) => {
        formatted[coinI.id][coinJ.id] = correlationMatrix.matrix[i]?.[j] || 0;
      });
    });

    return formatted;
  }

  async rebalancePortfolio(
    currentAllocation: { [coinId: string]: number },
    targetAllocation: { [coinId: string]: number },
    threshold: number = 0.05
  ): Promise<{ [coinId: string]: number }> {
    const rebalanceActions: { [coinId: string]: number } = {};

    Object.keys(targetAllocation).forEach(coinId => {
      const current = currentAllocation[coinId] || 0;
      const target = targetAllocation[coinId];
      const difference = target - current;

      if (Math.abs(difference) > threshold) {
        rebalanceActions[coinId] = difference;
      }
    });

    return rebalanceActions;
  }
}

export const portfolioOptimizationService = new PortfolioOptimizationService(); 