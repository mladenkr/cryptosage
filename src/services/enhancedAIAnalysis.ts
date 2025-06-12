import { CryptoAnalysis, cryptoAnalyzer } from './technicalAnalysis';
import { EnhancedCoinData } from './enhancedDataSources';

// Enhanced analysis with technical analysis focus
export interface EnhancedCryptoAnalysis extends CryptoAnalysis {
  // Override coin to use EnhancedCoinData
  coin: EnhancedCoinData;
  
  // Technical analysis confidence scores
  technicalConfidence: {
    rsi: number;
    macd: number;
    movingAverages: number;
    supportResistance: number;
    multiTimeframe: number;
  };
  
  // Advanced metrics
  liquidityScore: number;
  volatilityRisk: number;
  marketCyclePosition: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';
  
  // Risk assessment
  riskFactors: string[];
  opportunityFactors: string[];
  
  // Time-based predictions (based on technical analysis)
  predictions: {
    '1h': number;
    '4h': number;
    '24h': number;
    '7d': number;
  };
}

export class EnhancedAIAnalysis {
  private readonly BATCH_SIZE = 12; // Optimized for MEXC API rate limits
  private readonly MAX_COINS_TO_ANALYZE = 150; // Increased to get more coins after filtering
  
  // Calculate technical confidence scores
  private calculateTechnicalConfidence(analysis: CryptoAnalysis): {
    rsi: number;
    macd: number;
    movingAverages: number;
    supportResistance: number;
    multiTimeframe: number;
  } {
    const indicators = analysis.indicators;
    const multiTimeframe = analysis.multiTimeframe;
    const supportResistance = analysis.supportResistance;
    
    // RSI confidence (higher when in extreme zones)
    const rsiConfidence = Math.max(
      Math.abs(indicators.rsi - 50) * 2, // 0-100 scale
      20 // Minimum confidence
    );
    
    // MACD confidence (based on histogram strength)
    const macdConfidence = Math.min(
      Math.abs(indicators.macd.histogram) * 100 + 50,
      95
    );
    
    // Moving averages confidence (based on separation)
    const currentPrice = analysis.coin.current_price;
    const maSeparation = Math.abs(indicators.sma20 - indicators.sma50) / currentPrice * 100;
    const movingAveragesConfidence = Math.min(maSeparation * 10 + 40, 95);
    
    // Support/Resistance confidence (based on number of strong levels)
    const strongLevels = supportResistance.filter(sr => sr.strength > 3).length;
    const supportResistanceConfidence = Math.min(strongLevels * 15 + 30, 95);
    
    // Multi-timeframe confidence (based on alignment)
    const timeframes = Object.values(multiTimeframe);
    const bullishCount = timeframes.filter(tf => tf.trend === 'bullish').length;
    const bearishCount = timeframes.filter(tf => tf.trend === 'bearish').length;
    const alignment = Math.max(bullishCount, bearishCount);
    const multiTimeframeConfidence = alignment * 30 + 10; // 10-100 scale
    
    return {
      rsi: Math.min(rsiConfidence, 95),
      macd: Math.min(macdConfidence, 95),
      movingAverages: Math.min(movingAveragesConfidence, 95),
      supportResistance: Math.min(supportResistanceConfidence, 95),
      multiTimeframe: Math.min(multiTimeframeConfidence, 95)
    };
  }
  
  // Calculate liquidity score
  private calculateLiquidityScore(coin: EnhancedCoinData): number {
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    
    if (volumeToMarketCap > 0.3) return 95;
    if (volumeToMarketCap > 0.15) return 85;
    if (volumeToMarketCap > 0.08) return 75;
    if (volumeToMarketCap > 0.03) return 60;
    if (volumeToMarketCap > 0.01) return 40;
    return 20;
  }
  
  // Calculate volatility risk
  private calculateVolatilityRisk(coin: EnhancedCoinData): number {
    const momentum24h = Math.abs(coin.price_change_percentage_24h || 0);
    const momentum7d = Math.abs(coin.price_change_percentage_7d || 0);
    const momentum30d = Math.abs(coin.price_change_percentage_30d || 0);
    
    const avgVolatility = (momentum24h + momentum7d / 7 + momentum30d / 30) / 3;
    
    if (avgVolatility > 15) return 90;
    if (avgVolatility > 10) return 75;
    if (avgVolatility > 5) return 50;
    if (avgVolatility > 2) return 30;
    return 15;
  }
  
