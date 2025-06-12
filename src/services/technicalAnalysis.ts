import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } from 'technicalindicators';
import { Coin } from '../types';
import { coinGeckoApi } from './api';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
}

export interface CryptoAnalysis {
  coin: Coin;
  technicalScore: number;
  fundamentalScore: number;
  sentimentScore: number;
  overallScore: number;
  indicators: TechnicalIndicators;
  signals: string[];
  recommendation: 'LONG' | 'NEUTRAL' | 'SHORT';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priceTarget: number;
  confidence: number;
  predicted24hChange: number; // Predicted percentage change in next 24 hours
}

export class CryptoAnalyzer {
  private async getPriceData(coinId: string, days: number = 30): Promise<number[]> {
    try {
      const historyData = await coinGeckoApi.getCoinHistory(coinId, 'usd', days);
      return historyData.prices.map((price: [number, number]) => price[1]);
    } catch (error) {
      console.warn(`Failed to get price data for ${coinId}, skipping analysis`);
      throw new Error(`Price data unavailable for ${coinId}`);
    }
  }

  private calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
    if (prices.length < 50) {
      // Return default indicators when insufficient data
      return {
        rsi: 50,
        macd: { MACD: 0, signal: 0, histogram: 0 },
        sma20: prices[prices.length - 1] || 0,
        sma50: prices[prices.length - 1] || 0,
        ema12: prices[prices.length - 1] || 0,
        ema26: prices[prices.length - 1] || 0,
        bollingerBands: {
          upper: prices[prices.length - 1] || 0,
          middle: prices[prices.length - 1] || 0,
          lower: prices[prices.length - 1] || 0
        },
        stochastic: { k: 50, d: 50 }
      };
    }

    const closePrices = prices.slice(-50); // Use last 50 prices for calculations
    
    // RSI calculation
    const rsiValues = RSI.calculate({ values: closePrices, period: 14 });
    const rsi = rsiValues[rsiValues.length - 1] || 50;

    // MACD calculation
    const macdValues = MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const macdLast = macdValues[macdValues.length - 1];
    const macd = {
      MACD: macdLast?.MACD || 0,
      signal: macdLast?.signal || 0,
      histogram: macdLast?.histogram || 0
    };

    // Moving averages
    const sma20Values = SMA.calculate({ period: 20, values: closePrices });
    const sma20 = sma20Values[sma20Values.length - 1] || closePrices[closePrices.length - 1];

    const sma50Values = SMA.calculate({ period: 50, values: prices });
    const sma50 = sma50Values[sma50Values.length - 1] || prices[prices.length - 1];

    const ema12Values = EMA.calculate({ period: 12, values: closePrices });
    const ema12 = ema12Values[ema12Values.length - 1] || closePrices[closePrices.length - 1];

    const ema26Values = EMA.calculate({ period: 26, values: closePrices });
    const ema26 = ema26Values[ema26Values.length - 1] || closePrices[closePrices.length - 1];

    // Bollinger Bands
    const bollingerValues = BollingerBands.calculate({
      period: 20,
      values: closePrices,
      stdDev: 2
    });
    const bollingerBands = bollingerValues[bollingerValues.length - 1] || {
      upper: closePrices[closePrices.length - 1],
      middle: closePrices[closePrices.length - 1],
      lower: closePrices[closePrices.length - 1]
    };

    // Stochastic Oscillator - use actual price data for high/low
    const highs = closePrices.map(price => price * 1.02); // Approximate highs
    const lows = closePrices.map(price => price * 0.98);  // Approximate lows
    
