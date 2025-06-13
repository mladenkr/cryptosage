import { Coin } from '../types';
import { coinGeckoApi } from './api';

// Enhanced Technical Indicators Interface
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
  atr: number;
  adx: number;
  // NEW ADVANCED INDICATORS
  williamsR: number;
  cci: number;
  parabolicSAR: number;
  mfi: number;
  obv: number;
  vpt: number;
  ichimoku: {
    tenkanSen: number;
    kijunSen: number;
    senkouSpanA: number;
    senkouSpanB: number;
    chikouSpan: number;
  };
}

// Enhanced Pattern Recognition
export interface PatternAnalysis {
  candlestickPatterns: string[];
  chartPatterns: string[];
  divergences: string[];
  patternStrength: number;
}

// Support/Resistance Levels
export interface SupportResistanceLevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
  touches: number;
}

// Enhanced Multi-timeframe Analysis (added 4h)
export interface MultiTimeframeAnalysis {
  '1h': {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    indicators: TechnicalIndicators;
  };
  '4h': {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    indicators: TechnicalIndicators;
  };
  '1d': {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    indicators: TechnicalIndicators;
  };
  '1w': {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    indicators: TechnicalIndicators;
  };
}

// Market Regime Detection
export interface MarketRegime {
  type: 'TRENDING' | 'RANGING' | 'VOLATILE';
  strength: number;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
}

export interface CryptoAnalysis {
  coin: Coin;
  indicators: TechnicalIndicators;
  multiTimeframe: MultiTimeframeAnalysis;
  supportResistance: SupportResistanceLevel[];
  predicted1hChange: number;
  technicalScore: number;
  fundamentalScore: number;
  sentimentScore: number;
  overallScore: number;
  confidence: number;
  signals: string[];
  recommendation: 'LONG' | 'SHORT';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  priceTarget: number;
  patternAnalysis: PatternAnalysis;
  marketTrend: {
    trend: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    strength: number;
  };
}

export class CryptoAnalyzer {
  
  // Get OHLC price data for technical analysis
  private async getOHLCData(coinId: string, days: number = 30, interval: 'hourly' | 'daily' = 'daily'): Promise<number[][]> {
    try {
      // Try to get OHLC data first
      const ohlcData = await coinGeckoApi.getCoinOHLC(coinId, 'usd', days);
      if (ohlcData && ohlcData.length > 0) {
        return ohlcData;
      }
    } catch (error) {
      console.warn(`OHLC data not available for ${coinId}, using price history`);
    }

    // Fallback to price history and convert to OHLC
    try {
      const historyData = await coinGeckoApi.getCoinHistory(coinId, 'usd', days);
      return this.convertPriceHistoryToOHLC(historyData.prices);
    } catch (error) {
      console.warn(`Failed to get any price data for ${coinId}`);
      throw new Error(`Price data unavailable for ${coinId}`);
    }
  }

  // Convert price history to OHLC format
  private convertPriceHistoryToOHLC(prices: number[][]): number[][] {
    if (!prices || prices.length < 4) return [];
    
    const ohlcData: number[][] = [];
    const groupSize = Math.max(1, Math.floor(prices.length / 100)); // Create ~100 candles
    
    for (let i = 0; i < prices.length; i += groupSize) {
      const group = prices.slice(i, i + groupSize);
      if (group.length === 0) continue;
      
      const timestamp = group[0][0];
      const groupPrices = group.map(p => p[1]);
      const open = groupPrices[0];
      const close = groupPrices[groupPrices.length - 1];
      const high = Math.max(...groupPrices);
      const low = Math.min(...groupPrices);
      
      ohlcData.push([timestamp, open, high, low, close]);
    }
    
    return ohlcData;
  }

  // Calculate RSI (Relative Strength Index)
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using Wilder's smoothing
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Calculate MACD (Moving Average Convergence Divergence)
  private calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { MACD: number; signal: number; histogram: number } {
    if (prices.length < slowPeriod) return { MACD: 0, signal: 0, histogram: 0 };
    
    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);
    
