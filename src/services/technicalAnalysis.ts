import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } from 'technicalindicators';
import { Coin } from '../types';
import { coinGeckoApi } from './api';
import CategoryService from './categoryService';

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
      console.log('TechnicalAnalysis: Starting getTop10Recommendations...');
      
      // Get top 200 cryptocurrencies
      const allCoins: Coin[] = [];
      const seenCoinIds = new Set<string>(); // Track seen coin IDs to prevent duplicates
      const seenCoinNames = new Set<string>(); // Track seen coin names to prevent duplicates
      
      console.log('TechnicalAnalysis: Fetching top 200 cryptocurrencies...');
      
      for (let page = 1; page <= 10; page++) { // 10 pages * 20 coins = 200 coins
        try {
          console.log(`TechnicalAnalysis: Fetching page ${page}/10...`);
          const coins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 20, page);
          console.log(`TechnicalAnalysis: Page ${page} returned ${coins.length} coins`);
          
          // Filter out duplicates first
          const filteredCoins = coins.filter(coin => {
            // Check for duplicates by ID
            if (seenCoinIds.has(coin.id)) {
              console.warn(`TechnicalAnalysis: Duplicate coin ID detected: ${coin.name} (${coin.id})`);
              return false;
            }
            
            // Check for duplicates by name (case-insensitive)
            const normalizedName = coin.name.toLowerCase().trim();
            if (seenCoinNames.has(normalizedName)) {
              console.warn(`TechnicalAnalysis: Duplicate coin name detected: ${coin.name}`);
              return false;
            }
            
            // Mark as seen
            seenCoinIds.add(coin.id);
            seenCoinNames.add(normalizedName);
            return true;
          });
          
          allCoins.push(...filteredCoins);
          console.log(`TechnicalAnalysis: Page ${page} added ${filteredCoins.length} unique coins, total: ${allCoins.length}`);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`TechnicalAnalysis: Failed to fetch page ${page}, continuing with available data:`, error);
          break;
        }
      }

      console.log(`TechnicalAnalysis: Fetched ${allCoins.length} cryptocurrencies, now fetching categories for filtering...`);

      // If we have no coins at all, return empty array
      if (allCoins.length === 0) {
        console.error('TechnicalAnalysis: No coins fetched, returning empty recommendations');
        return [];
      }

      // Fetch categories for all coins to filter out unwanted types
      const coinIds = allCoins.map(coin => coin.id);
      let categoriesMap: Map<string, string[]>;
      
      try {
        categoriesMap = await CategoryService.batchGetCategories(coinIds);
        console.log(`TechnicalAnalysis: Retrieved categories for ${categoriesMap.size} coins`);
      } catch (error) {
        console.warn('TechnicalAnalysis: Category filtering failed, proceeding without filtering:', error);
        categoriesMap = new Map(); // Empty map, no filtering
      }
      
      // Filter out coins based on categories and comprehensive checks
      const validCoins = allCoins.filter(coin => {
        const categories = categoriesMap.get(coin.id) || [];
        
        // Use comprehensive filtering that checks both categories and coin properties
        if (CategoryService.shouldExcludeCoinComprehensive(coin, categories)) {
          console.log(`TechnicalAnalysis: Filtering out excluded token: ${coin.name} (${coin.symbol}) - Categories: ${categories.join(', ')}`);
          return false;
        }
        
        return true;
      });

      console.log(`TechnicalAnalysis: Analyzing ${validCoins.length} cryptocurrencies after category filtering...`);

      // If no valid coins after filtering, use top 20 coins without filtering
      const coinsToAnalyze = validCoins.length > 0 ? validCoins : allCoins.slice(0, 20);
      console.log(`TechnicalAnalysis: Using ${coinsToAnalyze.length} coins for analysis`);

      // Analyze all coins
      const analyses: CryptoAnalysis[] = [];
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 5; // Reduced batch size for better reliability
      for (let i = 0; i < coinsToAnalyze.length; i += batchSize) {
        const batch = coinsToAnalyze.slice(i, i + batchSize);
        console.log(`TechnicalAnalysis: Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(coinsToAnalyze.length/batchSize)} (coins ${i+1}-${Math.min(i+batchSize, coinsToAnalyze.length)})`);
        
        // Process each coin individually to handle failures gracefully
        for (const coin of batch) {
          try {
            console.log(`TechnicalAnalysis: Analyzing ${coin.name} (${coin.symbol})...`);
            const analysis = await this.analyzeCoin(coin);
            // Only include analysis if it has valid data (not fallback analysis)
            if (analysis.signals.length > 0 && !analysis.signals.includes('Analysis Limited')) {
              analyses.push(analysis);
              console.log(`TechnicalAnalysis: Successfully analyzed ${coin.name}, prediction: ${analysis.predicted24hChange.toFixed(2)}%, recommendation: ${analysis.recommendation}`);
            } else {
              console.warn(`TechnicalAnalysis: Skipping ${coin.name} due to limited analysis data`);
            }
          } catch (error: any) {
            console.warn(`TechnicalAnalysis: Failed to analyze ${coin.name}, skipping:`, error.message);
            // Skip this coin entirely
          }
        }
        
        console.log(`TechnicalAnalysis: Analyzed ${Math.min(i + batchSize, coinsToAnalyze.length)} / ${coinsToAnalyze.length} coins (${analyses.length} successful)`);
        
        // Add delay between batches
        if (i + batchSize < coinsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
        }
        
        // If we have enough analyses, break early to save time
        if (analyses.length >= 20) {
          console.log('TechnicalAnalysis: Got enough analyses, breaking early');
          break;
        }
      }

      // If we still don't have enough analyses, create basic fallback recommendations
      if (analyses.length < 5) {
        console.warn(`TechnicalAnalysis: Only ${analyses.length} successful analyses, creating fallback recommendations`);
        const fallbackCoins = coinsToAnalyze.slice(0, 10);
        
        for (const coin of fallbackCoins) {
          if (analyses.find(a => a.coin.id === coin.id)) continue; // Skip if already analyzed
          
          // Create basic analysis based on 24h price change
          const predicted24hChange = coin.price_change_percentage_24h * 0.5; // Conservative prediction
          const recommendation = predicted24hChange > 2 ? 'LONG' : predicted24hChange < -2 ? 'SHORT' : 'NEUTRAL';
          const overallScore = Math.max(30, Math.min(70, 50 + coin.price_change_percentage_24h));
          
          const fallbackAnalysis: CryptoAnalysis = {
            coin,
            technicalScore: overallScore,
            fundamentalScore: 50,
            sentimentScore: 50,
            overallScore,
            indicators: {
              rsi: 50,
              macd: { MACD: 0, signal: 0, histogram: 0 },
              sma20: coin.current_price,
              sma50: coin.current_price,
              ema12: coin.current_price,
              ema26: coin.current_price,
              bollingerBands: {
                upper: coin.current_price * 1.1,
                middle: coin.current_price,
                lower: coin.current_price * 0.9
              },
              stochastic: { k: 50, d: 50 }
            },
            signals: ['Basic Analysis'],
            recommendation,
            riskLevel: coin.market_cap_rank <= 10 ? 'LOW' : coin.market_cap_rank <= 50 ? 'MEDIUM' : 'HIGH',
            priceTarget: coin.current_price * (1 + predicted24hChange / 100),
            confidence: 60,
            predicted24hChange
          };
          
          analyses.push(fallbackAnalysis);
          console.log(`TechnicalAnalysis: Created fallback analysis for ${coin.name}`);
        }
      }

      // Sort all analyses by absolute predicted change (highest volatility first)
      // This shows coins with the most predicted price movement (up or down)
      const sortedAnalyses = analyses.sort((a, b) => 
        Math.abs(b.predicted24hChange) - Math.abs(a.predicted24hChange)
      );
      
      console.log(`TechnicalAnalysis: Generated top ${Math.min(10, sortedAnalyses.length)} recommendations by predicted 24h change`);
      console.log('TechnicalAnalysis: Top predictions:', sortedAnalyses.slice(0, 5).map(a => 
        `${a.coin.symbol}: ${a.predicted24hChange.toFixed(2)}% (${a.recommendation})`
      ));
      
      const finalRecommendations = sortedAnalyses.slice(0, 10);
      console.log(`TechnicalAnalysis: Returning ${finalRecommendations.length} recommendations`);
      
      return finalRecommendations;
    } catch (error) {
      console.error('TechnicalAnalysis: Error generating recommendations:', error);
      
      // Last resort fallback - try to get just the top 10 coins and create basic recommendations
      try {
        console.log('TechnicalAnalysis: Attempting last resort fallback...');
        const fallbackCoins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 10, 1);
        
        const fallbackAnalyses: CryptoAnalysis[] = fallbackCoins.map(coin => {
          const predicted24hChange = coin.price_change_percentage_24h * 0.3; // Very conservative
          const recommendation = predicted24hChange > 2 ? 'LONG' : predicted24hChange < -2 ? 'SHORT' : 'NEUTRAL';
          const overallScore = Math.max(30, Math.min(70, 50 + coin.price_change_percentage_24h));
          
          return {
            coin,
            technicalScore: overallScore,
            fundamentalScore: 50,
            sentimentScore: 50,
            overallScore,
            indicators: {
              rsi: 50,
              macd: { MACD: 0, signal: 0, histogram: 0 },
              sma20: coin.current_price,
              sma50: coin.current_price,
              ema12: coin.current_price,
              ema26: coin.current_price,
              bollingerBands: {
                upper: coin.current_price * 1.1,
                middle: coin.current_price,
                lower: coin.current_price * 0.9
              },
              stochastic: { k: 50, d: 50 }
            },
            signals: ['Fallback Analysis'],
            recommendation,
            riskLevel: coin.market_cap_rank <= 10 ? 'LOW' : coin.market_cap_rank <= 50 ? 'MEDIUM' : 'HIGH',
            priceTarget: coin.current_price * (1 + predicted24hChange / 100),
            confidence: 50,
            predicted24hChange
          };
        });
        
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