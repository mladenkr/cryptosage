// MEXC API Service for Real-time Price Data
// Based on MEXC API documentation: https://mexcdevelop.github.io/apidocs/spot_v3_en/

import { Coin } from '../types';
import { cacheService } from './cacheService';

// MEXC API Configuration
const MEXC_BASE_URL = 'https://api.mexc.com/api/v3';
const MEXC_CACHE_DURATION = 30 * 1000; // 30 seconds cache for real-time data

// MEXC API Response Types
interface MEXCTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  prevClosePrice: string;
  lastPrice: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  count: number | null;
}

interface MEXCPriceTicker {
  symbol: string;
  price: string;
}

interface MEXCExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    baseAssetPrecision: number;
    quoteAsset: string;
    quotePrecision: number;
  }>;
}

class MEXCApiService {
  private symbolMapping: Map<string, string> = new Map(); // CoinGecko ID -> MEXC Symbol
  private mexcSymbols: Set<string> = new Set(); // Available MEXC symbols
  private lastSymbolUpdate = 0;
  private readonly SYMBOL_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

  // Create API request with error handling
  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${MEXC_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoSage/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`MEXC API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`MEXC API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Initialize symbol mappings from MEXC exchange info
  private async initializeSymbolMappings(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSymbolUpdate < this.SYMBOL_UPDATE_INTERVAL && this.mexcSymbols.size > 0) {
      return; // Skip if recently updated
    }

    try {
      console.log('Initializing MEXC symbol mappings...');
      const exchangeInfo = await this.makeRequest<MEXCExchangeInfo>('/exchangeInfo');
      
      // Clear existing mappings
      this.mexcSymbols.clear();
      this.symbolMapping.clear();

      // Process USDT pairs only (to match our current setup)
      const usdtSymbols = exchangeInfo.symbols.filter(s => 
        s.quoteAsset === 'USDT' && s.status === '1'
      );

      console.log(`Found ${usdtSymbols.length} active USDT pairs on MEXC`);

      // Build symbol mappings
      usdtSymbols.forEach(symbol => {
        this.mexcSymbols.add(symbol.symbol);
        
        // Map common symbols to CoinGecko IDs
        const baseAsset = symbol.baseAsset.toLowerCase();
        const mexcSymbol = symbol.symbol;
        
        // Common symbol mappings
        const commonMappings: { [key: string]: string } = {
          'btc': 'bitcoin',
          'eth': 'ethereum',
          'bnb': 'binancecoin',
          'ada': 'cardano',
          'sol': 'solana',
          'xrp': 'ripple',
          'dot': 'polkadot',
          'doge': 'dogecoin',
          'avax': 'avalanche-2',
          'matic': 'matic-network',
          'link': 'chainlink',
          'ltc': 'litecoin',
          'bch': 'bitcoin-cash',
          'xlm': 'stellar',
          'vet': 'vechain',
          'fil': 'filecoin',
          'trx': 'tron',
          'etc': 'ethereum-classic',
          'atom': 'cosmos',
          'near': 'near',
          'algo': 'algorand',
          'mana': 'decentraland',
          'sand': 'the-sandbox',
          'gala': 'gala',
          'axs': 'axie-infinity',
          'chz': 'chiliz',
          'ens': 'ethereum-name-service',
          'lrc': 'loopring',
          'cro': 'crypto-com-chain',
          'ftm': 'fantom'
        };

        // Add to mapping if we have a known CoinGecko ID
        if (commonMappings[baseAsset]) {
          this.symbolMapping.set(commonMappings[baseAsset], mexcSymbol);
        } else {
          // For other symbols, try direct mapping
          this.symbolMapping.set(baseAsset, mexcSymbol);
        }
      });

      this.lastSymbolUpdate = now;
      console.log(`MEXC symbol mappings initialized: ${this.symbolMapping.size} mappings created`);
    } catch (error) {
      console.error('Failed to initialize MEXC symbol mappings:', error);
    }
  }

  // Get real-time prices for all symbols
  async getAllPrices(): Promise<MEXCPriceTicker[]> {
    const cacheKey = 'mexc_all_prices';
    
    // Check cache first (30 second cache for real-time data)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEXC_CACHE_DURATION) {
      return cached;
    }

