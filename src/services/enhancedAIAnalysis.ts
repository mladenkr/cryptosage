import { CryptoAnalysis } from './technicalAnalysis';
import { enhancedDataSources, EnhancedCoinData } from './enhancedDataSources';

// Enhanced analysis with multiple AI models
export interface EnhancedCryptoAnalysis extends CryptoAnalysis {
  // Override coin to use EnhancedCoinData
  coin: EnhancedCoinData;
  
  // Multi-model predictions
  ensemblePrediction: number;
  modelConfidences: {
    technical: number;
    fundamental: number;
    sentiment: number;
    momentum: number;
    volume: number;
  };
  
  // Advanced metrics
  liquidityScore: number;
  volatilityRisk: number;
  marketCyclePosition: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';
  correlationBTC: number;
  socialSentiment: number;
  
  // Risk assessment
  riskFactors: string[];
  opportunityFactors: string[];
  
  // Time-based predictions
  predictions: {
    '1h': number;
    '4h': number;
    '24h': number;
    '7d': number;
  };
}

export class EnhancedAIAnalysis {
  private readonly BATCH_SIZE = 100; // Process coins in larger batches for better performance
  private readonly MAX_COINS_TO_ANALYZE = 2500; // Analyze up to 2500 coins to cover most MEXC pairs
  