    const macdLine: number[] = [];
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }
    
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const currentMACD = macdLine[macdLine.length - 1] || 0;
    const currentSignal = signalLine[signalLine.length - 1] || 0;

    return {
      MACD: currentMACD,
      signal: currentSignal,
      histogram: currentMACD - currentSignal
    };
  }

  // Calculate EMA (Exponential Moving Average)
  private calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];
    
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  // Calculate SMA (Simple Moving Average)
  private calculateSMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];
    
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    
    return sma;
  }

  // Calculate Bollinger Bands
  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
    
    const sma = this.calculateSMA(prices, period);
    const currentSMA = sma[sma.length - 1];
    
    // Calculate standard deviation
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - currentSMA, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: currentSMA + (standardDeviation * stdDev),
      middle: currentSMA,
      lower: currentSMA - (standardDeviation * stdDev)
    };
  }

  // Calculate Stochastic Oscillator
  private calculateStochastic(ohlcData: number[][], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number } {
    if (ohlcData.length < kPeriod) return { k: 50, d: 50 };
    
    const recentData = ohlcData.slice(-kPeriod);
    const currentClose = ohlcData[ohlcData.length - 1][4]; // Close price
    const highestHigh = Math.max(...recentData.map(d => d[2])); // Highest high
    const lowestLow = Math.min(...recentData.map(d => d[3])); // Lowest low
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (SMA of %K)
    const kValues: number[] = [];
    for (let i = Math.max(0, ohlcData.length - dPeriod); i < ohlcData.length; i++) {
      const periodData = ohlcData.slice(Math.max(0, i - kPeriod + 1), i + 1);
      const close = ohlcData[i][4];
      const high = Math.max(...periodData.map(d => d[2]));
      const low = Math.min(...periodData.map(d => d[3]));
      kValues.push(((close - low) / (high - low)) * 100);
    }
    
    const d = kValues.reduce((sum, val) => sum + val, 0) / kValues.length;
    
    return { k: isNaN(k) ? 50 : k, d: isNaN(d) ? 50 : d };
  }

  // Calculate ATR (Average True Range)
  private calculateATR(ohlcData: number[][], period: number = 14): number {
    if (ohlcData.length < period + 1) return 0;
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i][2];
      const low = ohlcData[i][3];
      const prevClose = ohlcData[i - 1][4];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate ATR as SMA of True Ranges
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
  }

  // Calculate ADX (Average Directional Index)
  private calculateADX(ohlcData: number[][], period: number = 14): number {
    if (ohlcData.length < period + 1) return 0;
    
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];
    const trueRanges: number[] = [];
    
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i][2];
      const low = ohlcData[i][3];
      const prevHigh = ohlcData[i - 1][2];
      const prevLow = ohlcData[i - 1][3];
      const prevClose = ohlcData[i - 1][4];
      
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      
      dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
      dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    // Calculate smoothed averages
    const avgDMPlus = dmPlus.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
    const avgDMMinus = dmMinus.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
    const avgTR = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    
    if (avgTR === 0) return 0;
    
    const diPlus = (avgDMPlus / avgTR) * 100;
    const diMinus = (avgDMMinus / avgTR) * 100;
    
    if (diPlus + diMinus === 0) return 0;
    
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    return dx;
  }

  // Calculate Williams %R
  private calculateWilliamsR(ohlcData: number[][], period: number = 14): number {
    if (ohlcData.length < period) return -50;
    
    const recentData = ohlcData.slice(-period);
    const currentClose = ohlcData[ohlcData.length - 1][4];
    const highestHigh = Math.max(...recentData.map(d => d[2]));
    const lowestLow = Math.min(...recentData.map(d => d[3]));
    
    if (highestHigh === lowestLow) return -50;
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  // Calculate Commodity Channel Index (CCI)
  private calculateCCI(ohlcData: number[][], period: number = 20): number {
    if (ohlcData.length < period) return 0;
    
    const typicalPrices = ohlcData.map(d => (d[2] + d[3] + d[4]) / 3);
    const recentTP = typicalPrices.slice(-period);
    const smaTP = recentTP.reduce((sum, tp) => sum + tp, 0) / period;
    const currentTP = typicalPrices[typicalPrices.length - 1];
    
    const meanDeviation = recentTP.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
    
    if (meanDeviation === 0) return 0;
    return (currentTP - smaTP) / (0.015 * meanDeviation);
  }

  // Calculate Parabolic SAR
  private calculateParabolicSAR(ohlcData: number[][]): number {
    if (ohlcData.length < 10) return ohlcData[ohlcData.length - 1][4];
    
    let sar = ohlcData[0][3];
    let ep = ohlcData[0][2];
    let acceleration = 0.02;
    let isUpTrend = true;
    
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i][2];
      const low = ohlcData[i][3];
      
      sar = sar + acceleration * (ep - sar);
      
      if (isUpTrend) {
        if (low <= sar) {
          isUpTrend = false;
          sar = ep;
          ep = low;
          acceleration = 0.02;
        } else {
          if (high > ep) {
            ep = high;
            acceleration = Math.min(acceleration + 0.02, 0.2);
          }
        }
      } else {
        if (high >= sar) {
          isUpTrend = true;
          sar = ep;
          ep = high;
          acceleration = 0.02;
        } else {
          if (low < ep) {
            ep = low;
            acceleration = Math.min(acceleration + 0.02, 0.2);
          }
        }
      }
    }
    
    return sar;
  }

  // Calculate Money Flow Index (MFI)
  private calculateMFI(ohlcData: number[][], period: number = 14): number {
    if (ohlcData.length < period + 1) return 50;
    
    const typicalPrices = ohlcData.map(d => (d[2] + d[3] + d[4]) / 3);
    const recent = typicalPrices.slice(-period - 1);
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const volume = 1000000;
      const rawMoneyFlow = recent[i] * volume;
      
      if (recent[i] > recent[i-1]) {
        positiveFlow += rawMoneyFlow;
      } else if (recent[i] < recent[i-1]) {
        negativeFlow += rawMoneyFlow;
      }
    }
    
    if (negativeFlow === 0) return 100;
    const moneyRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyRatio));
  }

  // Calculate On-Balance Volume (OBV)
  private calculateOBV(ohlcData: number[][]): number {
    if (ohlcData.length < 2) return 0;
    
    let obv = 0;
    for (let i = 1; i < ohlcData.length; i++) {
      const currentClose = ohlcData[i][4];
      const prevClose = ohlcData[i-1][4];
      const volume = 1000000;
      
      if (currentClose > prevClose) {
        obv += volume;
      } else if (currentClose < prevClose) {
        obv -= volume;
      }
    }
    
    return obv;
  }

  // Calculate Volume-Price Trend (VPT)
  private calculateVPT(ohlcData: number[][]): number {
    if (ohlcData.length < 2) return 0;
    
    let vpt = 0;
    for (let i = 1; i < ohlcData.length; i++) {
      const currentClose = ohlcData[i][4];
      const prevClose = ohlcData[i-1][4];
      const volume = 1000000;
      
      if (prevClose !== 0) {
        const priceChange = (currentClose - prevClose) / prevClose;
        vpt += volume * priceChange;
      }
    }
    
    return vpt;
  }

  // Calculate Ichimoku Cloud components
  private calculateIchimoku(ohlcData: number[][]): {
    tenkanSen: number;
    kijunSen: number;
    senkouSpanA: number;
    senkouSpanB: number;
    chikouSpan: number;
  } {
    if (ohlcData.length < 52) {
      const currentPrice = ohlcData[ohlcData.length - 1][4];
      return {
        tenkanSen: currentPrice,
        kijunSen: currentPrice,
        senkouSpanA: currentPrice,
        senkouSpanB: currentPrice,
        chikouSpan: currentPrice
      };
    }
    
    const tenkanData = ohlcData.slice(-9);
    const tenkanHigh = Math.max(...tenkanData.map(d => d[2]));
    const tenkanLow = Math.min(...tenkanData.map(d => d[3]));
    const tenkanSen = (tenkanHigh + tenkanLow) / 2;
    
    const kijunData = ohlcData.slice(-26);
    const kijunHigh = Math.max(...kijunData.map(d => d[2]));
    const kijunLow = Math.min(...kijunData.map(d => d[3]));
    const kijunSen = (kijunHigh + kijunLow) / 2;
    
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    
    const senkouData = ohlcData.slice(-52);
    const senkouHigh = Math.max(...senkouData.map(d => d[2]));
    const senkouLow = Math.min(...senkouData.map(d => d[3]));
    const senkouSpanB = (senkouHigh + senkouLow) / 2;
    
    const chikouSpan = ohlcData[ohlcData.length - 1][4];
    
    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan
    };
  }

  // Calculate all technical indicators
  private calculateTechnicalIndicators(ohlcData: number[][]): TechnicalIndicators {
    const closePrices = ohlcData.map(d => d[4]); // Extract close prices
    
    const rsi = this.calculateRSI(closePrices);
    const macd = this.calculateMACD(closePrices);
    const sma20 = this.calculateSMA(closePrices, 20);
    const sma50 = this.calculateSMA(closePrices, 50);
    const ema12 = this.calculateEMA(closePrices, 12);
    const ema26 = this.calculateEMA(closePrices, 26);
    const bollingerBands = this.calculateBollingerBands(closePrices);
    const stochastic = this.calculateStochastic(ohlcData);
    const atr = this.calculateATR(ohlcData);
    const adx = this.calculateADX(ohlcData);
    
    return {
      rsi,
      macd,
      sma20: sma20[sma20.length - 1] || closePrices[closePrices.length - 1],
      sma50: sma50[sma50.length - 1] || closePrices[closePrices.length - 1],
      ema12: ema12[ema12.length - 1] || closePrices[closePrices.length - 1],
      ema26: ema26[ema26.length - 1] || closePrices[closePrices.length - 1],
      bollingerBands,
      stochastic,
      atr,
      adx,
      // NEW ADVANCED INDICATORS
      williamsR: this.calculateWilliamsR(ohlcData),
      cci: this.calculateCCI(ohlcData),
      parabolicSAR: this.calculateParabolicSAR(ohlcData),
      mfi: this.calculateMFI(ohlcData),
      obv: this.calculateOBV(ohlcData),
      vpt: this.calculateVPT(ohlcData),
      ichimoku: this.calculateIchimoku(ohlcData)
    };
  }

  // Calculate support and resistance levels
  private calculateSupportResistance(ohlcData: number[][]): SupportResistanceLevel[] {
    if (ohlcData.length < 20) return [];
    
    const levels: SupportResistanceLevel[] = [];
    const lookback = 10; // Look for pivots within 10 periods
    
    // Find pivot highs and lows
    for (let i = lookback; i < ohlcData.length - lookback; i++) {
      const high = ohlcData[i][2];
      const low = ohlcData[i][3];
      
      // Check for pivot high (resistance)
      let isPivotHigh = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && ohlcData[j][2] >= high) {
          isPivotHigh = false;
          break;
        }
      }
      
      // Check for pivot low (support)
      let isPivotLow = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && ohlcData[j][3] <= low) {
          isPivotLow = false;
          break;
        }
      }
      
      if (isPivotHigh) {
        levels.push({
          price: high,
          strength: this.calculateLevelStrength(ohlcData, high, 'resistance'),
          type: 'resistance',
          touches: this.countTouches(ohlcData, high, 0.02) // 2% tolerance
        });
      }
      
      if (isPivotLow) {
        levels.push({
          price: low,
          strength: this.calculateLevelStrength(ohlcData, low, 'support'),
          type: 'support',
          touches: this.countTouches(ohlcData, low, 0.02) // 2% tolerance
        });
      }
    }
    
    // Sort by strength and return top levels
    return levels
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10); // Return top 10 levels
  }

  // Calculate strength of support/resistance level
  private calculateLevelStrength(ohlcData: number[][], level: number, type: 'support' | 'resistance'): number {
    let strength = 0;
    const tolerance = 0.02; // 2% tolerance
    
    for (const candle of ohlcData) {
      const high = candle[2];
      const low = candle[3];
      const close = candle[4];
      
      if (type === 'resistance') {
        // Check if price tested resistance
        if (Math.abs(high - level) / level <= tolerance) {
          strength += close < level ? 2 : 1; // Rejection adds more strength
        }
      } else {
        // Check if price tested support
        if (Math.abs(low - level) / level <= tolerance) {
          strength += close > level ? 2 : 1; // Bounce adds more strength
        }
      }
    }
    
    return strength;
  }

  // Count how many times price touched a level
  private countTouches(ohlcData: number[][], level: number, tolerance: number): number {
    let touches = 0;
    
    for (const candle of ohlcData) {
      const high = candle[2];
      const low = candle[3];
      
      if (Math.abs(high - level) / level <= tolerance || 
          Math.abs(low - level) / level <= tolerance) {
        touches++;
      }
    }
    
    return touches;
  }

  // Calculate technical score based on indicators
  private calculateTechnicalScore(indicators: TechnicalIndicators, currentPrice: number): number {
    let score = 0;
    let factors = 0;
    
    // RSI Analysis (0-30 oversold, 70-100 overbought)
    if (indicators.rsi < 30) {
      score += 80; // Oversold - bullish
    } else if (indicators.rsi < 50) {
      score += 60; // Below neutral
    } else if (indicators.rsi < 70) {
      score += 40; // Above neutral
    } else {
      score += 20; // Overbought - bearish
    }
    factors++;
    
    // MACD Analysis
    if (indicators.macd.MACD > indicators.macd.signal && indicators.macd.histogram > 0) {
      score += 80; // Strong bullish momentum
    } else if (indicators.macd.MACD > indicators.macd.signal) {
      score += 60; // Bullish momentum
    } else if (indicators.macd.MACD < indicators.macd.signal && indicators.macd.histogram < 0) {
      score += 20; // Strong bearish momentum
    } else {
      score += 40; // Bearish momentum
    }
    factors++;
    
    // Moving Average Analysis
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      score += 80; // Strong uptrend
    } else if (currentPrice > indicators.sma20) {
      score += 60; // Above short-term MA
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      score += 20; // Strong downtrend
    } else {
      score += 40; // Below short-term MA
    }
    factors++;
    
    // Bollinger Bands Analysis
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    
    if (bbPosition < 0.2) {
      score += 75; // Near lower band - oversold
    } else if (bbPosition > 0.8) {
      score += 25; // Near upper band - overbought
    } else {
      score += 50; // Middle range
    }
    factors++;
    
    // Stochastic Analysis
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      score += 80; // Oversold
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      score += 20; // Overbought
    } else {
      score += 50; // Neutral
    }
    factors++;
    
    // ADX Trend Strength
    if (indicators.adx > 25) {
      // Strong trend - boost score based on direction
      const trendDirection = indicators.rsi > 50 ? 1 : -1;
      score += 50 + (trendDirection * 20);
    } else {
      score += 40; // Weak trend
    }
    factors++;
    
    return Math.max(0, Math.min(100, score / factors));
  }

  // Analyze multiple timeframes
  private async analyzeMultiTimeframe(coin: Coin): Promise<MultiTimeframeAnalysis> {
    const timeframes = [
      { key: '1h' as const, days: 2 },
      { key: '4h' as const, days: 4 },
      { key: '1d' as const, days: 30 },
      { key: '1w' as const, days: 200 }
    ];
    
    const analysis: Partial<MultiTimeframeAnalysis> = {};
    
    for (const tf of timeframes) {
      try {
        const ohlcData = await this.getOHLCData(coin.id, tf.days);
        const indicators = this.calculateTechnicalIndicators(ohlcData);
        const technicalScore = this.calculateTechnicalScore(indicators, coin.current_price);
        
        let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (technicalScore > 60) trend = 'bullish';
        else if (technicalScore < 40) trend = 'bearish';
        
        const strength = Math.abs(technicalScore - 50) * 2; // 0-100 scale
        
        analysis[tf.key] = {
          trend,
          strength,
          indicators
        };
      } catch (error) {
        console.warn(`Failed to analyze ${tf.key} timeframe for ${coin.symbol}`);
        // Provide default analysis
        analysis[tf.key] = {
          trend: 'neutral',
          strength: 0,
          indicators: this.getDefaultIndicators(coin.current_price)
        };
      }
    }
    
    return analysis as MultiTimeframeAnalysis;
  }

  // Get default indicators when data is unavailable
  private getDefaultIndicators(currentPrice: number): TechnicalIndicators {
    return {
      rsi: 50,
      macd: { MACD: 0, signal: 0, histogram: 0 },
      sma20: currentPrice,
      sma50: currentPrice * 0.98,
      ema12: currentPrice,
      ema26: currentPrice * 0.99,
      bollingerBands: {
        upper: currentPrice * 1.05,
        middle: currentPrice,
        lower: currentPrice * 0.95
      },
      stochastic: { k: 50, d: 50 },
      atr: currentPrice * 0.02,
      adx: 20,
      // NEW ADVANCED INDICATORS
      williamsR: -50,
      cci: 0,
      parabolicSAR: currentPrice,
      mfi: 50,
      obv: 0,
      vpt: 0,
      ichimoku: {
        tenkanSen: currentPrice,
        kijunSen: currentPrice,
        senkouSpanA: currentPrice,
        senkouSpanB: currentPrice,
        chikouSpan: currentPrice
      }
    };
  }

  // Calculate predicted 1h change based on technical analysis
  private calculatePredicted1hChange(indicators: TechnicalIndicators, multiTimeframe: MultiTimeframeAnalysis, supportResistance: SupportResistanceLevel[], currentPrice: number): number {
    let prediction = 0;
    let weight = 0;
    
    // RSI contribution (adjusted for 1-hour timeframe)
    if (indicators.rsi < 25) {
      prediction += 1.0; // Extremely oversold (1h scale)
      weight += 1.5;
    } else if (indicators.rsi < 35) {
      prediction += 0.6; // Oversold (1h scale)
      weight += 1;
    } else if (indicators.rsi > 75) {
      prediction -= 0.8; // Extremely overbought (1h scale)
      weight += 1.5;
    } else if (indicators.rsi > 65) {
      prediction -= 0.4; // Overbought (1h scale)
      weight += 1;
    } else {
      // Neutral RSI still contributes based on direction
      prediction += (indicators.rsi - 50) * 0.01;
      weight += 0.5;
    }
    
    // MACD contribution (adjusted for 1-hour timeframe)
    const macdStrength = Math.abs(indicators.macd.histogram);
    if (indicators.macd.MACD > indicators.macd.signal) {
      prediction += 0.4 + Math.min(macdStrength * 2, 0.5); // Bullish with strength (1h scale)
      weight += 1;
    } else {
      prediction -= 0.4 + Math.min(macdStrength * 2, 0.5); // Bearish with strength (1h scale)
      weight += 1;
    }
    
    // Moving average contribution (more detailed)
    const smaSpread = Math.abs(indicators.sma20 - indicators.sma50) / currentPrice * 100;
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      prediction += 1.5 + Math.min(smaSpread * 0.5, 1.5); // Strong uptrend with momentum
      weight += 1;
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      prediction -= 1.5 + Math.min(smaSpread * 0.5, 1.5); // Strong downtrend with momentum
      weight += 1;
    } else if (currentPrice > indicators.sma20) {
      prediction += 0.8; // Above short-term MA
      weight += 0.5;
    } else {
      prediction -= 0.8; // Below short-term MA
      weight += 0.5;
    }
    
    // Bollinger Bands position
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    
    if (bbPosition < 0.1) {
      prediction += 2.5; // Very oversold
      weight += 1;
    } else if (bbPosition < 0.2) {
      prediction += 1.5; // Oversold
      weight += 0.8;
    } else if (bbPosition > 0.9) {
      prediction -= 2.5; // Very overbought
      weight += 1;
    } else if (bbPosition > 0.8) {
      prediction -= 1.5; // Overbought
      weight += 0.8;
    }
    
    // Multi-timeframe alignment (enhanced)
    const bullishTimeframes = Object.values(multiTimeframe).filter(tf => tf.trend === 'bullish').length;
    const bearishTimeframes = Object.values(multiTimeframe).filter(tf => tf.trend === 'bearish').length;
    // const neutralTimeframes = Object.values(multiTimeframe).filter(tf => tf.trend === 'neutral').length;
    
    if (bullishTimeframes === 3) {
      prediction += 2; // All timeframes bullish
      weight += 1.5;
    } else if (bearishTimeframes === 3) {
      prediction -= 2; // All timeframes bearish
      weight += 1.5;
    } else if (bullishTimeframes > bearishTimeframes) {
      prediction += (bullishTimeframes - bearishTimeframes) * 0.7;
      weight += 1;
    } else if (bearishTimeframes > bullishTimeframes) {
      prediction -= (bearishTimeframes - bullishTimeframes) * 0.7;
      weight += 1;
    }
    
    // Support/Resistance proximity (enhanced)
    const nearestSupport = supportResistance
      .filter(sr => sr.type === 'support' && sr.price < currentPrice)
      .sort((a, b) => Math.abs(currentPrice - b.price) - Math.abs(currentPrice - a.price))[0];
    
    const nearestResistance = supportResistance
      .filter(sr => sr.type === 'resistance' && sr.price > currentPrice)
      .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))[0];
    
    if (nearestSupport) {
      const supportDistance = (currentPrice - nearestSupport.price) / currentPrice;
      if (supportDistance < 0.03) {
        prediction += 1.5 + (nearestSupport.strength * 0.1); // Strong support nearby
        weight += 1;
      } else if (supportDistance < 0.08) {
        prediction += 0.8; // Support nearby
        weight += 0.5;
      }
    }
    
    if (nearestResistance) {
      const resistanceDistance = (nearestResistance.price - currentPrice) / currentPrice;
      if (resistanceDistance < 0.03) {
        prediction -= 1.5 + (nearestResistance.strength * 0.1); // Strong resistance nearby
        weight += 1;
      } else if (resistanceDistance < 0.08) {
        prediction -= 0.8; // Resistance nearby
        weight += 0.5;
      }
    }
    
    // ADX trend strength (enhanced)
    if (indicators.adx > 40) {
      const trendMultiplier = indicators.rsi > 50 ? 1 : -1;
      prediction += (indicators.adx - 25) / 25 * trendMultiplier * 1.5; // Very strong trend
      weight += 1;
    } else if (indicators.adx > 25) {
      const trendMultiplier = indicators.rsi > 50 ? 1 : -1;
      prediction += (indicators.adx - 25) / 25 * trendMultiplier; // Strong trend
      weight += 0.7;
    }
    
    // Stochastic contribution
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      prediction += 1.2; // Oversold stochastic
      weight += 0.5;
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      prediction -= 1.2; // Overbought stochastic
      weight += 0.5;
    }
    
    // NEW ADVANCED INDICATORS CONTRIBUTION
    
    // Williams %R contribution
    if (indicators.williamsR < -80) {
      prediction += 1.5; // Extremely oversold
      weight += 0.8;
    } else if (indicators.williamsR > -20) {
      prediction -= 1.5; // Extremely overbought
      weight += 0.8;
    }
    
    // CCI contribution
    if (indicators.cci < -100) {
      prediction += 1.8; // Oversold
      weight += 0.7;
    } else if (indicators.cci > 100) {
      prediction -= 1.8; // Overbought
      weight += 0.7;
    }
    
    // Parabolic SAR contribution
    if (currentPrice > indicators.parabolicSAR) {
      prediction += 1.0; // Price above SAR - bullish
      weight += 0.6;
    } else {
      prediction -= 1.0; // Price below SAR - bearish
      weight += 0.6;
    }
    
    // MFI contribution (volume-weighted RSI)
    if (indicators.mfi < 20) {
      prediction += 1.3; // Oversold with volume confirmation
      weight += 0.9;
    } else if (indicators.mfi > 80) {
      prediction -= 1.3; // Overbought with volume confirmation
      weight += 0.9;
    }
    
    // Ichimoku Cloud analysis
    const ichimoku = indicators.ichimoku;
    if (currentPrice > ichimoku.senkouSpanA && currentPrice > ichimoku.senkouSpanB) {
      prediction += 1.2; // Above cloud - bullish
      weight += 0.8;
    } else if (currentPrice < ichimoku.senkouSpanA && currentPrice < ichimoku.senkouSpanB) {
      prediction -= 1.2; // Below cloud - bearish
      weight += 0.8;
    }
    
    // Tenkan-sen/Kijun-sen cross
    if (ichimoku.tenkanSen > ichimoku.kijunSen) {
      prediction += 0.8; // Bullish cross
      weight += 0.5;
    } else {
      prediction -= 0.8; // Bearish cross
      weight += 0.5;
    }
    
    return weight > 0 ? Math.max(-3, Math.min(3, prediction / weight)) : 0;
  }

  // Advanced Pattern Analysis
  private analyzePatterns(ohlcData: number[][], indicators: TechnicalIndicators): PatternAnalysis {
    const candlestickPatterns: string[] = [];
    const chartPatterns: string[] = [];
    const divergences: string[] = [];
    
    if (ohlcData.length < 10) {
      return { candlestickPatterns, chartPatterns, divergences, patternStrength: 0 };
    }
    
    // Candlestick pattern detection
    const recent = ohlcData.slice(-5);
    const current = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    
    if (current && prev) {
      const currentBody = Math.abs(current[4] - current[1]);
      const currentRange = current[2] - current[3];
      // const prevBody = Math.abs(prev[4] - prev[1]); // For future pattern analysis
      
      // Doji pattern
      if (currentBody < currentRange * 0.1) {
        candlestickPatterns.push('Doji - Indecision');
      }
      
      // Hammer pattern
      if (current[4] > current[1] && (current[4] - current[3]) > currentBody * 2) {
        candlestickPatterns.push('Hammer - Bullish Reversal');
      }
      
      // Engulfing patterns
      if (current[4] > current[1] && prev[4] < prev[1] && 
          current[1] < prev[4] && current[4] > prev[1]) {
        candlestickPatterns.push('Bullish Engulfing');
      }
    }
    
    // Chart pattern detection (simplified)
    const prices = ohlcData.slice(-20).map(d => d[4]);
    const highs = ohlcData.slice(-20).map(d => d[2]);
    const lows = ohlcData.slice(-20).map(d => d[3]);
    
    // Support/Resistance breakout
    const recentHigh = Math.max(...highs.slice(-5));
    const recentLow = Math.min(...lows.slice(-5));
    const currentPrice = prices[prices.length - 1];
    
    if (currentPrice > recentHigh * 1.02) {
      chartPatterns.push('Resistance Breakout');
    } else if (currentPrice < recentLow * 0.98) {
      chartPatterns.push('Support Breakdown');
    }
    
    // Divergence detection
    const priceDirection = prices[prices.length - 1] > prices[prices.length - 10] ? 'up' : 'down';
    const rsiDirection = indicators.rsi > 50 ? 'up' : 'down';
    
    if (priceDirection !== rsiDirection) {
      divergences.push('RSI-Price Divergence');
    }
    
    const patternStrength = (candlestickPatterns.length * 30) + 
                           (chartPatterns.length * 40) + 
                           (divergences.length * 30);
    
    return {
      candlestickPatterns,
      chartPatterns,
      divergences,
      patternStrength: Math.min(100, patternStrength)
    };
  }

  // Market Regime Detection
  private detectMarketRegime(ohlcData: number[][], indicators: TechnicalIndicators): MarketRegime {
    if (ohlcData.length < 20) {
      return { type: 'RANGING', strength: 50, direction: 'SIDEWAYS' };
    }
    
    const prices = ohlcData.slice(-20).map(d => d[4]);
    const volatility = indicators.atr / prices[prices.length - 1];
    
    // Trend detection
    const smaShort = prices.slice(-5).reduce((sum, p) => sum + p, 0) / 5;
    const smaLong = prices.slice(-15).reduce((sum, p) => sum + p, 0) / 15;
    const trendStrength = Math.abs(smaShort - smaLong) / smaLong;
    
    let type: 'TRENDING' | 'RANGING' | 'VOLATILE';
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    
    if (volatility > 0.05) {
      type = 'VOLATILE';
      direction = 'SIDEWAYS';
    } else if (trendStrength > 0.02 && indicators.adx > 25) {
      type = 'TRENDING';
      direction = smaShort > smaLong ? 'UP' : 'DOWN';
    } else {
      type = 'RANGING';
      direction = 'SIDEWAYS';
    }
    
    const strength = Math.min(100, (trendStrength * 1000) + (indicators.adx * 2));
    
    return { type, strength, direction };
  }

  // Volume Profile Analysis
  private analyzeVolumeProfile(ohlcData: number[][], indicators: TechnicalIndicators): {
    trend: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    strength: number;
  } {
    if (ohlcData.length < 10) {
      return { trend: 'NEUTRAL', strength: 50 };
    }
    
    // Simplified volume analysis using OBV and price action
    const obvTrend = indicators.obv > 0 ? 'positive' : 'negative';
    const priceTrend = ohlcData[ohlcData.length - 1][4] > ohlcData[ohlcData.length - 10][4] ? 'up' : 'down';
    
    let trend: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    let strength: number;
    
    if (obvTrend === 'positive' && priceTrend === 'up') {
      trend = 'ACCUMULATION';
      strength = 75;
    } else if (obvTrend === 'negative' && priceTrend === 'down') {
      trend = 'DISTRIBUTION';
      strength = 75;
    } else {
      trend = 'NEUTRAL';
      strength = 50;
    }
    
    return { trend, strength };
  }

  // Calculate fundamental score
  private calculateFundamentalScore(coin: Coin): number {
    let score = 50;
    
    // Market cap analysis
    if (coin.market_cap > 10000000000) score += 20; // $10B+
    else if (coin.market_cap > 1000000000) score += 15; // $1B+
    else if (coin.market_cap > 100000000) score += 10; // $100M+
    else if (coin.market_cap < 10000000) score -= 20; // Under $10M
    
    // Volume analysis
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    if (volumeToMarketCap > 0.1) score += 15;
    else if (volumeToMarketCap < 0.01) score -= 10;
    
    // Market cap rank
    if (coin.market_cap_rank <= 10) score += 15;
    else if (coin.market_cap_rank <= 50) score += 10;
    else if (coin.market_cap_rank <= 100) score += 5;
    else if (coin.market_cap_rank > 500) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // Calculate sentiment score
  private calculateSentimentScore(coin: Coin): number {
    let score = 50;
    
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
    
    return Math.max(0, Math.min(100, score));
  }

  // Generate trading signals
  private generateSignals(indicators: TechnicalIndicators, multiTimeframe: MultiTimeframeAnalysis, supportResistance: SupportResistanceLevel[], currentPrice: number): string[] {
    const signals: string[] = [];
    
    // RSI signals
    if (indicators.rsi < 30) signals.push('RSI Oversold - Potential Buy');
    if (indicators.rsi > 70) signals.push('RSI Overbought - Potential Sell');
    
    // MACD signals
    if (indicators.macd.MACD > indicators.macd.signal && indicators.macd.histogram > 0) {
      signals.push('MACD Bullish Crossover');
    }
    if (indicators.macd.MACD < indicators.macd.signal && indicators.macd.histogram < 0) {
      signals.push('MACD Bearish Crossover');
    }
    
    // Moving average signals
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      signals.push('Golden Cross - Strong Uptrend');
    }
    if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      signals.push('Death Cross - Strong Downtrend');
    }
    
    // Multi-timeframe alignment
    const bullishCount = Object.values(multiTimeframe).filter(tf => tf.trend === 'bullish').length;
    const bearishCount = Object.values(multiTimeframe).filter(tf => tf.trend === 'bearish').length;
    
    if (bullishCount === 3) signals.push('All Timeframes Bullish');
    if (bearishCount === 3) signals.push('All Timeframes Bearish');
    
    // Support/Resistance signals
    const nearSupport = supportResistance.find(sr => 
      sr.type === 'support' && Math.abs(currentPrice - sr.price) / currentPrice < 0.02
    );
    const nearResistance = supportResistance.find(sr => 
      sr.type === 'resistance' && Math.abs(currentPrice - sr.price) / currentPrice < 0.02
    );
    
    if (nearSupport) signals.push(`Near Support at $${nearSupport.price.toFixed(2)}`);
    if (nearResistance) signals.push(`Near Resistance at $${nearResistance.price.toFixed(2)}`);
    
    return signals;
  }

  // Get recommendation based on technical analysis
  private getRecommendation(predicted1hChange: number, overallScore: number): 'LONG' | 'SHORT' {
    // Simple binary classification: positive prediction = LONG, negative = SHORT
    // This ensures every coin gets a clear trading signal
    if (predicted1hChange >= 0) {
      return 'LONG';
    } else {
      return 'SHORT';
    }
  }

  // Calculate risk level
  private getRiskLevel(coin: Coin, overallScore: number, atr: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const volatility = (atr / coin.current_price) * 100; // ATR as percentage
    const marketCapRisk = coin.market_cap < 100000000 ? 1 : 0; // Small cap risk
    
    let riskScore = 0;
    if (volatility > 10) riskScore += 2;
    else if (volatility > 5) riskScore += 1;
    
    riskScore += marketCapRisk;
    
    if (overallScore < 40) riskScore += 1;
    
    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  // Calculate price target
  private calculatePriceTarget(coin: Coin, supportResistance: SupportResistanceLevel[], predicted1hChange: number): number {
    const currentPrice = coin.current_price;
    
    // Use nearest resistance/support as target
    if (predicted1hChange > 0) {
      const resistance = supportResistance
        .filter(sr => sr.type === 'resistance' && sr.price > currentPrice)
        .sort((a, b) => a.price - b.price)[0];
      
      if (resistance) {
        return Math.min(resistance.price, currentPrice * (1 + predicted1hChange / 100));
      }
    } else {
      const support = supportResistance
        .filter(sr => sr.type === 'support' && sr.price < currentPrice)
        .sort((a, b) => b.price - a.price)[0];
      
      if (support) {
        return Math.max(support.price, currentPrice * (1 + predicted1hChange / 100));
      }
    }
    
    // Fallback to percentage-based target
    return currentPrice * (1 + predicted1hChange / 100);
  }

  // Main analysis method
  public async analyzeCoin(coin: Coin): Promise<CryptoAnalysis> {
    try {
      console.log(`Analyzing ${coin.name} (${coin.symbol}) with technical analysis...`);
      
      // Get OHLC data for main analysis
      const ohlcData = await this.getOHLCData(coin.id, 30);
      
      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(ohlcData);
      
      // Analyze multiple timeframes
      const multiTimeframe = await this.analyzeMultiTimeframe(coin);
      
      // Calculate support and resistance levels
      const supportResistance = this.calculateSupportResistance(ohlcData);
      
      // Calculate scores
      const technicalScore = this.calculateTechnicalScore(indicators, coin.current_price);
      const fundamentalScore = this.calculateFundamentalScore(coin);
      const sentimentScore = this.calculateSentimentScore(coin);
      
      // Weighted overall score (technical analysis gets highest weight)
      const overallScore = (
        technicalScore * 0.6 +
        fundamentalScore * 0.25 +
        sentimentScore * 0.15
      );
      
      // Calculate prediction based on technical analysis
      const predicted1hChange = this.calculatePredicted1hChange(
        indicators, 
        multiTimeframe, 
        supportResistance, 
        coin.current_price
      );
      
      // Generate signals
      const signals = this.generateSignals(indicators, multiTimeframe, supportResistance, coin.current_price);
      
      // Get recommendation and risk assessment
      const recommendation = this.getRecommendation(predicted1hChange, overallScore);
      const riskLevel = this.getRiskLevel(coin, overallScore, indicators.atr);
      const priceTarget = this.calculatePriceTarget(coin, supportResistance, predicted1hChange);
      
      // Advanced analysis features
      const patternAnalysis = this.analyzePatterns(ohlcData, indicators);
      const volumeProfile = this.analyzeVolumeProfile(ohlcData, indicators);
      
      // Calculate confidence based on signal strength and data quality
      const signalStrength = signals.length;
      const dataQuality = ohlcData.length >= 30 ? 1 : 0.5;
      const confidence = Math.min(95, Math.max(60, overallScore * dataQuality + signalStrength * 2));
      
      console.log(`Technical analysis complete for ${coin.symbol}: Score ${overallScore.toFixed(1)}, Prediction ${predicted1hChange.toFixed(2)}%`);

      return {
        coin,
        indicators,
        multiTimeframe,
        supportResistance,
        predicted1hChange,
        technicalScore,
        fundamentalScore,
        sentimentScore,
        overallScore,
        confidence,
        signals,
        recommendation,
        riskLevel,
        priceTarget,
        patternAnalysis,
        marketTrend: volumeProfile
      };
      
    } catch (error: any) {
      console.error(`Error analyzing ${coin.name}:`, error);
      throw error;
    }
  }

  // Get top recommendations
  public async getTop10Recommendations(): Promise<CryptoAnalysis[]> {
    try {
      console.log('Starting technical analysis for top cryptocurrencies...');
      
      // Get top cryptocurrencies
      const topCoins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 100, 1);
      console.log(`Fetched ${topCoins.length} cryptocurrencies for analysis`);
      
      if (topCoins.length === 0) {
        console.error('No cryptocurrencies fetched!');
        return [];
      }
      
      // Filter valid coins
      const validCoins = topCoins.filter((coin: Coin) => {
        return coin.current_price > 0 && 
               coin.total_volume > 0 && 
               coin.market_cap > 10000000; // $10M minimum
      });
      
      console.log(`Analyzing ${validCoins.length} valid cryptocurrencies...`);

      // Analyze coins in batches
      const analyses: CryptoAnalysis[] = [];
      const batchSize = 8; // Increased batch size for better performance
      
      for (let i = 0; i < Math.min(validCoins.length, 50); i += batchSize) {
        const batch = validCoins.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1} (coins ${i+1}-${Math.min(i+batchSize, validCoins.length)})`);
        
        for (const coin of batch) {
          try {
            const analysis = await this.analyzeCoin(coin);
              analyses.push(analysis);
            console.log(`✅ ${coin.symbol}: ${analysis.predicted1hChange.toFixed(2)}% prediction, ${analysis.recommendation}`);
          } catch (error: any) {
            console.warn(`❌ Failed to analyze ${coin.symbol}:`, error.message);
          }
        }
        
        // Add delay between batches
        if (i + batchSize < Math.min(validCoins.length, 50)) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Break if we have enough analyses
        if (analyses.length >= 25) break;
      }
      
      // Sort by technical strength and prediction magnitude
      const sortedAnalyses = analyses.sort((a, b) => {
        // PRIMARY: Absolute prediction magnitude (higher absolute value is better)
        // This means -1% ranks higher than +0.9% because |-1| > |0.9|
        const aPredictionMagnitude = Math.abs(a.predicted1hChange);
        const bPredictionMagnitude = Math.abs(b.predicted1hChange);
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
        
        // TERTIARY: Overall score
        return b.overallScore - a.overallScore;
      });
      
      console.log(`Generated ${sortedAnalyses.length} technical analyses`);
      console.log(`📊 RANKING BY: 1) Absolute 1h prediction magnitude, 2) Technical score, 3) Overall score`);
      console.log('Top 5 recommendations:', sortedAnalyses.slice(0, 5).map(a => {
        const predictionMagnitude = Math.abs(a.predicted1hChange);
        const predictionSign = a.predicted1hChange >= 0 ? '+' : '';
        return `${a.coin.symbol}: ${predictionSign}${a.predicted1hChange.toFixed(2)}% (|${predictionMagnitude.toFixed(2)}%|, Tech: ${a.technicalScore.toFixed(1)}, ${a.recommendation})`;
      }));
      
      return sortedAnalyses.slice(0, 10);
      
    } catch (error) {
      console.error('Error generating technical recommendations:', error);
        return [];
    }
  }
}

export const cryptoAnalyzer = new CryptoAnalyzer(); 