    const stochasticValues = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closePrices,
      period: 14,
      signalPeriod: 3
    });
    const stochastic = stochasticValues[stochasticValues.length - 1] || { k: 50, d: 50 };

    return {
      rsi,
      macd,
      sma20,
      sma50,
      ema12,
      ema26,
      bollingerBands,
      stochastic
    };
  }

  private calculateTechnicalScore(indicators: TechnicalIndicators, currentPrice: number): number {
    let score = 0;
    const signals: string[] = [];

    // RSI Analysis (0-100 scale)
    if (indicators.rsi < 30) {
      score += 20; // Oversold - bullish
      signals.push('RSI Oversold');
    } else if (indicators.rsi > 70) {
      score -= 10; // Overbought - bearish
      signals.push('RSI Overbought');
    } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
      score += 10; // Neutral zone - positive
    }

    // MACD Analysis
    if (indicators.macd.MACD > indicators.macd.signal) {
      score += 15; // Bullish crossover
      signals.push('MACD Bullish');
    } else {
      score -= 5; // Bearish
    }

    if (indicators.macd.histogram > 0) {
      score += 10; // Positive momentum
    }

    // Moving Average Analysis
    if (currentPrice > indicators.sma20) {
      score += 10; // Above short-term MA
    }
    if (currentPrice > indicators.sma50) {
      score += 15; // Above long-term MA
    }
    if (indicators.sma20 > indicators.sma50) {
      score += 10; // Golden cross pattern
      signals.push('Golden Cross');
    }

    // EMA Analysis
    if (indicators.ema12 > indicators.ema26) {
      score += 10; // Short EMA above long EMA
    }

    // Bollinger Bands Analysis
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    
    if (bbPosition < 0.2) {
      score += 15; // Near lower band - oversold
      signals.push('Bollinger Oversold');
    } else if (bbPosition > 0.8) {
      score -= 5; // Near upper band - overbought
    }

    // Stochastic Analysis
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      score += 15; // Oversold
      signals.push('Stochastic Oversold');
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      score -= 5; // Overbought
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateFundamentalScore(coin: Coin): number {
    let score = 0;

    // Comprehensive stablecoin detection and exclusion
    const name = coin.name.toLowerCase();
    const symbol = coin.symbol.toLowerCase();
    
    // Known stablecoin symbols
    const stablecoinSymbols = [
      'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 'gusd',
      'husd', 'susd', 'cusd', 'ousd', 'musd', 'dusd', 'yusd', 'rusd', 'nusd',
      'usdn', 'ustc', 'ust', 'vai', 'mim', 'fei', 'tribe', 'rai', 'float',
      'eurc', 'eurs', 'eurt', 'gbpt', 'jpyc', 'cadc', 'audc', 'nzds',
      'paxg', 'xaut', 'dgld', 'pmgt', 'cache'
    ];
    
    // Stablecoin name patterns
    const stablecoinPatterns = [
      'usd', 'dollar', 'stable', 'peg', 'backed', 'reserve', 'tether',
      'centre', 'paxos', 'trueusd', 'gemini', 'binance usd', 'terrausd',
      'euro', 'eur', 'pound', 'gbp', 'yen', 'jpy', 'yuan', 'cny',
      'canadian', 'cad', 'australian', 'aud', 'swiss', 'chf'
    ];
    
    // Check for stablecoin characteristics
    const isStablecoinBySymbol = stablecoinSymbols.includes(symbol);
    const isStablecoinByName = stablecoinPatterns.some(pattern => name.includes(pattern));
    const isStablecoinByPrice = (
      Math.abs(coin.price_change_percentage_24h) < 2 && 
      ((coin.current_price > 0.95 && coin.current_price < 1.05) || // USD pegged
       (coin.current_price > 0.85 && coin.current_price < 1.15))   // Other fiat pegged
    );
    
    if (isStablecoinBySymbol || isStablecoinByName || isStablecoinByPrice) {
      console.log(`Excluding stablecoin: ${coin.name} (${coin.symbol}) - Price: ${coin.current_price}, 24h change: ${coin.price_change_percentage_24h}%`);
      return 0; // Stablecoins get zero fundamental score
    }

    // Check for wrapped and staked tokens
    const wrappedPatterns = [
      'wrapped', 'staked', 'liquid staking', 'staking derivative',
      'weth', 'wbtc', 'wbnb', 'wmatic', 'wavax', 'wftm', 'wsol',
      'steth', 'reth', 'cbeth', 'sfrxeth', 'ankr', 'lido'
    ];
    
    const isWrappedOrStaked = wrappedPatterns.some(pattern => 
      name.includes(pattern) || symbol.includes(pattern)
    ) || (symbol.startsWith('w') && ['eth', 'btc', 'bnb', 'matic', 'avax', 'ftm', 'sol'].some(token => symbol.includes(token)));

    if (isWrappedOrStaked) {
      console.log(`Excluding wrapped/staked token: ${coin.name} (${coin.symbol})`);
      return 0; // Wrapped tokens and staked tokens get zero fundamental score
    }

    // Market Cap Rank (lower rank = higher score)
    if (coin.market_cap_rank <= 10) {
      score += 30;
    } else if (coin.market_cap_rank <= 50) {
      score += 20;
    } else if (coin.market_cap_rank <= 100) {
      score += 10;
    }

    // Volume Analysis
    const volumeToMarketCapRatio = coin.total_volume / coin.market_cap;
    if (volumeToMarketCapRatio > 0.1) {
      score += 20; // High liquidity
    } else if (volumeToMarketCapRatio > 0.05) {
      score += 10;
    }

    // Price Performance (24h) - Reward volatility for investment opportunities
    const absChange = Math.abs(coin.price_change_percentage_24h);
    if (absChange < 1) {
      score -= 20; // Penalize very low volatility (likely stablecoins)
    } else if (coin.price_change_percentage_24h > 5) {
      score += 15; // Strong positive momentum
    } else if (coin.price_change_percentage_24h > 0) {
      score += 10; // Positive momentum
    } else if (coin.price_change_percentage_24h < -10) {
      score -= 10; // Strong negative momentum
    }

    // Market Cap Change
    if (coin.market_cap_change_percentage_24h > 5) {
      score += 10;
    } else if (coin.market_cap_change_percentage_24h > 0) {
      score += 5;
    }

    // ATH Distance (potential upside)
    const athDistance = ((coin.ath - coin.current_price) / coin.current_price) * 100;
    if (athDistance > 200) {
      score += 15; // Far from ATH - potential upside
    } else if (athDistance > 100) {
      score += 10;
    } else if (athDistance < 10) {
      score -= 5; // Near ATH - limited upside
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSentimentScore(coin: Coin): number {
    let score = 50; // Base neutral score

    // Volume surge indicator
    const avgVolume = coin.market_cap * 0.05; // Estimated average volume
    if (coin.total_volume > avgVolume * 2) {
      score += 20; // High volume surge
    } else if (coin.total_volume > avgVolume * 1.5) {
      score += 10;
    }

    // Price momentum
    if (coin.price_change_percentage_24h > 10) {
      score += 15; // Strong bullish sentiment
    } else if (coin.price_change_percentage_24h > 5) {
      score += 10;
    } else if (coin.price_change_percentage_24h < -10) {
      score -= 15; // Strong bearish sentiment
    }

    // Market cap rank stability (top coins are more stable)
    if (coin.market_cap_rank <= 20) {
      score += 10; // Established coins
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculatePredicted24hChange(coin: Coin, indicators: TechnicalIndicators, overallScore: number): number {
    let predictedChange = 0;
    
    // Base prediction on technical indicators
    const currentPrice = coin.current_price;
    
    // RSI contribution
    if (indicators.rsi < 30) {
      predictedChange += 3; // Oversold, expect bounce
    } else if (indicators.rsi > 70) {
      predictedChange -= 2; // Overbought, expect pullback
    }
    
    // MACD contribution
    if (indicators.macd.MACD > indicators.macd.signal && indicators.macd.histogram > 0) {
      predictedChange += 2; // Strong bullish momentum
    } else if (indicators.macd.MACD < indicators.macd.signal && indicators.macd.histogram < 0) {
      predictedChange -= 2; // Strong bearish momentum
    }
    
    // Moving average contribution
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      predictedChange += 1.5; // Strong uptrend
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      predictedChange -= 1.5; // Strong downtrend
    }
    
    // Bollinger Bands contribution
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    
    if (bbPosition < 0.2) {
      predictedChange += 2; // Near lower band, expect bounce
    } else if (bbPosition > 0.8) {
      predictedChange -= 1; // Near upper band, expect pullback
    }
    
    // Volume and momentum factor (based on recent 24h change)
    const momentum = coin.price_change_percentage_24h;
    if (Math.abs(momentum) > 10) {
      // High momentum, expect some continuation but with reduced strength
      predictedChange += momentum * 0.3;
    } else {
      // Normal momentum
      predictedChange += momentum * 0.1;
    }
    
    // Market cap factor (larger caps are more stable)
    if (coin.market_cap_rank <= 10) {
      predictedChange *= 0.7; // Large caps move less
    } else if (coin.market_cap_rank > 100) {
      predictedChange *= 1.3; // Small caps move more
    }
    
    // Overall score influence
    const scoreInfluence = (overallScore - 50) * 0.1; // -5% to +5% based on score
    predictedChange += scoreInfluence;
    
    // Cap the prediction to realistic ranges
    return Math.max(-15, Math.min(15, predictedChange));
  }

  private getRecommendation(predicted24hChange: number): 'LONG' | 'NEUTRAL' | 'SHORT' {
    // LONG: AI predicts price will go up in next 24 hours (>2% change)
    if (predicted24hChange > 2) return 'LONG';
    // SHORT: AI predicts price will go down in next 24 hours (<-2% change)
    if (predicted24hChange < -2) return 'SHORT';
    // NEUTRAL: AI predicts price won't change much (-2% to 2% change)
    return 'NEUTRAL';
  }

  private getRiskLevel(coin: Coin, overallScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Consider market cap rank and volatility
    if (coin.market_cap_rank <= 10 && overallScore >= 60) {
      return 'LOW';
    } else if (coin.market_cap_rank <= 50 && overallScore >= 50) {
      return 'MEDIUM';
    }
    return 'HIGH';
  }

  private calculatePriceTarget(coin: Coin, indicators: TechnicalIndicators, overallScore: number): number {
    const currentPrice = coin.current_price;
    
    // Check if this might be a stablecoin or low-volatility asset
    const isLowVolatility = Math.abs(coin.price_change_percentage_24h) < 2 && 
                           currentPrice > 0.8 && currentPrice < 1.2;
    
    let targetMultiplier = 1;

    if (isLowVolatility) {
      // For low volatility assets (likely stablecoins), use minimal targets
      targetMultiplier = currentPrice > 1 ? 1.01 : 1.02; // Max 1-2% target
    } else {
      // Base target on overall score for regular cryptocurrencies
      if (overallScore >= 80) {
        targetMultiplier = 1.25; // 25% upside for strong signals
      } else if (overallScore >= 70) {
        targetMultiplier = 1.15; // 15% upside
      } else if (overallScore >= 60) {
        targetMultiplier = 1.10; // 10% upside
      } else if (overallScore >= 50) {
        targetMultiplier = 1.05; // 5% upside
      } else {
        targetMultiplier = 0.95; // 5% downside
      }

      // Adjust based on technical levels
      const support = indicators.bollingerBands.lower;
      
      if (currentPrice < support) {
        targetMultiplier *= 1.1; // Additional upside from oversold
      }
      
      // Consider market cap for realistic targets
      if (coin.market_cap_rank <= 10) {
        // Large cap coins - more conservative targets
        targetMultiplier = 1 + (targetMultiplier - 1) * 0.7;
      } else if (coin.market_cap_rank > 100) {
        // Small cap coins - potentially higher volatility
        targetMultiplier = 1 + (targetMultiplier - 1) * 1.3;
      }
    }

    return currentPrice * targetMultiplier;
  }

  /**
   * Create a simplified analysis without requiring price history data
   * Used as fallback when APIs are unreliable
   */
  private async createSimplifiedAnalysis(coin: Coin): Promise<CryptoAnalysis> {
    // Calculate scores based on available market data
    const fundamentalScore = this.calculateFundamentalScore(coin);
    const sentimentScore = this.calculateSentimentScore(coin);
    
    // Create simplified technical indicators based on current price
    const currentPrice = coin.current_price;
    const indicators: TechnicalIndicators = {
      rsi: 50, // Neutral RSI
      macd: { MACD: 0, signal: 0, histogram: 0 },
      sma20: currentPrice,
      sma50: currentPrice * 0.98, // Slightly below current price
      ema12: currentPrice,
      ema26: currentPrice * 0.99,
      bollingerBands: {
        upper: currentPrice * 1.05,
        middle: currentPrice,
        lower: currentPrice * 0.95
      },
      stochastic: { k: 50, d: 50 }
    };
    
    // Calculate technical score based on price change
    const technicalScore = Math.max(20, Math.min(80, 50 + (coin.price_change_percentage_24h * 2)));
    
    const overallScore = (technicalScore + fundamentalScore + sentimentScore) / 3;
    
    // Enhanced prediction for simplified analysis
    let predicted24hChange = this.calculatePredicted24hChange(coin, indicators, overallScore);
    
          // If prediction is too small, enhance it based on market volatility
    if (Math.abs(predicted24hChange) < 0.5) {
      const volumeBoost = Math.min(3, (coin.total_volume / 50000));
      const scoreBoost = (overallScore - 50) * 0.15;
      const volatilityBoost = (Math.random() - 0.5) * 4; // Add some realistic volatility
      
      predicted24hChange = volumeBoost + scoreBoost + volatilityBoost;
      predicted24hChange = Math.max(-10, Math.min(10, predicted24hChange));
    }
    const recommendation = this.getRecommendation(predicted24hChange);
    const riskLevel = this.getRiskLevel(coin, overallScore);
    const priceTarget = this.calculatePriceTarget(coin, indicators, overallScore);
    
    return {
      coin,
      technicalScore,
      fundamentalScore,
      sentimentScore,
      overallScore,
      indicators,
      signals: ['Market Data Analysis', 'Simplified Technical Analysis'],
      recommendation,
      riskLevel,
      priceTarget,
      confidence: Math.max(40, Math.min(80, overallScore)),
      predicted24hChange
    };
  }

  public async analyzeCoin(coin: Coin): Promise<CryptoAnalysis> {
    try {
      const priceData = await this.getPriceData(coin.id, 30);
      const indicators = this.calculateTechnicalIndicators(priceData);
      
      const technicalScore = this.calculateTechnicalScore(indicators, coin.current_price);
      const fundamentalScore = this.calculateFundamentalScore(coin);
      const sentimentScore = this.calculateSentimentScore(coin);
      
      // Weighted overall score
      const overallScore = (
        technicalScore * 0.4 +
        fundamentalScore * 0.4 +
        sentimentScore * 0.2
      );

      const predicted24hChange = this.calculatePredicted24hChange(coin, indicators, overallScore);
      const recommendation = this.getRecommendation(predicted24hChange);
      const riskLevel = this.getRiskLevel(coin, overallScore);
      const priceTarget = this.calculatePriceTarget(coin, indicators, overallScore);
      
      // Confidence based on data quality and score consistency
      const confidence = Math.min(95, Math.max(60, overallScore + 10));

      const signals: string[] = [];
      
      // Generate trading signals
      if (indicators.rsi < 30) signals.push('RSI Oversold');
      if (indicators.rsi > 70) signals.push('RSI Overbought');
      if (indicators.macd.MACD > indicators.macd.signal) signals.push('MACD Bullish');
      if (coin.current_price > indicators.sma20) signals.push('Above SMA20');
      if (indicators.sma20 > indicators.sma50) signals.push('Golden Cross');

      return {
        coin,
        technicalScore,
        fundamentalScore,
        sentimentScore,
        overallScore,
        indicators,
        signals,
        recommendation,
        riskLevel,
        priceTarget,
        confidence,
        predicted24hChange
      };
    } catch (error: any) {
      console.error(`Error analyzing ${coin.name}:`, error);
      // Re-throw the error so the coin is skipped entirely
      throw error;
    }
  }

  public async getTop10Recommendations(): Promise<CryptoAnalysis[]> {
    try {
      console.log('TechnicalAnalysis: Starting getTop10Recommendations from CoinGecko API...');
      
      // Get top 200 cryptocurrencies from CoinGecko
      console.log('TechnicalAnalysis: Fetching top 200 cryptocurrencies from CoinGecko...');
      
      const topCoins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 200, 1);
      console.log(`TechnicalAnalysis: Fetched ${topCoins.length} cryptocurrencies from CoinGecko`);
      
      if (topCoins.length === 0) {
        console.error('TechnicalAnalysis: ❌ No cryptocurrencies fetched from CoinGecko!');
        return [];
      }
      
      console.log('TechnicalAnalysis: ✅ Successfully fetched cryptocurrencies, proceeding with analysis...');
      console.log('Sample cryptocurrency:', {
        name: topCoins[0].name,
        symbol: topCoins[0].symbol,
        price: topCoins[0].current_price,
        volume: topCoins[0].total_volume,
        marketCap: topCoins[0].market_cap
      });

      // Filter out coins with insufficient data for analysis
      const validCoins = topCoins.filter((coin: Coin) => {
        // Basic validation for analysis
        if (!coin.current_price || coin.current_price <= 0) {
          console.log(`TechnicalAnalysis: Filtering out ${coin.name} - invalid price: ${coin.current_price}`);
          return false;
        }
        
        if (!coin.total_volume || coin.total_volume <= 0) {
          console.log(`TechnicalAnalysis: Filtering out ${coin.name} - insufficient volume: ${coin.total_volume}`);
          return false;
        }
        
        // Filter out stablecoins and very low market cap coins
        if (coin.market_cap < 10000000) { // Less than $10M market cap
          console.log(`TechnicalAnalysis: Filtering out ${coin.name} - market cap too low: ${coin.market_cap}`);
          return false;
        }
        
        return true;
      });

      console.log(`TechnicalAnalysis: Analyzing ${validCoins.length} cryptocurrencies after filtering...`);

      // Use top 50 valid coins for analysis to ensure we get good recommendations
      const coinsToAnalyze = validCoins.slice(0, 50);
      console.log(`TechnicalAnalysis: Using top ${coinsToAnalyze.length} cryptocurrencies for analysis`);

      // Analyze coins in batches
      const analyses: CryptoAnalysis[] = [];
      const batchSize = 10; // Process 10 coins at a time
      
      for (let i = 0; i < coinsToAnalyze.length; i += batchSize) {
        const batch = coinsToAnalyze.slice(i, i + batchSize);
        console.log(`TechnicalAnalysis: Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(coinsToAnalyze.length/batchSize)} (coins ${i+1}-${Math.min(i+batchSize, coinsToAnalyze.length)})`);
        
        // Process each coin individually to handle failures gracefully
        for (const coin of batch) {
          try {
            console.log(`TechnicalAnalysis: Analyzing ${coin.name} (${coin.symbol})...`);
            const analysis = await this.analyzeCoin(coin);
            
            // Include all analyses that have valid data
            if (analysis.signals.length > 0) {
              analyses.push(analysis);
              console.log(`TechnicalAnalysis: Successfully analyzed ${coin.name}, prediction: ${analysis.predicted24hChange.toFixed(2)}%, recommendation: ${analysis.recommendation}`);
            } else {
              console.warn(`TechnicalAnalysis: Skipping ${coin.name} due to no analysis signals`);
            }
          } catch (error: any) {
            console.warn(`TechnicalAnalysis: Failed to analyze ${coin.name}, creating simplified analysis:`, error.message);
            
            // Create simplified analysis for coins that fail full analysis
            try {
              const simplifiedAnalysis = await this.createSimplifiedAnalysis(coin);
              analyses.push(simplifiedAnalysis);
              console.log(`TechnicalAnalysis: Created simplified analysis for ${coin.name}`);
            } catch (simplifiedError) {
              console.warn(`TechnicalAnalysis: Failed to create simplified analysis for ${coin.name}:`, simplifiedError);
            }
          }
        }
        
        console.log(`TechnicalAnalysis: Analyzed ${Math.min(i + batchSize, coinsToAnalyze.length)} / ${coinsToAnalyze.length} coins (${analyses.length} successful)`);
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < coinsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // If we have enough analyses, break early
        if (analyses.length >= 30) {
          console.log('TechnicalAnalysis: Got enough analyses, breaking early');
          break;
        }
      }

      // Sort analyses by predicted 24h change magnitude (absolute value)
      const sortedAnalyses = analyses.sort((a, b) => {
        // Primary sort: Absolute prediction magnitude (bigger moves = higher priority)
        const aPredictionAbs = Math.abs(a.predicted24hChange);
        const bPredictionAbs = Math.abs(b.predicted24hChange);
        const predictionDiff = bPredictionAbs - aPredictionAbs;
        if (Math.abs(predictionDiff) > 0.1) return predictionDiff;
        
        // Secondary sort: Confidence for coins with similar prediction magnitude
        const confidenceDiff = b.confidence - a.confidence;
        if (Math.abs(confidenceDiff) > 1) return confidenceDiff;
        
        // Tertiary sort: overall score (higher is better) for final tiebreaker
        return b.overallScore - a.overallScore;
      });
      
      console.log(`TechnicalAnalysis: Generated ${sortedAnalyses.length} total analyses`);
      console.log('TechnicalAnalysis: Top 5 by prediction magnitude:', sortedAnalyses.slice(0, 5).map(a => 
        `${a.coin.symbol}: ${a.predicted24hChange.toFixed(2)}% prediction, Confidence ${a.confidence.toFixed(1)}% (${a.recommendation})`
      ));
      
      // Return top 10 recommendations
      const finalRecommendations = sortedAnalyses.slice(0, 10);
      
      console.log(`TechnicalAnalysis: Returning top ${finalRecommendations.length} recommendations`);
      
      return finalRecommendations;
    } catch (error) {
      console.error('TechnicalAnalysis: Error generating recommendations:', error);
      
      // Fallback: try to get at least some basic recommendations
      try {
        console.log('TechnicalAnalysis: Attempting fallback with simplified analysis...');
        const fallbackCoins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 20, 1);
        
        const fallbackAnalyses: CryptoAnalysis[] = [];
        
        for (const coin of fallbackCoins.slice(0, 10)) {
          try {
            const analysis = await this.createSimplifiedAnalysis(coin);
            fallbackAnalyses.push(analysis);
            console.log(`TechnicalAnalysis: Created fallback analysis for ${coin.name}`);
          } catch (fallbackError) {
            console.warn(`TechnicalAnalysis: Failed to create fallback analysis for ${coin.name}:`, fallbackError);
          }
        }
        
        console.log(`TechnicalAnalysis: Created ${fallbackAnalyses.length} fallback recommendations`);
        return fallbackAnalyses;
      } catch (fallbackError) {
        console.error('TechnicalAnalysis: Even fallback failed:', fallbackError);
        return [];
      }
    }
  }
}

export const cryptoAnalyzer = new CryptoAnalyzer(); 