  // Advanced technical analysis with multiple indicators
  private calculateAdvancedTechnicalScore(coin: EnhancedCoinData): number {
    let score = 50; // Start with neutral
    
    // Price momentum analysis
    const momentum24h = coin.price_change_percentage_24h || 0;
    const momentum7d = coin.price_change_percentage_7d || 0;
    const momentum30d = coin.price_change_percentage_30d || 0;
    
    // Multi-timeframe momentum scoring
    if (momentum24h > 5) score += 15;
    else if (momentum24h > 2) score += 8;
    else if (momentum24h < -5) score -= 15;
    else if (momentum24h < -2) score -= 8;
    
    if (momentum7d > 10) score += 10;
    else if (momentum7d < -10) score -= 10;
    
    if (momentum30d > 20) score += 8;
    else if (momentum30d < -20) score -= 8;
    
    // Volume analysis - Enhanced to prioritize high volume coins
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    const absoluteVolume = coin.total_volume;
    
    // Absolute volume scoring (prioritize high volume coins)
    if (absoluteVolume > 100000000) score += 25; // $100M+ daily volume
    else if (absoluteVolume > 50000000) score += 20; // $50M+ daily volume
    else if (absoluteVolume > 20000000) score += 15; // $20M+ daily volume
    else if (absoluteVolume > 5000000) score += 10; // $5M+ daily volume
    else if (absoluteVolume < 1000000) score -= 10; // Low volume penalty
    
    // Volume to market cap ratio (liquidity)
    if (volumeToMarketCap > 0.15) score += 20; // High liquidity
    else if (volumeToMarketCap > 0.08) score += 12;
    else if (volumeToMarketCap > 0.03) score += 5;
    else if (volumeToMarketCap < 0.01) score -= 15; // Low liquidity risk
    
    // Market cap rank stability
    if (coin.market_cap_rank <= 10) score += 15; // Top 10 coins
    else if (coin.market_cap_rank <= 50) score += 10;
    else if (coin.market_cap_rank <= 100) score += 5;
    else if (coin.market_cap_rank > 500) score -= 10; // High risk small caps
    
    // Price range analysis (24h)
    if (coin.high_24h && coin.low_24h && coin.current_price) {
      const range = (coin.high_24h - coin.low_24h) / coin.low_24h;
      const position = (coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h);
      
      if (position > 0.8) score += 8; // Near high
      else if (position < 0.2) score += 12; // Near low (potential bounce)
      
      if (range > 0.15) score -= 5; // High volatility penalty
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Enhanced fundamental analysis
  private calculateAdvancedFundamentalScore(coin: EnhancedCoinData): number {
    let score = 50;
    
    // Market cap analysis
    if (coin.market_cap > 10000000000) score += 20; // $10B+ market cap
    else if (coin.market_cap > 1000000000) score += 15; // $1B+ market cap
    else if (coin.market_cap > 100000000) score += 10; // $100M+ market cap
    else if (coin.market_cap < 10000000) score -= 20; // Under $10M is risky
    
    // Supply analysis
    if (coin.max_supply && coin.circulating_supply) {
      const supplyRatio = coin.circulating_supply / coin.max_supply;
      if (supplyRatio > 0.9) score += 10; // Most supply in circulation
      else if (supplyRatio < 0.5) score -= 5; // Large future dilution risk
    }
    
    // Volume consistency (proxy for adoption)
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    if (volumeToMarketCap > 0.1) score += 15; // High trading activity
    else if (volumeToMarketCap < 0.01) score -= 10; // Low interest
    
    // ATH analysis
    if (coin.ath && coin.current_price) {
      const athDistance = (coin.ath - coin.current_price) / coin.ath;
      if (athDistance > 0.8) score += 15; // Far from ATH, potential upside
      else if (athDistance > 0.5) score += 10;
      else if (athDistance < 0.1) score -= 5; // Near ATH, limited upside
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Market sentiment analysis
  private calculateSentimentScore(coin: EnhancedCoinData): number {
    let score = 50;
    
    // Price momentum sentiment
    const momentum24h = coin.price_change_percentage_24h || 0;
    const momentum7d = coin.price_change_percentage_7d || 0;
    
    // Recent performance sentiment
    if (momentum24h > 10) score += 20;
    else if (momentum24h > 5) score += 15;
    else if (momentum24h > 0) score += 5;
    else if (momentum24h < -10) score -= 20;
    else if (momentum24h < -5) score -= 15;
    else score -= 5;
    
    // Weekly trend sentiment
    if (momentum7d > 20) score += 15;
    else if (momentum7d > 10) score += 10;
    else if (momentum7d < -20) score -= 15;
    else if (momentum7d < -10) score -= 10;
    
    // Volume sentiment (high volume = high interest)
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    if (volumeToMarketCap > 0.2) score += 15; // Very high interest
    else if (volumeToMarketCap > 0.1) score += 10;
    else if (volumeToMarketCap < 0.02) score -= 10; // Low interest
    
    // Market cap rank sentiment (stability)
    if (coin.market_cap_rank <= 20) score += 10;
    else if (coin.market_cap_rank > 200) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Liquidity scoring
  private calculateLiquidityScore(coin: EnhancedCoinData): number {
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    
    if (volumeToMarketCap > 0.3) return 95; // Extremely liquid
    if (volumeToMarketCap > 0.15) return 85; // Very liquid
    if (volumeToMarketCap > 0.08) return 75; // Good liquidity
    if (volumeToMarketCap > 0.03) return 60; // Moderate liquidity
    if (volumeToMarketCap > 0.01) return 40; // Low liquidity
    return 20; // Very low liquidity
  }
  
  // Volatility risk assessment
  private calculateVolatilityRisk(coin: EnhancedCoinData): number {
    const momentum24h = Math.abs(coin.price_change_percentage_24h || 0);
    const momentum7d = Math.abs(coin.price_change_percentage_7d || 0);
    const momentum30d = Math.abs(coin.price_change_percentage_30d || 0);
    
    // Average volatility across timeframes
    const avgVolatility = (momentum24h + momentum7d / 7 + momentum30d / 30) / 3;
    
    if (avgVolatility > 15) return 90; // Very high risk
    if (avgVolatility > 10) return 75; // High risk
    if (avgVolatility > 5) return 50; // Moderate risk
    if (avgVolatility > 2) return 30; // Low risk
    return 15; // Very low risk
  }
  
  // Market cycle position analysis
  private determineMarketCyclePosition(coin: EnhancedCoinData): 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' {
    const momentum24h = coin.price_change_percentage_24h || 0;
    const momentum7d = coin.price_change_percentage_7d || 0;
    const momentum30d = coin.price_change_percentage_30d || 0;
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    
    // High volume + positive momentum = MARKUP
    if (volumeToMarketCap > 0.1 && momentum7d > 10 && momentum24h > 2) {
      return 'MARKUP';
    }
    
    // High volume + negative momentum = DISTRIBUTION
    if (volumeToMarketCap > 0.1 && momentum7d < -5 && momentum24h < -2) {
      return 'DISTRIBUTION';
    }
    
    // Low volume + negative momentum = MARKDOWN
    if (volumeToMarketCap < 0.05 && momentum30d < -10) {
      return 'MARKDOWN';
    }
    
    // Default to accumulation
    return 'ACCUMULATION';
  }
  
  // Multi-timeframe predictions
  private calculatePredictions(coin: EnhancedCoinData, overallScore: number): { '1h': number; '4h': number; '24h': number; '7d': number } {
    const baseVolatility = Math.abs(coin.price_change_percentage_24h || 0) / 24; // Hourly volatility
    const momentum24h = coin.price_change_percentage_24h || 0;
    const momentum7d = coin.price_change_percentage_7d || 0;
    
    // Score influence on predictions (more aggressive)
    const scoreInfluence = (overallScore - 50) / 25; // -2 to 2 (more range)
    
    // Market cycle influence
    let cycleMultiplier = 1;
    const cyclePosition = this.determineMarketCyclePosition(coin);
    switch (cyclePosition) {
      case 'MARKUP': cycleMultiplier = 1.3; break;
      case 'ACCUMULATION': cycleMultiplier = 1.1; break;
      case 'DISTRIBUTION': cycleMultiplier = 0.8; break;
      case 'MARKDOWN': cycleMultiplier = 0.7; break;
    }
    
    // Volume influence (high volume = more momentum)
    const volumeInfluence = Math.min(1.5, coin.total_volume / coin.market_cap * 10);
    
    // ATH distance influence (far from ATH = more upside potential)
    const athDistance = coin.ath ? (coin.ath - coin.current_price) / coin.ath : 0.5;
    const athInfluence = athDistance > 0.5 ? 1.2 : 0.9;
    
    return {
      '1h': this.capPrediction(
        scoreInfluence * 0.8 + 
        momentum24h * 0.03 + 
        (Math.random() - 0.5) * baseVolatility * 2
      ),
      '4h': this.capPrediction(
        scoreInfluence * 2 * cycleMultiplier + 
        momentum24h * 0.1 + 
        momentum7d * 0.02 +
        (Math.random() - 0.5) * baseVolatility * 3
      ),
      '24h': this.capPrediction(
        scoreInfluence * 4 * cycleMultiplier * volumeInfluence * athInfluence + 
        momentum24h * 0.3 + 
        momentum7d * 0.1 +
        (Math.random() - 0.5) * baseVolatility * 5
      ),
      '7d': this.capPrediction(
        scoreInfluence * 10 * cycleMultiplier * athInfluence + 
        momentum7d * 0.4 + 
        momentum24h * 0.2 +
        (Math.random() - 0.5) * baseVolatility * 8
      )
    };
  }
  
  private capPrediction(prediction: number): number {
    return Math.max(-25, Math.min(25, prediction)); // Cap at ±25%
  }
  
  // Risk and opportunity factor analysis
  private analyzeRiskFactors(coin: EnhancedCoinData): string[] {
    const risks: string[] = [];
    
    if (coin.market_cap < 50000000) risks.push('Small market cap - high volatility risk');
    if (coin.total_volume / coin.market_cap < 0.02) risks.push('Low liquidity - difficulty trading');
    if (Math.abs(coin.price_change_percentage_24h || 0) > 20) risks.push('High volatility - price swings');
    if (coin.market_cap_rank > 300) risks.push('Low market ranking - speculative asset');
    if (!coin.max_supply) risks.push('Unlimited supply - inflation risk');
    
    const athDistance = coin.ath ? (coin.ath - coin.current_price) / coin.ath : 0;
    if (athDistance < 0.05) risks.push('Near all-time high - limited upside');
    
    return risks;
  }
  
  private analyzeOpportunityFactors(coin: EnhancedCoinData): string[] {
    const opportunities: string[] = [];
    
    if (coin.market_cap_rank <= 50) opportunities.push('Top 50 coin - established project');
    if (coin.total_volume / coin.market_cap > 0.15) opportunities.push('High liquidity - easy trading');
    
    const athDistance = coin.ath ? (coin.ath - coin.current_price) / coin.ath : 0;
    if (athDistance > 0.7) opportunities.push('Far from ATH - significant upside potential');
    
    if ((coin.price_change_percentage_7d || 0) > 15) opportunities.push('Strong weekly momentum');
    if (coin.market_cap > 1000000000) opportunities.push('Large market cap - institutional interest');
    
    const momentum24h = coin.price_change_percentage_24h || 0;
    const momentum7d = coin.price_change_percentage_7d || 0;
    if (momentum24h > 5 && momentum7d > 10) opportunities.push('Multi-timeframe bullish momentum');
    
    return opportunities;
  }
  
  // Main analysis method
  async analyzeEnhancedCoin(coin: EnhancedCoinData): Promise<EnhancedCryptoAnalysis> {
    // Calculate individual scores
    const technicalScore = this.calculateAdvancedTechnicalScore(coin);
    const fundamentalScore = this.calculateAdvancedFundamentalScore(coin);
    const sentimentScore = this.calculateSentimentScore(coin);
    
    // Model confidences based on data quality
    const modelConfidences = {
      technical: Math.min(95, 60 + (coin.sparkline_in_24h?.price?.length || 0) / 10),
      fundamental: Math.min(95, 70 + (coin.market_cap_rank ? 25 : 0)),
      sentiment: Math.min(95, 65 + (coin.total_volume > 0 ? 20 : 0)),
      momentum: Math.min(95, 75 + (coin.price_change_percentage_7d !== undefined ? 15 : 0)),
      volume: Math.min(95, 80 + (coin.total_volume / coin.market_cap > 0.05 ? 15 : 0))
    };
    
    // Weighted ensemble score
    const overallScore = (
      technicalScore * 0.3 +
      fundamentalScore * 0.35 +
      sentimentScore * 0.25 +
      (coin.total_volume / coin.market_cap > 0.1 ? 10 : 0) // Liquidity bonus
    );
    
    // Ensemble prediction (average of model predictions weighted by confidence)
    const totalConfidence = Object.values(modelConfidences).reduce((sum, conf) => sum + conf, 0);
    const ensemblePrediction = (
      (technicalScore - 50) * modelConfidences.technical +
      (fundamentalScore - 50) * modelConfidences.fundamental +
      (sentimentScore - 50) * modelConfidences.sentiment
    ) / totalConfidence * 0.6; // Scale to reasonable prediction range
    
    // Additional metrics
    const liquidityScore = this.calculateLiquidityScore(coin);
    const volatilityRisk = this.calculateVolatilityRisk(coin);
    const marketCyclePosition = this.determineMarketCyclePosition(coin);
    const correlationBTC = this.calculateBTCCorrelation(coin);
    const socialSentiment = sentimentScore; // Simplified for now
    
    // Risk and opportunity analysis
    const riskFactors = this.analyzeRiskFactors(coin);
    const opportunityFactors = this.analyzeOpportunityFactors(coin);
    
    // Multi-timeframe predictions
    const predictions = this.calculatePredictions(coin, overallScore);
    
    // Generate recommendation
    const predicted24hChange = predictions['24h'];
    const recommendation = this.getRecommendation(predicted24hChange, overallScore);
    const riskLevel = this.getRiskLevel(coin, overallScore, volatilityRisk);
    const priceTarget = this.calculatePriceTarget(coin, overallScore);
    const confidence = Math.min(95, Math.max(60, overallScore));
    
    return {
      coin,
      technicalScore,
      fundamentalScore,
      sentimentScore,
      overallScore,
      indicators: this.createMockIndicators(coin), // Simplified indicators
      signals: this.generateSignals(coin, technicalScore, fundamentalScore),
      recommendation,
      riskLevel,
      priceTarget,
      confidence,
      predicted24hChange,
      
      // Enhanced fields
      ensemblePrediction,
      modelConfidences,
      liquidityScore,
      volatilityRisk,
      marketCyclePosition,
      correlationBTC,
      socialSentiment,
      riskFactors,
      opportunityFactors,
      predictions
    };
  }
  
  // Get enhanced recommendations for many coins
  async getEnhancedRecommendations(limit: number = 100): Promise<EnhancedCryptoAnalysis[]> {
    console.log(`EnhancedAIAnalysis: Starting analysis for ${limit} recommendations...`);
    
    try {
      // Use MEXC as primary source for coin list - limit to 500 for better performance
      const coins = await enhancedDataSources.getEnhancedCoinListMEXCPrimary(500);
      
      if (coins.length === 0) {
        console.warn('No coins available for analysis');
        return [];
      }

      console.log(`EnhancedAIAnalysis: Analyzing ${coins.length} coins from MEXC primary source...`);
      
      // Process coins in batches for better performance
      const analyses: EnhancedCryptoAnalysis[] = [];
      
      for (let i = 0; i < coins.length; i += this.BATCH_SIZE) {
        const batch = coins.slice(i, i + this.BATCH_SIZE);
        console.log(`EnhancedAIAnalysis: Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(coins.length / this.BATCH_SIZE)} (${batch.length} coins)`);
        
        const batchPromises = batch.map(coin => this.analyzeEnhancedCoin(coin));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            analyses.push(result.value);
          } else {
            console.warn(`Failed to analyze ${batch[index].symbol}:`, result.reason);
          }
        });
        
        // Small delay between batches to avoid overwhelming the system
        if (i + this.BATCH_SIZE < coins.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (analyses.length === 0) {
        console.warn('No successful analyses completed');
        return [];
      }

      console.log(`EnhancedAIAnalysis: Completed ${analyses.length} analyses`);

      // Sort by prediction magnitude (absolute value) first, then by confidence
      // This prioritizes coins with larger expected price movements regardless of direction
      const sortedAnalyses = analyses.sort((a, b) => {
        // Primary sort: Absolute value of 24h prediction (larger movements first)
        const aPredictionMagnitude = Math.abs(a.predictions['24h']);
        const bPredictionMagnitude = Math.abs(b.predictions['24h']);
        
        if (Math.abs(aPredictionMagnitude - bPredictionMagnitude) > 0.1) {
          return bPredictionMagnitude - aPredictionMagnitude;
        }
        
        // Secondary sort: Confidence (higher confidence first)
        if (Math.abs(a.confidence - b.confidence) > 1) {
          return b.confidence - a.confidence;
        }
        
        // Tertiary sort: Liquidity score (higher liquidity first)
        return b.liquidityScore - a.liquidityScore;
      });

      const topRecommendations = sortedAnalyses.slice(0, limit);
      
      console.log(`EnhancedAIAnalysis: Returning top ${topRecommendations.length} recommendations`);
      console.log('Top 5 recommendations by prediction magnitude:');
      topRecommendations.slice(0, 5).forEach((analysis, index) => {
        console.log(`${index + 1}. ${analysis.coin.symbol.toUpperCase()}: ${analysis.predictions['24h'].toFixed(2)}% (confidence: ${analysis.confidence.toFixed(1)}%)`);
      });
      
      return topRecommendations;
      
    } catch (error) {
      console.error('Error in getEnhancedRecommendations:', error);
      return [];
    }
  }
  
  // Helper methods
  private calculateBTCCorrelation(coin: EnhancedCoinData): number {
    // Simplified correlation calculation
    // In a real implementation, this would analyze price movements vs BTC
    if (coin.symbol.toLowerCase() === 'btc') return 1.0;
    if (coin.market_cap_rank <= 10) return 0.7 + Math.random() * 0.2; // 0.7-0.9
    if (coin.market_cap_rank <= 50) return 0.5 + Math.random() * 0.3; // 0.5-0.8
    return 0.3 + Math.random() * 0.4; // 0.3-0.7
  }
  
  private getRecommendation(predicted24hChange: number, overallScore: number): 'LONG' | 'NEUTRAL' | 'SHORT' {
    // More balanced thresholds for better signal distribution
    
    // LONG signals - more generous thresholds
    if (overallScore >= 70) return 'LONG'; // High AI score = LONG
    if (overallScore >= 60 && predicted24hChange > 1) return 'LONG'; // Good score + positive prediction
    if (overallScore >= 55 && predicted24hChange > 2) return 'LONG'; // Decent score + strong prediction
    
    // SHORT signals - now actually possible to get
    if (overallScore <= 35) return 'SHORT'; // Low AI score = SHORT
    if (overallScore <= 45 && predicted24hChange < -1) return 'SHORT'; // Poor score + negative prediction
    if (overallScore <= 50 && predicted24hChange < -2) return 'SHORT'; // Mediocre score + strong negative prediction
    
    // NEUTRAL for everything in between
    return 'NEUTRAL';
  }
  
  private getRiskLevel(coin: EnhancedCoinData, overallScore: number, volatilityRisk: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (volatilityRisk > 75 || coin.market_cap < 100000000) return 'HIGH';
    if (volatilityRisk > 50 || overallScore < 50) return 'MEDIUM';
    return 'LOW';
  }
  
  private calculatePriceTarget(coin: EnhancedCoinData, overallScore: number): number {
    const currentPrice = coin.current_price;
    let multiplier = 1;
    
    if (overallScore >= 80) multiplier = 1.15; // 15% upside
    else if (overallScore >= 70) multiplier = 1.10; // 10% upside
    else if (overallScore >= 60) multiplier = 1.05; // 5% upside
    else if (overallScore < 40) multiplier = 0.95; // 5% downside
    
    // Adjust for market cap (smaller caps can move more)
    if (coin.market_cap < 1000000000) multiplier = 1 + (multiplier - 1) * 1.5;
    else if (coin.market_cap > 10000000000) multiplier = 1 + (multiplier - 1) * 0.7;
    
    return currentPrice * multiplier;
  }
  
  private createMockIndicators(coin: EnhancedCoinData): any {
    // Simplified indicators based on available data
    const currentPrice = coin.current_price;
    return {
      rsi: 50 + (coin.price_change_percentage_24h || 0) * 2,
      macd: { MACD: 0, signal: 0, histogram: 0 },
      sma20: currentPrice * 0.98,
      sma50: currentPrice * 0.96,
      ema12: currentPrice * 0.99,
      ema26: currentPrice * 0.97,
      bollingerBands: {
        upper: currentPrice * 1.05,
        middle: currentPrice,
        lower: currentPrice * 0.95
      },
      stochastic: { k: 50, d: 50 }
    };
  }
  
  private generateSignals(coin: EnhancedCoinData, technicalScore: number, fundamentalScore: number): string[] {
    const signals: string[] = [];
    
    if (technicalScore > 70) signals.push('Strong Technical Setup');
    if (fundamentalScore > 70) signals.push('Strong Fundamentals');
    if (coin.total_volume / coin.market_cap > 0.15) signals.push('High Liquidity');
    if ((coin.price_change_percentage_24h || 0) > 5) signals.push('Bullish Momentum');
    if (coin.market_cap_rank <= 50) signals.push('Top 50 Asset');
    
    const athDistance = coin.ath ? (coin.ath - coin.current_price) / coin.ath : 0;
    if (athDistance > 0.5) signals.push('Significant Upside Potential');
    
    return signals;
  }
}

export const enhancedAIAnalysis = new EnhancedAIAnalysis(); 