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

  // Get all MEXC USDT trading pairs as primary coin list
  async getAllMEXCCoins(): Promise<Coin[]> {
    const cacheKey = 'mexc_all_coins_primary';
    
    // Check cache first (5 minute cache for coin list)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log(`Returning ${cached.length} cached MEXC coins`);
      return cached;
    }

    try {
      console.log('Fetching all MEXC USDT trading pairs as primary coin list...');
      
      // Initialize symbol mappings first
      await this.initializeSymbolMappings();
      
      // Get all 24hr tickers for USDT pairs
      const tickers = await this.getAll24hrTickers();
      
      // Convert MEXC tickers to Coin format
      const mexcCoins: Coin[] = tickers.map((ticker, index) => {
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

      // Sort by volume (highest first) for better ranking
      mexcCoins.sort((a, b) => b.total_volume - a.total_volume);
      
      // Update market cap ranks based on volume
      mexcCoins.forEach((coin, index) => {
        coin.market_cap_rank = index + 1;
      });

      // Cache the result
      cacheService.cacheMarketData(cacheKey, mexcCoins);
      
      console.log(`Successfully fetched ${mexcCoins.length} MEXC USDT trading pairs`);
      return mexcCoins;
      
    } catch (error) {
      console.error('Failed to fetch all MEXC coins:', error);
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