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
      // Add timestamp and version to prevent browser caching
      const separator = endpoint.includes('?') ? '&' : '?';
      const cacheBuster = `${separator}_t=${Date.now()}&_v=${Math.random()}&_cb=${Date.now()}`;
      const url = `${MEXC_BASE_URL}${endpoint}${cacheBuster}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoSage/1.0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
    const cacheKey = 'mexc_24hr_tickers_v2';
    
    // Use 30 second cache for real-time data
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < MEXC_CACHE_DURATION) {
      console.log(`📦 Using cached 24hr tickers: ${cached.length} tickers (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
      return cached;
    }

    try {
      console.log('📡 Making MEXC API request to /ticker/24hr...');
      const tickers = await this.makeRequest<MEXCTicker24hr[]>('/ticker/24hr');
      console.log(`📊 Raw API response: ${tickers.length} total tickers`);
      
      // Filter out stablecoins first before processing
      const filteredTickers = tickers.filter(ticker => {
        const baseSymbol = ticker.symbol.replace('USDT', '').toLowerCase();
        
        // EXPLICIT filtering for the specific tokens mentioned by user
        const explicitBadTokens = [
          'bsc-usd', 'bscusd', 'weth', 'wsteth', 'bnsol', 'meth', 'steth', 'reth', 
          'rseth', 'weeth', 'jitosol', 'lbtc', 'wbtc', 'cbbtc', 'usde', 'susds', 
          'susde', 'usds', 'usdtb'
        ];
        
        if (explicitBadTokens.includes(baseSymbol)) {
          console.log(`🚫 EXPLICITLY FILTERED: ${baseSymbol.toUpperCase()} - User reported token`);
          return false;
        }
        
        // SIMPLIFIED stablecoin list - only the most obvious ones
        const stablecoins = [
          // Only the most obvious stablecoins
          'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 
          'fdusd', 'pyusd', 'usdm', 'gho', 'crvusd', 'mkusd', 'usds', 'usdtb'
        ];
        
        // Check if it's a stablecoin
        if (stablecoins.includes(baseSymbol)) {
          console.log(`🚫 Filtered out stablecoin: ${baseSymbol.toUpperCase()}`);
          return false;
        }
        
        // SIMPLIFIED wrapped/staked token filtering - only the most obvious ones
        const wrappedTokens = ['weth', 'wbtc', 'wbnb', 'weeth', 'cbbtc', 'lbtc'];
        const stakedTokens = ['steth', 'reth', 'cbeth', 'jitosol', 'meth', 'bnsol', 'rseth', 'wsteth'];
        
        if (wrappedTokens.includes(baseSymbol) || stakedTokens.includes(baseSymbol)) {
          console.log(`🚫 Filtered out wrapped/staked token: ${baseSymbol.toUpperCase()}`);
          return false;
        }
        
        // Filter BSC-related tokens
        if (baseSymbol.includes('bsc') || baseSymbol.includes('-usd')) {
          console.log(`🚫 Filtered out BSC/bridge token: ${baseSymbol.toUpperCase()}`);
          return false;
        }
        
        // REMOVED: Overly aggressive pattern matching that was filtering too many coins
        
        return true;
      });
      
      console.log(`🔍 Filtered out ${tickers.length - filteredTickers.length} stablecoins from ${tickers.length} total tickers`);
      console.log(`📊 Processing ${filteredTickers.length} valid trading pairs`);
      
      if (filteredTickers.length === 0) {
        console.error('❌ No valid trading pairs after filtering - all were stablecoins/wrapped tokens');
        throw new Error('No valid trading pairs found after filtering stablecoins and wrapped tokens');
      }
      
      // Cache the result using market data cache
      cacheService.cacheMarketData(cacheKey, filteredTickers);
      
      console.log(`✅ Successfully fetched ${filteredTickers.length} MEXC 24hr tickers`);
      return filteredTickers;
    } catch (error) {
      console.error('❌ CRITICAL: Failed to fetch MEXC 24hr tickers:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
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

  // Get all MEXC USDT trading pairs as primary coin list
  async getAllMEXCCoins(): Promise<Coin[]> {
    const cacheKey = 'mexc_all_coins_primary_v4';
    
    // Use shorter cache duration for more real-time data (2 minutes)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
      console.log(`📦 Using cached MEXC coins: ${cached.length} coins (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
      return cached;
    }

    try {
      console.log('🚀 MEXC API: Starting getAllMEXCCoins...');
      console.log('Fetching all MEXC USDT trading pairs as primary coin list...');
      
      // Initialize symbol mappings first
      console.log('📋 Initializing MEXC symbol mappings...');
      await this.initializeSymbolMappings();
      console.log('✅ Symbol mappings initialized');
      
      // Get all 24hr tickers for USDT pairs
      console.log('📊 Fetching 24hr tickers from MEXC...');
      const tickers = await this.getAll24hrTickers();
      console.log(`📈 Received ${tickers.length} tickers from MEXC API`);
      
      if (tickers.length === 0) {
        console.error('❌ MEXC API returned no tickers - this is the root cause');
        throw new Error('MEXC API returned no trading data. Please check API connectivity.');
      }
      
      // Filter for USDT pairs and remove stablecoins/wrapped tokens
      const filteredTickers = tickers.filter(ticker => {
        // Only USDT pairs
        if (!ticker.symbol.endsWith('USDT')) {
          return false;
        }
        
        const baseSymbol = ticker.symbol.replace('USDT', '').toLowerCase();
        
        // EXPLICIT filtering for the specific tokens mentioned by user
        const explicitBadTokens = [
          'bsc-usd', 'bscusd', 'weth', 'wsteth', 'bnsol', 'meth', 'steth', 'reth', 
          'rseth', 'weeth', 'jitosol', 'lbtc', 'wbtc', 'cbbtc', 'usde', 'susds', 
          'susde', 'usds', 'usdtb'
        ];
        
        if (explicitBadTokens.includes(baseSymbol)) {
          return false;
        }
        
        // SIMPLIFIED stablecoin list - only the most obvious ones
        const stablecoins = [
          'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 
          'fdusd', 'pyusd', 'usdm', 'gho', 'crvusd', 'mkusd', 'usds', 'usdtb'
        ];
        
        // Check if it's a stablecoin
        if (stablecoins.includes(baseSymbol)) {
          return false;
        }
        
        // SIMPLIFIED wrapped/staked token filtering - only the most obvious ones
        const wrappedTokens = ['weth', 'wbtc', 'wbnb', 'weeth', 'cbbtc', 'lbtc'];
        const stakedTokens = ['steth', 'reth', 'cbeth', 'jitosol', 'meth', 'bnsol', 'rseth', 'wsteth'];
        
        if (wrappedTokens.includes(baseSymbol) || stakedTokens.includes(baseSymbol)) {
          return false;
        }
        
        // Filter BSC-related tokens
        if (baseSymbol.includes('bsc') || baseSymbol.includes('-usd')) {
          return false;
        }
        
        return true;
      });
      
      console.log(`🔍 Filtered out ${tickers.length - filteredTickers.length} stablecoins from ${tickers.length} total tickers`);
      console.log(`📊 Processing ${filteredTickers.length} valid trading pairs`);
      
      if (filteredTickers.length === 0) {
        console.error('❌ No valid trading pairs after filtering - all were stablecoins/wrapped tokens');
        throw new Error('No valid trading pairs found after filtering stablecoins and wrapped tokens');
      }
      
      // Convert MEXC tickers to Coin format
      const mexcCoins: Coin[] = filteredTickers.map((ticker, index) => {
        const baseSymbol = ticker.symbol.replace('USDT', '').toLowerCase();
        const coinId = this.getCoinGeckoIdFromSymbol(baseSymbol);
        
        const currentPrice = parseFloat(ticker.lastPrice) || 0;
        const priceChange24h = parseFloat(ticker.priceChange) || 0;
        const priceChangePercent24h = parseFloat(ticker.priceChangePercent) || 0;
        const volume24h = parseFloat(ticker.quoteVolume) || 0;
        const high24h = parseFloat(ticker.highPrice) || 0;
        const low24h = parseFloat(ticker.lowPrice) || 0;
        
        return {
          id: coinId,
          symbol: baseSymbol,
          name: baseSymbol.toUpperCase(),
          image: `https://assets.coingecko.com/coins/images/1/large/${baseSymbol}.png`,
          current_price: currentPrice,
          market_cap: 0, // Will be filled from CoinGecko
          market_cap_rank: index + 1, // Temporary ranking by volume
          fully_diluted_valuation: 0,
          total_volume: volume24h,
          high_24h: high24h,
          low_24h: low24h,
          price_change_24h: priceChange24h,
          price_change_percentage_24h: priceChangePercent24h,
          market_cap_change_24h: 0,
          market_cap_change_percentage_24h: priceChangePercent24h,
          circulating_supply: 0,
          total_supply: 0,
          max_supply: null,
          ath: high24h || currentPrice,
          ath_change_percentage: 0,
          ath_date: new Date().toISOString(),
          atl: low24h || currentPrice,
          atl_change_percentage: 0,
          atl_date: new Date().toISOString(),
          roi: null,
          last_updated: new Date().toISOString(),
          sparkline_in_7d: { price: [] },
          sparkline_in_24h: { price: [] },
          
          // MEXC-specific metadata
          original_price: currentPrice,
          price_source: 'MEXC' as const,
          price_updated_at: new Date().toISOString(),
                     mexc_data: {
             symbol: ticker.symbol,
             bidPrice: parseFloat(ticker.bidPrice) || 0,
             askPrice: parseFloat(ticker.askPrice) || 0,
             volume: parseFloat(ticker.volume) || 0,
             openPrice: parseFloat(ticker.openPrice) || 0,
             source: 'MEXC',
             timestamp: ticker.closeTime || Date.now()
           }
        };
      });

      console.log(`💰 Created ${mexcCoins.length} coin objects from MEXC data`);

      // Enhanced sorting: Primary by volume, secondary by quote volume for better ranking
      mexcCoins.sort((a, b) => {
        // Primary sort: Total volume (USDT volume)
        const volumeDiff = b.total_volume - a.total_volume;
        if (Math.abs(volumeDiff) > 1000) { // Significant volume difference
          return volumeDiff;
        }
        
        // Secondary sort: MEXC quote volume if available
        const aMexcVolume = a.mexc_data?.volume || 0;
        const bMexcVolume = b.mexc_data?.volume || 0;
        return bMexcVolume - aMexcVolume;
      });
      
      // Apply additional filters: volume and price stability
      const filteredCoins = mexcCoins.filter(coin => {
        // Volume filter - reduced from $10k to $1k for more coins
        if (coin.total_volume <= 1000) {
          return false;
        }
        
        // Price stability filter to catch remaining stablecoins
        const priceChangeAbs = Math.abs(coin.price_change_percentage_24h);
        const currentPrice = coin.current_price;
        
        // If price is near $1 and has very low volatility, likely a stablecoin
        if (currentPrice > 0.95 && currentPrice < 1.05 && priceChangeAbs < 2) {
          console.log(`🚫 Filtered out potential stablecoin by price stability: ${coin.symbol.toUpperCase()} (Price: $${currentPrice}, Change: ${coin.price_change_percentage_24h}%)`);
          return false;
        }
        
        // If price is near other fiat values and has very low volatility
        if (((currentPrice > 0.85 && currentPrice < 1.15) || 
             (currentPrice > 6.5 && currentPrice < 7.5) ||  // CNY pegged
             (currentPrice > 0.75 && currentPrice < 0.95)) && // EUR pegged
            priceChangeAbs < 1.5) {
          console.log(`🚫 Filtered out potential fiat-pegged stablecoin: ${coin.symbol.toUpperCase()} (Price: $${currentPrice}, Change: ${coin.price_change_percentage_24h}%)`);
          return false;
        }
        
        return true;
      });
      
      // DEBUG: Log the first 20 coins being returned from MEXC API
      console.log('🔍 DEBUG: First 20 coins being returned from MEXC API:');
      filteredCoins.slice(0, 20).forEach((coin, index) => {
        console.log(`  ${index + 1}. ${coin.symbol.toUpperCase()} (${coin.id}) - $${coin.current_price}, Vol: $${coin.total_volume.toLocaleString()}`);
      });
      
      console.log(`🎯 Final MEXC API Results: ${filteredCoins.length} coins (filtered from ${mexcCoins.length} after volume/stability checks)`);
      
      if (filteredCoins.length === 0) {
        console.error('❌ No coins passed final filtering - all were filtered out by volume/stability checks');
        throw new Error('No valid coins found after applying volume and stability filters');
      }
      
      // Cache the results for 2 minutes
      cacheService.cacheMarketData(cacheKey, filteredCoins);
      
      console.log(`✅ MEXC API SUCCESS: Returning ${filteredCoins.length} valid coins`);
      return filteredCoins;
      
    } catch (error) {
      console.error('❌ MEXC API CRITICAL ERROR in getAllMEXCCoins:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Return empty array instead of throwing to prevent app crash
      console.log('🔄 Returning empty array to prevent app crash');
      return [];
    }
  }

  // Enhanced symbol mapping with more comprehensive coverage
  private getCoinGeckoIdFromSymbol(symbol: string): string {
    const symbolLower = symbol.toLowerCase();
    
    // Comprehensive symbol to CoinGecko ID mapping
    const symbolMappings: { [key: string]: string } = {
      // Major cryptocurrencies
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
      'ftm': 'fantom',
      'one': 'harmony',
      'hbar': 'hedera-hashgraph',
      'icp': 'internet-computer',
      'theta': 'theta-token',
      'egld': 'elrond-erd-2',
      'xtz': 'tezos',
      'eos': 'eos',
      'neo': 'neo',
      'waves': 'waves',
      'zil': 'zilliqa',
      'icx': 'icon',
      'ont': 'ontology',
      'qtum': 'qtum',
      'zec': 'zcash',
      'dash': 'dash',
      'dcr': 'decred',
      'xmr': 'monero',
      'bsv': 'bitcoin-sv',
      'btg': 'bitcoin-gold',
      'dgb': 'digibyte',
      'rvn': 'ravencoin',
      'sc': 'siacoin',
      'zen': 'horizen',
      'kmd': 'komodo',
      'ark': 'ark',
      'lsk': 'lisk',
      'strat': 'stratis',
      'nano': 'nano',
      'xem': 'nem',
      'bat': 'basic-attention-token',
      'zrx': '0x',
      'omg': 'omisego',
      'knc': 'kyber-network-crystal',
      'mkr': 'maker',
      'dai': 'dai',
      'comp': 'compound-governance-token',
      'aave': 'aave',
      'uni': 'uniswap',
      'sushi': 'sushi',
      'cake': 'pancakeswap-token',
      '1inch': '1inch',
      'crv': 'curve-dao-token',
      'yfi': 'yearn-finance',
      'snx': 'havven',
      'uma': 'uma',
      'bal': 'balancer',
      'ren': 'republic-protocol',
      'kcs': 'kucoin-shares',
      'ht': 'huobi-token',
      'okb': 'okb',
      'leo': 'leo-token',
      'usdc': 'usd-coin',
      'usdt': 'tether',
      'busd': 'binance-usd',
      'tusd': 'true-usd',
      'pax': 'paxos-standard',
      'gusd': 'gemini-dollar',
      'husd': 'husd',
      'ust': 'terrausd',
      'frax': 'frax',
      'fei': 'fei-usd',
      'lusd': 'liquity-usd',
      'mim': 'magic-internet-money',
      'spell': 'spell-token',
      'ice': 'ice-token',
      'time': 'wonderland',
      'memo': 'wonderland',
      'ohm': 'olympus',
      'klima': 'klima-dao',
      'bct': 'toucan-protocol-base-carbon-tonne',
      'mco2': 'moss-carbon-credit',
      'nct': 'toucan-protocol-nature-carbon-tonne',
      'ape': 'apecoin',
      'looks': 'looksrare',
      'x2y2': 'x2y2',
      'blur': 'blur',
      'magic': 'magic',
      'gmx': 'gmx',
      'joe': 'joe',
      'png': 'pangolin',
      'qi': 'benqi',
      'xava': 'avalaunch',
      'pefi': 'penguin-finance',
      'snob': 'snowball-token',
      'teddy': 'teddy-cash',
      'melt': 'defrost-finance-token',
      'cycle': 'cycle-token',
      'sherpa': 'sherpa-cash',
      'elk': 'elk-finance',
      'yak': 'yield-yak',
      'olive': 'olive-cash',
      'spore': 'spore-finance',
      'husky': 'husky-avax',
      'walbt': 'wrapped-algorand',
      'weth': 'weth',
      'wbtc': 'wrapped-bitcoin',
      'wbnb': 'wbnb',
      'wmatic': 'wmatic',
      'wavax': 'wrapped-avax',
      'wsol': 'wrapped-solana',
      'wftm': 'wrapped-fantom',
      'wone': 'wrapped-one',
      'wcro': 'wrapped-cro',
      'whbar': 'wrapped-hbar',
      'wicp': 'wrapped-icp',
      'wtheta': 'wrapped-theta',
      'wegld': 'wrapped-egld',
      'wxtz': 'wrapped-tezos',
      'weos': 'wrapped-eos',
      'wneo': 'wrapped-neo',
      'wwaves': 'wrapped-waves',
      'wzil': 'wrapped-zilliqa',
      'wicx': 'wrapped-icon',
      'wont': 'wrapped-ontology',
      'wqtum': 'wrapped-qtum',
      'wzec': 'wrapped-zcash',
      'wdash': 'wrapped-dash',
      'wdcr': 'wrapped-decred',
      'wxmr': 'wrapped-monero'
    };

    // Return mapped ID or use symbol as fallback
    return symbolMappings[symbolLower] || symbolLower;
  }

  // Get total count of MEXC USDT trading pairs
  async getMEXCUSDTCount(): Promise<number> {
    const cacheKey = 'mexc_usdt_count';
    
    // Check cache first (5 minute cache)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached;
    }

    try {
      console.log('Fetching MEXC USDT trading pairs count...');
      
      // Get exchange info to count USDT pairs
      const exchangeInfo = await this.makeRequest<MEXCExchangeInfo>('/exchangeInfo');
      
      // Count active USDT pairs
      const usdtCount = exchangeInfo.symbols.filter(s => 
        s.quoteAsset === 'USDT' && s.status === '1'
      ).length;
      
      // Cache the result
      cacheService.cacheMarketData(cacheKey, usdtCount);
      
      console.log(`Found ${usdtCount} active MEXC USDT trading pairs`);
      return usdtCount;
      
    } catch (error) {
      console.error('Failed to fetch MEXC USDT count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const mexcApiService = new MEXCApiService();

// Export types for use in other files
export type { MEXCTicker24hr, MEXCPriceTicker, MEXCExchangeInfo }; 