  // Determine market cycle position
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
    
    return 'ACCUMULATION';
  }
  
  // Calculate technical-based predictions for different timeframes
  private calculateTechnicalPredictions(analysis: CryptoAnalysis): {
    '1h': number;
    '4h': number;
    '24h': number;
    '7d': number;
  } {
    const indicators = analysis.indicators;
    const multiTimeframe = analysis.multiTimeframe;
    
    // Base prediction on 24h technical analysis
    const base24hPrediction = analysis.predicted24hChange;
    
    // 1-hour prediction (based on short-term indicators)
    let prediction1h = 0;
    
    // RSI short-term signals
    if (indicators.rsi < 30) prediction1h += 0.5;
    else if (indicators.rsi > 70) prediction1h -= 0.3;
    
    // MACD short-term momentum
    if (indicators.macd.histogram > 0) prediction1h += 0.3;
    else prediction1h -= 0.3;
    
    // Stochastic short-term
    if (indicators.stochastic.k < 20) prediction1h += 0.4;
    else if (indicators.stochastic.k > 80) prediction1h -= 0.4;
    
    // 4-hour prediction (intermediate term)
    let prediction4h = base24hPrediction * 0.3;
    
    // Add multi-timeframe influence
    if (multiTimeframe['1h'].trend === 'bullish') prediction4h += 0.5;
    else if (multiTimeframe['1h'].trend === 'bearish') prediction4h -= 0.5;
    
    // 7-day prediction (longer term trend)
    let prediction7d = base24hPrediction * 2;
    
    // Weekly timeframe influence
    if (multiTimeframe['1w'].trend === 'bullish') prediction7d += 2;
    else if (multiTimeframe['1w'].trend === 'bearish') prediction7d -= 2;
    
    // ADX trend strength influence
    const trendStrength = indicators.adx / 100;
    const trendDirection = indicators.rsi > 50 ? 1 : -1;
    prediction7d += trendStrength * trendDirection * 3;
    
    return {
      '1h': Math.max(-5, Math.min(5, prediction1h)),
      '4h': Math.max(-8, Math.min(8, prediction4h)),
      '24h': base24hPrediction,
      '7d': Math.max(-20, Math.min(20, prediction7d))
    };
  }
  
  // Analyze risk factors
  private analyzeRiskFactors(coin: EnhancedCoinData, analysis: CryptoAnalysis): string[] {
    const risks: string[] = [];
    
    // Market cap risk
    if (coin.market_cap < 50000000) risks.push('Small market cap - high volatility risk');
    
    // Liquidity risk
    if (coin.total_volume / coin.market_cap < 0.02) risks.push('Low liquidity - difficulty trading');
    
    // Technical risks
    if (analysis.indicators.rsi > 80) risks.push('Extremely overbought - correction likely');
    if (analysis.indicators.adx < 20) risks.push('Weak trend - sideways movement expected');
    
    // Multi-timeframe conflicts
    const timeframes = Object.values(analysis.multiTimeframe);
    const conflictingSignals = timeframes.filter(tf => tf.trend !== timeframes[0].trend).length;
    if (conflictingSignals > 1) risks.push('Conflicting timeframe signals - uncertain direction');
    
    // Support/resistance risks
    const nearResistance = analysis.supportResistance.find(sr => 
      sr.type === 'resistance' && 
      Math.abs(coin.current_price - sr.price) / coin.current_price < 0.03
    );
    if (nearResistance) risks.push(`Strong resistance at $${nearResistance.price.toFixed(2)}`);
    
    return risks;
  }
  
  // Analyze opportunity factors
  private analyzeOpportunityFactors(coin: EnhancedCoinData, analysis: CryptoAnalysis): string[] {
    const opportunities: string[] = [];
    
    // Technical opportunities
    if (analysis.indicators.rsi < 25) opportunities.push('Extremely oversold - bounce potential');
    if (analysis.indicators.macd.MACD > analysis.indicators.macd.signal && analysis.indicators.macd.histogram > 0) {
      opportunities.push('Strong bullish MACD crossover');
    }
    
    // Multi-timeframe alignment
    const bullishTimeframes = Object.values(analysis.multiTimeframe).filter(tf => tf.trend === 'bullish').length;
    if (bullishTimeframes === 3) opportunities.push('All timeframes aligned bullish');
    
    // Support opportunities
    const nearSupport = analysis.supportResistance.find(sr => 
      sr.type === 'support' && 
      Math.abs(coin.current_price - sr.price) / coin.current_price < 0.03
    );
    if (nearSupport && nearSupport.strength > 5) {
      opportunities.push(`Strong support at $${nearSupport.price.toFixed(2)}`);
    }
    
    // Volume opportunities
    if (coin.total_volume / coin.market_cap > 0.15) opportunities.push('High liquidity - easy entry/exit');
    
    // Market position opportunities
    if (coin.market_cap_rank <= 50) opportunities.push('Top 50 coin - established project');
    
    return opportunities;
  }
  
  // Stablecoin detection
  private isStablecoin(coin: EnhancedCoinData): boolean {
    const symbol = coin.symbol.toLowerCase();
    const stablecoinSymbols = [
      'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 'gusd',
      'husd', 'susd', 'cusd', 'ousd', 'musd', 'dusd', 'yusd', 'rusd', 'nusd',
      'usdn', 'ustc', 'ust', 'vai', 'mim', 'fei', 'tribe', 'rai', 'float',
      'eurc', 'eurs', 'eurt', 'gbpt', 'jpyc', 'cadc', 'audc', 'nzds',
      'paxg', 'xaut', 'dgld', 'pmgt', 'cache', 'usdx', 'usdk',
      'usdj', 'fdusd', 'usd1', 'pyusd', 'usdm', 'gho', 'crvusd', 'mkusd'
    ];
    
    return stablecoinSymbols.includes(symbol);
  }
  
  // Main enhanced analysis method
  async analyzeEnhancedCoin(coin: EnhancedCoinData): Promise<EnhancedCryptoAnalysis | null> {
    // Exclude stablecoins
    if (this.isStablecoin(coin)) {
      console.log(`🚫 STABLECOIN EXCLUDED: ${coin.symbol.toUpperCase()}`);
      return null;
    }
    
    try {
      // Perform technical analysis using the new system
      const technicalAnalysis = await cryptoAnalyzer.analyzeCoin(coin);
      
      // Calculate enhanced metrics
      const technicalConfidence = this.calculateTechnicalConfidence(technicalAnalysis);
    const liquidityScore = this.calculateLiquidityScore(coin);
    const volatilityRisk = this.calculateVolatilityRisk(coin);
    const marketCyclePosition = this.determineMarketCyclePosition(coin);
      
      // Calculate technical-based predictions
      const predictions = this.calculateTechnicalPredictions(technicalAnalysis);
    
    // Risk and opportunity analysis
      const riskFactors = this.analyzeRiskFactors(coin, technicalAnalysis);
      const opportunityFactors = this.analyzeOpportunityFactors(coin, technicalAnalysis);
      
      console.log(`✅ Enhanced technical analysis for ${coin.symbol}: ${predictions['24h'].toFixed(2)}% prediction`);
    
    return {
        ...technicalAnalysis,
      coin,
        technicalConfidence,
      liquidityScore,
      volatilityRisk,
      marketCyclePosition,
      riskFactors,
      opportunityFactors,
      predictions
    };
      
    } catch (error) {
      console.error(`❌ Failed to analyze ${coin.symbol}:`, error);
      return null;
    }
  }
  
  // Get enhanced recommendations using MEXC highest volume coins
  async getEnhancedRecommendations(limit: number = 100): Promise<EnhancedCryptoAnalysis[]> {
    console.log(`🚀 MEXC VOLUME-BASED TECHNICAL ANALYSIS: Starting analysis for ${limit} recommendations...`);
    
    try {
      // Import MEXC API for highest volume coins
      const { mexcApiService } = await import('./mexcApi');
      
      console.log('📊 Fetching MEXC highest volume coins...');
      const mexcCoins = await mexcApiService.getAllMEXCCoins();
      
      if (mexcCoins.length === 0) {
        console.warn('⚠️ MEXC API returned no data, falling back to streamlined data sources...');
        
        // Fallback to streamlined data sources
        try {
          const { streamlinedEnhancedDataSources } = await import('./streamlinedEnhancedDataSources');
          console.log('📊 Using streamlined enhanced data sources as fallback...');
          const fallbackCoins = await streamlinedEnhancedDataSources.getStreamlinedEnhancedCoinList(this.MAX_COINS_TO_ANALYZE);
          
          if (fallbackCoins.length === 0) {
            throw new Error('Both MEXC API and fallback data sources returned no data');
          }
          
          console.log(`✅ Fallback successful: Got ${fallbackCoins.length} coins from streamlined sources`);
          return this.analyzeCoinsWithTechnicalAnalysis(fallbackCoins, limit);
          
        } catch (fallbackError) {
          console.error('❌ Fallback to streamlined sources also failed:', fallbackError);
          throw new Error('No coin data available from MEXC API or fallback sources. Please check network connectivity.');
        }
      }
      
      // Take top volume coins and convert to EnhancedCoinData format
      const topVolumeCoins = mexcCoins.slice(0, this.MAX_COINS_TO_ANALYZE);
      const enhancedCoins: EnhancedCoinData[] = topVolumeCoins.map(coin => ({
        ...coin,
        // Enhanced data fields (using MEXC data where available)
        market_cap: coin.market_cap || coin.total_volume * 100, // Estimate if not available
        market_cap_rank: coin.market_cap_rank || 999,
        fully_diluted_valuation: coin.fully_diluted_valuation || coin.market_cap,
        circulating_supply: coin.circulating_supply || 0,
        total_supply: coin.total_supply || 0,
        max_supply: coin.max_supply,
        ath: coin.ath || coin.current_price,
        ath_change_percentage: coin.ath_change_percentage || 0,
        ath_date: coin.ath_date || new Date().toISOString(),
        atl: coin.atl || coin.current_price,
        atl_change_percentage: coin.atl_change_percentage || 0,
        atl_date: coin.atl_date || new Date().toISOString(),
        roi: coin.roi,
        last_updated: coin.last_updated || new Date().toISOString(),
        sparkline_in_7d: coin.sparkline_in_7d || { price: [] },
        sparkline_in_24h: coin.sparkline_in_24h || { price: [] },
        price_change_percentage_7d: coin.price_change_percentage_24h || 0, // Fallback
        price_change_percentage_14d: coin.price_change_percentage_24h || 0,
        price_change_percentage_30d: coin.price_change_percentage_24h || 0,
        price_change_percentage_200d: coin.price_change_percentage_24h || 0,
        price_change_percentage_1y: coin.price_change_percentage_24h || 0,
        market_cap_change_24h: coin.market_cap_change_24h || 0,
        market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h || coin.price_change_percentage_24h,
        // MEXC-specific data
        original_price: coin.current_price,
        price_source: 'MEXC' as const,
        price_updated_at: new Date().toISOString(),
        mexc_data: coin.mexc_data
      }));
      
      console.log(`📈 Starting technical analysis on ${enhancedCoins.length} MEXC highest volume coins...`);
      console.log(`🔥 Top 10 by volume: ${enhancedCoins.slice(0, 10).map(c => `${c.symbol.toUpperCase()}($${c.total_volume.toLocaleString()})`).join(', ')}`);
      
      return this.analyzeCoinsWithTechnicalAnalysis(enhancedCoins, limit);
      
    } catch (error) {
      console.error('❌ MEXC TECHNICAL ANALYSIS: Error in getEnhancedRecommendations:', error);
      throw error;
    }
  }
  
  // Separate method for analyzing coins with technical analysis
  private async analyzeCoinsWithTechnicalAnalysis(enhancedCoins: EnhancedCoinData[], limit: number): Promise<EnhancedCryptoAnalysis[]> {
    // Analyze coins in batches
    const analyses: EnhancedCryptoAnalysis[] = [];
    const batchSize = this.BATCH_SIZE;
    
    for (let i = 0; i < enhancedCoins.length; i += batchSize) {
      const batch = enhancedCoins.slice(i, i + batchSize);
      console.log(`🔍 Processing technical analysis batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(enhancedCoins.length/batchSize)}`);
      
      // Process batch sequentially to avoid API rate limits
      for (const coin of batch) {
        try {
          const analysis = await this.analyzeEnhancedCoin(coin);
          if (analysis) {
            // FILTER OUT COINS WITH 0% OR VERY LOW PREDICTIONS
            const prediction24h = Math.abs(analysis.predictions['24h']);
            if (prediction24h < 0.1) {
              console.log(`🚫 FILTERED OUT ${coin.symbol.toUpperCase()}: Prediction too low (${analysis.predictions['24h'].toFixed(2)}%)`);
              continue;
            }
            
            // FILTER OUT COINS WITH VERY LOW TECHNICAL SCORES
            if (analysis.technicalScore < 30) {
              console.log(`🚫 FILTERED OUT ${coin.symbol.toUpperCase()}: Technical score too low (${analysis.technicalScore.toFixed(1)})`);
              continue;
            }
            
            analyses.push(analysis);
            console.log(`✅ ADDED ${coin.symbol.toUpperCase()}: ${analysis.predictions['24h'].toFixed(2)}% prediction, ${analysis.technicalScore.toFixed(1)} tech score`);
          }
        } catch (error) {
          console.warn(`⚠️ Skipped ${coin.symbol} due to analysis error:`, error);
        }
      }
      
      // Add delay between batches
      if (i + batchSize < enhancedCoins.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Break if we have enough analyses (but aim for more to account for filtering)
      if (analyses.length >= limit * 2) break;
    }
    
    console.log(`📊 Generated ${analyses.length} valid analyses (after filtering out low predictions)`);
    
    // Sort by technical strength and prediction confidence
    const sortedAnalyses = analyses.sort((a, b) => {
      // PRIMARY: Absolute prediction magnitude (higher absolute value is better)
      // This means -1% ranks higher than +0.9% because |-1| > |0.9|
      const aPredictionMagnitude = Math.abs(a.predictions['24h']);
      const bPredictionMagnitude = Math.abs(b.predictions['24h']);
      const predDiff = bPredictionMagnitude - aPredictionMagnitude;
      
      // If there's a significant difference in prediction magnitude, use that
      if (Math.abs(predDiff) > 0.1) {
        return predDiff;
      }
      
      // SECONDARY: Technical score (higher is better) - only if predictions are similar
      const techDiff = b.technicalScore - a.technicalScore;
      if (Math.abs(techDiff) > 3) {
        return techDiff;
      }
      
      // TERTIARY: Multi-timeframe confidence
      const confDiff = b.technicalConfidence.multiTimeframe - a.technicalConfidence.multiTimeframe;
      return confDiff;
    });

    const topRecommendations = sortedAnalyses.slice(0, limit);
    
    console.log(`🎯 ENHANCED FILTERING: Final ${topRecommendations.length} recommendations (filtered from ${analyses.length} valid analyses):`);
    console.log(`📊 RANKING BY: 1) Absolute 24h prediction magnitude, 2) Technical score, 3) Multi-timeframe confidence`);
    topRecommendations.slice(0, 15).forEach((analysis, index) => {
      const volume = analysis.coin.total_volume;
      const source = analysis.coin.price_source || 'CoinGecko';
      const predictionMagnitude = Math.abs(analysis.predictions['24h']);
      const predictionSign = analysis.predictions['24h'] >= 0 ? '+' : '';
      console.log(`  ${index + 1}. ${analysis.coin.symbol.toUpperCase()}: ${predictionSign}${analysis.predictions['24h'].toFixed(2)}% (|${predictionMagnitude.toFixed(2)}%|, Tech: ${analysis.technicalScore.toFixed(1)}, ${analysis.recommendation}, Vol: $${volume.toLocaleString()}, Source: ${source})`);
    });
    
    console.log(`🚀 ENHANCED ANALYSIS: Successfully returning ${topRecommendations.length} high-quality recommendations`);
    
    return topRecommendations;
  }
}

export const enhancedAIAnalysis = new EnhancedAIAnalysis(); 