    try {
      const prices = await this.makeRequest<MEXCPriceTicker[]>('/ticker/price');
      
      // Filter for USDT pairs only
      const usdtPrices = prices.filter(p => p.symbol.endsWith('USDT'));
      
      // Cache the result using market data cache
      cacheService.cacheMarketData(cacheKey, usdtPrices);
      
      console.log(`Fetched ${usdtPrices.length} MEXC USDT prices`);
      return usdtPrices;
    } catch (error) {
      console.error('Failed to fetch MEXC prices:', error);
      return [];
    }
  }

  // Get 24hr ticker statistics for all symbols
  async getAll24hrTickers(): Promise<MEXCTicker24hr[]> {
    const cacheKey = 'mexc_24hr_tickers';
    
    // Check cache first
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEXC_CACHE_DURATION) {
      return cached;
    }

    try {
      const tickers = await this.makeRequest<MEXCTicker24hr[]>('/ticker/24hr');
      
      // Filter for USDT pairs only
      const usdtTickers = tickers.filter(t => t.symbol.endsWith('USDT'));
      
      // Cache the result using market data cache
      cacheService.cacheMarketData(cacheKey, usdtTickers);
      
      console.log(`Fetched ${usdtTickers.length} MEXC 24hr tickers`);
      return usdtTickers;
    } catch (error) {
      console.error('Failed to fetch MEXC 24hr tickers:', error);
      return [];
    }
  }

  // Get specific symbol price
  async getSymbolPrice(symbol: string): Promise<number | null> {
    try {
      const ticker = await this.makeRequest<MEXCPriceTicker>(`/ticker/price?symbol=${symbol}`);
      return parseFloat(ticker.price);
    } catch (error) {
      console.error(`Failed to fetch MEXC price for ${symbol}:`, error);
      return null;
    }
  }

  // Convert MEXC ticker data to CoinGecko format
  private convertMEXCToCoinGecko(mexcTicker: MEXCTicker24hr, coinGeckoId: string): Partial<Coin> {
    const currentPrice = parseFloat(mexcTicker.lastPrice);
    const priceChange24h = parseFloat(mexcTicker.priceChange);
    const priceChangePercent24h = parseFloat(mexcTicker.priceChangePercent);
    
    return {
      id: coinGeckoId,
      current_price: currentPrice,
      high_24h: parseFloat(mexcTicker.highPrice),
      low_24h: parseFloat(mexcTicker.lowPrice),
      price_change_24h: priceChange24h,
      price_change_percentage_24h: priceChangePercent24h,
      total_volume: parseFloat(mexcTicker.quoteVolume),
      last_updated: new Date(mexcTicker.closeTime).toISOString(),
      // Add MEXC-specific metadata
      mexc_data: {
        symbol: mexcTicker.symbol,
        bidPrice: parseFloat(mexcTicker.bidPrice),
        askPrice: parseFloat(mexcTicker.askPrice),
        volume: parseFloat(mexcTicker.volume),
        openPrice: parseFloat(mexcTicker.openPrice),
        source: 'MEXC',
        timestamp: mexcTicker.closeTime
      }
    };
  }

  // Update coin data with MEXC real-time prices
  async updateCoinsWithMEXCPrices(coins: Coin[]): Promise<Coin[]> {
    try {
      // Initialize symbol mappings if needed
      await this.initializeSymbolMappings();
      
      // Get all MEXC 24hr tickers
      const mexcTickers = await this.getAll24hrTickers();
      
      if (mexcTickers.length === 0) {
        console.warn('No MEXC tickers available, returning original coins');
        return coins;
      }

      // Create a map of MEXC symbol -> ticker data
      const mexcTickerMap = new Map<string, MEXCTicker24hr>();
      mexcTickers.forEach(ticker => {
        mexcTickerMap.set(ticker.symbol, ticker);
      });

      let updatedCount = 0;
      
      // Update coins with MEXC data where available
      const updatedCoins = coins.map(coin => {
        const mexcSymbol = this.symbolMapping.get(coin.id);
        
        if (mexcSymbol && mexcTickerMap.has(mexcSymbol)) {
          const mexcTicker = mexcTickerMap.get(mexcSymbol)!;
          const mexcData = this.convertMEXCToCoinGecko(mexcTicker, coin.id);
          
          updatedCount++;
          
          return {
            ...coin,
            ...mexcData,
            // Keep original data as fallback and add MEXC flag
            original_price: coin.current_price,
            price_source: 'MEXC' as const,
            price_updated_at: new Date().toISOString()
          };
        }
        
        return coin;
      });

      console.log(`Updated ${updatedCount}/${coins.length} coins with MEXC real-time prices`);
      return updatedCoins;
    } catch (error) {
      console.error('Failed to update coins with MEXC prices:', error);
      return coins; // Return original coins on error
    }
  }

  // Get MEXC server time
  async getServerTime(): Promise<number> {
    try {
      const response = await this.makeRequest<{ serverTime: number }>('/time');
      return response.serverTime;
    } catch (error) {
      console.error('Failed to get MEXC server time:', error);
      return Date.now();
    }
  }

  // Check if a coin is available on MEXC
  async isCoinAvailableOnMEXC(coinId: string): Promise<boolean> {
    await this.initializeSymbolMappings();
    return this.symbolMapping.has(coinId);
  }

  // Get all available MEXC symbols
  async getAvailableSymbols(): Promise<string[]> {
    await this.initializeSymbolMappings();
    return Array.from(this.mexcSymbols);
  }
}

// Export singleton instance
export const mexcApiService = new MEXCApiService();

// Export types for use in other files
export type { MEXCTicker24hr, MEXCPriceTicker, MEXCExchangeInfo }; 