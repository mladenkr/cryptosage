import axios from 'axios';
import { Coin, CoinDetail, GlobalData, TrendingCoin } from '../types';
import { cacheService } from './cacheService';
import { mexcApiService } from './mexcApi';

// Primary and alternative API endpoints
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINPAPRIKA_BASE_URL = 'https://api.coinpaprika.com/v1';
const CRYPTOCOMPARE_BASE_URL = 'https://min-api.cryptocompare.com/data';
const BITSTAMP_BASE_URL = 'https://www.bitstamp.net/api/v2';
const ALTERNATIVE_PROXY = 'https://api.allorigins.win/raw?url=';

// Create API instances
const createApiInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error);
      throw error;
    }
  );

  return instance;
};

const coingeckoApi = createApiInstance(COINGECKO_BASE_URL);
const coinpaprikaApi = createApiInstance(COINPAPRIKA_BASE_URL);
const cryptocompareApi = createApiInstance(CRYPTOCOMPARE_BASE_URL);
const bitstampApi = createApiInstance(BITSTAMP_BASE_URL);

// BitStamp trading pairs mapping to common symbols
const BITSTAMP_PAIRS = [
  'btcusd', 'ethusd', 'ltcusd', 'xrpusd', 'adausd', 'xlmusd', 'linkusd', 'omgusd',
  'batusd', 'umausd', 'daiusd', 'kncusd', 'mkrusd', 'zrxusd', 'gusdusd', 'algousd',
  'audiousd', 'crvusd', 'snxusd', 'uniusd', 'yfiusd', 'compusd', 'grtusd', 'aaveusd',
  'sushiusd', 'chzusd', 'enjusd', 'hbarusd', 'alphausd', 'axsusd', 'sandusd', 'manausd',
  'maticusd', 'ftmusd', 'sklusd', 'storjusd', 'sxpusd', 'rlyusd', 'fetusd', 'rgteusd'
];

// BitStamp to CoinGecko format converter
const convertBitstampToCoingecko = (bitstampData: any[]): Coin[] => {
  return bitstampData.map((ticker: any, index: number) => {
    const symbol = ticker.pair.replace('usd', '').toLowerCase();
    const name = symbol.toUpperCase();
    
    const currentPrice = parseFloat(ticker.last) || 0;
    const priceChange24h = ((parseFloat(ticker.last) - parseFloat(ticker.open)) / parseFloat(ticker.open)) * 100 || 0;
    
    return {
      id: symbol,
      symbol: symbol,
      name: name,
      image: `https://assets.coingecko.com/coins/images/1/large/${symbol}.png`,
      current_price: currentPrice,
      market_cap: parseFloat(ticker.last) * parseFloat(ticker.volume) || 0, // Approximation
      market_cap_rank: index + 1,
      fully_diluted_valuation: parseFloat(ticker.last) * parseFloat(ticker.volume) || 0,
      total_volume: parseFloat(ticker.volume) || 0,
      high_24h: parseFloat(ticker.high) || 0,
      low_24h: parseFloat(ticker.low) || 0,
      price_change_24h: parseFloat(ticker.last) - parseFloat(ticker.open) || 0,
      price_change_percentage_24h: priceChange24h,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: priceChange24h,
      circulating_supply: 0, // Not available in BitStamp
      total_supply: 0, // Not available in BitStamp
      max_supply: null,
      ath: parseFloat(ticker.high) || parseFloat(ticker.last),
      ath_change_percentage: 0,
      ath_date: new Date().toISOString(),
      atl: parseFloat(ticker.low) || parseFloat(ticker.last),
      atl_change_percentage: 0,
      atl_date: new Date().toISOString(),
      roi: null,
      last_updated: new Date().toISOString(),
      // Remove mock sparkline data - will be fetched separately if needed
      sparkline_in_7d: {
        price: []
      },
      sparkline_in_24h: {
        price: []
      }
    };
  }).filter(coin => coin.current_price > 0); // Filter out invalid data
};

// CoinPaprika to CoinGecko format converter
const convertCoinpaprikaToCoingecko = (coinpaprikaData: any[]): Coin[] => {
  return coinpaprikaData.map((coin: any) => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: `https://static.coinpaprika.com/coin/${coin.id}/logo.png`,
    current_price: coin.quotes?.USD?.price || 0,
    market_cap: coin.quotes?.USD?.market_cap || 0,
    market_cap_rank: coin.rank || 0,
    fully_diluted_valuation: coin.quotes?.USD?.market_cap || 0,
    total_volume: coin.quotes?.USD?.volume_24h || 0,
    high_24h: coin.quotes?.USD?.price * 1.05 || 0, // Approximate
    low_24h: coin.quotes?.USD?.price * 0.95 || 0, // Approximate
    price_change_24h: coin.quotes?.USD?.price * (coin.quotes?.USD?.percent_change_24h / 100) || 0,
    price_change_percentage_24h: coin.quotes?.USD?.percent_change_24h || 0,
    market_cap_change_24h: 0, // Not available in CoinPaprika
    market_cap_change_percentage_24h: coin.quotes?.USD?.percent_change_24h || 0,
    circulating_supply: coin.circulating_supply || 0,
    total_supply: coin.total_supply || 0,
    max_supply: coin.max_supply || null,
    ath: coin.quotes?.USD?.ath_price || coin.quotes?.USD?.price,
    ath_change_percentage: 0, // Not directly available
    ath_date: coin.quotes?.USD?.ath_date || new Date().toISOString(),
    atl: 0, // Not available in CoinPaprika
    atl_change_percentage: 0, // Not available
    atl_date: new Date().toISOString(),
    roi: null,
    last_updated: new Date().toISOString(),
    // Remove mock sparkline data - will be fetched separately if needed
    sparkline_in_7d: {
      price: []
    },
    sparkline_in_24h: {
      price: []
    }
  }));
};

// CryptoCompare to CoinGecko format converter
const convertCryptocompareToCoingecko = (cryptoData: any): Coin[] => {
  const coins: Coin[] = [];
  
  Object.keys(cryptoData.Data || {}).forEach((symbol, index) => {
    const coin = cryptoData.Data[symbol];
    if (coin.USD) {
      coins.push({
        id: symbol.toLowerCase(),
        symbol: symbol.toLowerCase(),
        name: coin.CoinInfo?.FullName || symbol,
        image: coin.CoinInfo?.ImageUrl ? `https://www.cryptocompare.com${coin.CoinInfo.ImageUrl}` : '',
        current_price: coin.USD.PRICE || 0,
        market_cap: coin.USD.MKTCAP || 0,
        market_cap_rank: index + 1,
        fully_diluted_valuation: coin.USD.MKTCAP || 0,
        total_volume: coin.USD.TOTALVOLUME24HTO || 0,
        high_24h: coin.USD.HIGH24HOUR || 0,
        low_24h: coin.USD.LOW24HOUR || 0,
        price_change_24h: coin.USD.CHANGE24HOUR || 0,
        price_change_percentage_24h: coin.USD.CHANGEPCT24HOUR || 0,
        market_cap_change_24h: 0,
        market_cap_change_percentage_24h: coin.USD.CHANGEPCT24HOUR || 0,
        circulating_supply: coin.USD.SUPPLY || 0,
        total_supply: coin.USD.SUPPLY || 0,
        max_supply: null,
        ath: coin.USD.PRICE || 0,
        ath_change_percentage: 0,
        ath_date: new Date().toISOString(),
        atl: 0,
        atl_change_percentage: 0,
        atl_date: new Date().toISOString(),
        roi: null,
        last_updated: new Date().toISOString(),
        // Remove mock sparkline data - will be fetched separately if needed
        sparkline_in_7d: {
          price: []
        },
        sparkline_in_24h: {
          price: []
        }
      });
    }
  });
  
  return coins;
};

// Data source tracking
let currentDataSource: string = 'Loading...';

export const getCurrentDataSource = (): string => {
  return currentDataSource;
};

// Fallback function to try different APIs
const fetchCoinsWithFallback = async (
  vs_currency: string = 'usd',
  order: string = 'market_cap_desc',
  per_page: number = 100,
  page: number = 1
): Promise<Coin[]> => {
  const methods = [
    // Method 1: CoinGecko direct
    {
      name: 'CoinGecko API',
      fetch: async () => {
        const response = await coingeckoApi.get('/coins/markets', {
          params: {
            vs_currency,
            order,
            per_page,
            page,
            sparkline: true,
            price_change_percentage: '24h',
          },
        });
        return response.data;
      }
    },

    // Method 2: CoinGecko with proxy
    {
      name: 'CoinGecko API (Proxy)',
      fetch: async () => {
        const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
        url.searchParams.append('vs_currency', vs_currency);
        url.searchParams.append('order', order);
        url.searchParams.append('per_page', per_page.toString());
        url.searchParams.append('page', page.toString());
        url.searchParams.append('sparkline', 'true');
        url.searchParams.append('price_change_percentage', '24h');
        
        const proxyUrl = `${ALTERNATIVE_PROXY}${encodeURIComponent(url.toString())}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Proxy error: ${response.status}`);
        }
        
        return await response.json();
      }
    },

    // Method 3: CoinPaprika
    {
      name: 'CoinPaprika API',
      fetch: async () => {
        const response = await coinpaprikaApi.get('/tickers', {
          params: {
            limit: per_page,
            quotes: 'USD',
          },
        });
        
        // Skip pages for CoinPaprika (it doesn't support pagination the same way)
        const startIndex = (page - 1) * per_page;
        const endIndex = startIndex + per_page;
        const paginatedData = response.data.slice(startIndex, endIndex);
        
        return convertCoinpaprikaToCoingecko(paginatedData);
      }
    },

    // Method 4: CryptoCompare
    {
      name: 'CryptoCompare API',
      fetch: async () => {
        // Get top coins by market cap
        const topCoinsResponse = await cryptocompareApi.get('/top/mktcapfull', {
          params: {
            limit: per_page,
            tsym: 'USD',
          },
        });
        
        return convertCryptocompareToCoingecko(topCoinsResponse.data);
      }
    },

    // Method 5: BitStamp
    {
      name: 'BitStamp API',
      fetch: async () => {
        // BitStamp doesn't have a single endpoint for all coins, so we'll fetch multiple tickers
        const tickerPromises = BITSTAMP_PAIRS.slice(0, per_page).map(async (pair) => {
          try {
            const response = await bitstampApi.get(`/ticker/${pair}/`);
            return { ...response.data, pair };
          } catch (error) {
            console.warn(`Failed to fetch BitStamp ticker for ${pair}:`, error);
            return null;
          }
        });
        
        const tickers = await Promise.all(tickerPromises);
        const validTickers = tickers.filter(ticker => ticker !== null);
        
        if (validTickers.length === 0) {
          throw new Error('No valid BitStamp tickers found');
        }
        
        return convertBitstampToCoingecko(validTickers);
      }
    },
  ];

  let lastError;
  
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying cryptocurrency API method ${i + 1} (${methods[i].name})...`);
      const result = await methods[i].fetch();
      console.log(`Cryptocurrency API method ${i + 1} (${methods[i].name}) succeeded!`);
      
      // Temporary logging to check sparkline data
      if (result && result.length > 0) {
        console.log('Sample coin data structure:', {
          coinId: result[0]?.id || 'unknown',
          hasSparkline: !!result[0]?.sparkline_in_7d,
          sparklineLength: result[0]?.sparkline_in_7d?.price?.length || 0,
          sampleSparklineData: result[0]?.sparkline_in_7d?.price?.slice(0, 3)
        });
      }
      
      currentDataSource = methods[i].name;
      return result;
    } catch (error: any) {
      console.error(`Cryptocurrency API method ${i + 1} (${methods[i].name}) failed:`, error);
      lastError = error;
      
      // Continue to next method
      continue;
    }
  }
  
  // If all methods failed, throw error
  throw new Error(`All cryptocurrency APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
};

// Fallback for price history
const fetchPriceHistoryWithFallback = async (
  id: string,
  vs_currency: string = 'usd',
  days: number = 7
): Promise<any> => {
  const methods = [
    // Method 1: CoinGecko direct
    async () => {
      const response = await coingeckoApi.get(`/coins/${id}/market_chart`, {
        params: {
          vs_currency,
          days,
          interval: days <= 1 ? 'hourly' : 'daily',
        },
      });
      return response.data;
    },

    // Method 2: CoinGecko with proxy
    async () => {
      const url = new URL(`${COINGECKO_BASE_URL}/coins/${id}/market_chart`);
      url.searchParams.append('vs_currency', vs_currency);
      url.searchParams.append('days', days.toString());
      url.searchParams.append('interval', days <= 1 ? 'hourly' : 'daily');
      
      const proxyUrl = `${ALTERNATIVE_PROXY}${encodeURIComponent(url.toString())}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      return await response.json();
    },

    // Method 3: CryptoCompare historical data
    async () => {
      const symbol = id.toUpperCase();
      const endpoint = days <= 1 ? '/v2/histohour' : '/v2/histoday';
      const limit = days <= 1 ? 24 : days;
      
      const response = await cryptocompareApi.get(endpoint, {
        params: {
          fsym: symbol,
          tsym: 'USD',
          limit,
        },
      });
      
      // Convert CryptoCompare format to CoinGecko format
      const prices = response.data.Data.Data.map((item: any) => [
        item.time * 1000, // Convert to milliseconds
        item.close,
      ]);
      
      return { prices };
    },

    // Method 4: BitStamp OHLC data
    async () => {
      const pair = `${id}usd`;
      
      // Check if the pair is supported by BitStamp
      if (!BITSTAMP_PAIRS.includes(pair)) {
        throw new Error(`BitStamp doesn't support pair: ${pair}`);
      }
      
      // BitStamp OHLC endpoint - step parameter: 60 (1min), 300 (5min), 900 (15min), 1800 (30min), 3600 (1hour), 7200 (2hour), 14400 (4hour), 21600 (6hour), 43200 (12hour), 86400 (1day)
      const step = days <= 1 ? 3600 : 86400; // 1 hour for <= 1 day, 1 day otherwise
      const limit = days <= 1 ? 24 : days;
      
      const response = await bitstampApi.get(`/ohlc/${pair}/`, {
        params: {
          step,
          limit,
        },
      });
      
      // Convert BitStamp OHLC format to CoinGecko price format
      const prices = response.data.data.ohlc.map((item: any) => [
        parseInt(item.timestamp) * 1000, // Convert to milliseconds
        parseFloat(item.close),
      ]);
      
      return { prices };
    },
  ];

  let lastError;
  
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying price history API method ${i + 1} for ${id}...`);
      const result = await methods[i]();
      console.log(`Price history API method ${i + 1} succeeded for ${id}!`);
      return result;
    } catch (error: any) {
      console.error(`Price history API method ${i + 1} failed for ${id}:`, error);
      lastError = error;
      continue;
    }
  }
  
  throw new Error(`All price history APIs failed for ${id}. Last error: ${lastError?.message || 'Unknown error'}`);
};

export const coinGeckoApi = {
  // Test API connectivity
  ping: async (): Promise<any> => {
    try {
      const response = await coingeckoApi.get('/ping');
      return response.data;
    } catch (error) {
      throw new Error('All cryptocurrency APIs are currently unavailable');
    }
  },

  // Get list of coins with market data (respects hourly caching schedule)
  getCoins: async (
    vs_currency: string = 'usd',
    order: string = 'market_cap_desc',
    per_page: number = 100,
    page: number = 1,
    sparkline: boolean = false,
    price_change_percentage: string = '24h'
  ): Promise<Coin[]> => {
    const cacheKey = `coins_${vs_currency}_${order}_${per_page}_${page}`;
    
    // Check cache first (only return if within hourly window)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached) {
      console.log('Using cached coin data from current hour window');
      return cached;
    }
    
    // If it's time for scheduled update, fetch fresh data
    if (cacheService.isTimeForNextFetch()) {
      console.log('Fetching fresh coin data during scheduled window');
      try {
        const coins = await fetchCoinsWithFallback(vs_currency, order, per_page, page);
        
        // Cache the result with hourly schedule
        cacheService.cacheMarketData(cacheKey, coins);
        
        return coins;
      } catch (error) {
        console.error('Failed to fetch fresh coin data:', error);
        // Fall through to check for any older cached data
      }
    }
    
    // If not time for update or fresh fetch failed, try to get any available cached data (even if expired)
    try {
      const expiredCached = localStorage.getItem(`crypto_market_data_${cacheKey}`);
      if (expiredCached) {
        const data = JSON.parse(expiredCached);
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log('Using expired cached coin data as fallback');
          return data.data;
        }
      }
    } catch (error) {
      console.warn('Failed to read expired cache:', error);
    }
    
    // Last resort: try to fetch fresh data anyway
    console.log('No cached data available, attempting fresh fetch as last resort');
    try {
      const coins = await fetchCoinsWithFallback(vs_currency, order, per_page, page);
      cacheService.cacheMarketData(cacheKey, coins);
      return coins;
    } catch (error) {
      console.error('All data sources failed:', error);
      return [];
    }
  },

  // Get detailed coin information (respects hourly caching schedule)
  getCoinDetail: async (id: string): Promise<CoinDetail> => {
    const cacheKey = `coin_detail_${id}`;
    
    // Check cache first (only return if within hourly window)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached) {
      console.log(`Using cached coin detail for ${id} from current hour window`);
      return cached;
    }
    
    // Always allow fetching coin details for display purposes, even outside scheduled window
    // But cache with hourly schedule
    try {
      const response = await coingeckoApi.get(`/coins/${id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      });
      
      // Cache the result with hourly schedule
      cacheService.cacheMarketData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch detailed information for ${id}. All APIs unavailable.`);
    }
  },

  // Get global cryptocurrency data
  getGlobalData: async (): Promise<GlobalData> => {
    try {
      const response = await coingeckoApi.get('/global');
      return response.data;
    } catch (error) {
      throw new Error('Global cryptocurrency data is currently unavailable');
    }
  },

  // Get trending coins
  getTrendingCoins: async (): Promise<TrendingCoin[]> => {
    try {
      const response = await coingeckoApi.get('/search/trending');
      return response.data.coins;
    } catch (error) {
      throw new Error('Trending coins data is currently unavailable');
    }
  },

  // Search coins
  searchCoins: async (query: string): Promise<any> => {
    try {
      const response = await coingeckoApi.get('/search', { params: { query } });
      return response.data;
    } catch (error) {
      throw new Error('Coin search is currently unavailable');
    }
  },

  // Get supported currencies
  getSupportedCurrencies: async (): Promise<string[]> => {
    try {
      const response = await coingeckoApi.get('/simple/supported_vs_currencies');
      return response.data;
    } catch (error) {
      throw new Error('Supported currencies data is currently unavailable');
    }
  },

  // Get coin price history (respects hourly caching schedule)
  getCoinHistory: async (
    id: string,
    vs_currency: string = 'usd',
    days: number = 7
  ): Promise<any> => {
    const cacheKey = `price_history_${id}_${vs_currency}_${days}`;
    
    // Check cache first (only return if within hourly window)
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached) {
      console.log(`Using cached price history for ${id} from current hour window`);
      return cached;
    }
    
    // Allow fetching price history for charts even outside scheduled window
    // But cache with hourly schedule
    const history = await fetchPriceHistoryWithFallback(id, vs_currency, days);
    
    // Cache the result with hourly schedule
    cacheService.cacheMarketData(cacheKey, history);
    
    return history;
  },

  // Get coin OHLC data
  getCoinOHLC: async (
    id: string,
    vs_currency: string = 'usd',
    days: number = 7
  ): Promise<any> => {
    const methods = [
      // Method 1: CoinGecko direct
      async () => {
        const response = await coingeckoApi.get(`/coins/${id}/ohlc`, {
          params: {
            vs_currency,
            days,
          },
        });
        return response.data;
      },

      // Method 2: BitStamp OHLC
      async () => {
        const pair = `${id}usd`;
        
        if (!BITSTAMP_PAIRS.includes(pair)) {
          throw new Error(`BitStamp doesn't support pair: ${pair}`);
        }
        
        const step = days <= 1 ? 3600 : 86400;
        const limit = days <= 1 ? 24 : days;
        
        const response = await bitstampApi.get(`/ohlc/${pair}/`, {
          params: {
            step,
            limit,
          },
        });
        
        // Convert BitStamp format to CoinGecko OHLC format
        return response.data.data.ohlc.map((item: any) => [
          parseInt(item.timestamp) * 1000, // timestamp
          parseFloat(item.open),           // open
          parseFloat(item.high),           // high
          parseFloat(item.low),            // low
          parseFloat(item.close),          // close
        ]);
      },
    ];

    let lastError;
    
    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying OHLC API method ${i + 1} for ${id}...`);
        const result = await methods[i]();
        console.log(`OHLC API method ${i + 1} succeeded for ${id}!`);
        return result;
      } catch (error: any) {
        console.error(`OHLC API method ${i + 1} failed for ${id}:`, error);
        lastError = error;
        continue;
      }
    }
    
    throw new Error(`OHLC data for ${id} is currently unavailable. Last error: ${lastError?.message || 'Unknown error'}`);
  },

  // Get exchange data by ID
  getExchangeData: async (exchangeId: string): Promise<any> => {
    try {
      const response = await coingeckoApi.get(`/exchanges/${exchangeId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Exchange data for ${exchangeId} is currently unavailable`);
    }
  },

  // Get exchange tickers by ID
  getExchangeTickers: async (exchangeId: string, page: number = 1): Promise<any> => {
    try {
      const response = await coingeckoApi.get(`/exchanges/${exchangeId}/tickers`, {
        params: {
          page,
          order: 'volume_desc'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Exchange tickers for ${exchangeId} are currently unavailable`);
    }
  },

  // Get all exchanges list
  getExchangesList: async (): Promise<any[]> => {
    try {
      const response = await coingeckoApi.get('/exchanges/list');
      return response.data;
    } catch (error) {
      throw new Error('Exchanges list is currently unavailable');
    }
  },

  // Get coins with MEXC real-time prices (enhanced version)
  getCoinsWithMEXCPrices: async (
    vs_currency: string = 'usd',
    order: string = 'market_cap_desc',
    per_page: number = 100,
    page: number = 1
  ): Promise<Coin[]> => {
    try {
      // First get regular coin data
      const coins = await coinGeckoApi.getCoins(vs_currency, order, per_page, page);
      
      // Then enhance with MEXC real-time prices
      const coinsWithMEXCPrices = await mexcApiService.updateCoinsWithMEXCPrices(coins);
      
      return coinsWithMEXCPrices;
    } catch (error) {
      console.error('Failed to get coins with MEXC prices:', error);
      // Fallback to regular coins if MEXC integration fails
      return await coinGeckoApi.getCoins(vs_currency, order, per_page, page);
    }
  },

  // Get coins available on MEXC exchange
  getMEXCCoins: async (limit: number = 100): Promise<Coin[]> => {
    const cacheKey = `mexc_coins_${limit}`;
    
    // Check cache first
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`Using cached MEXC coins: ${cached.length} coins`);
      return cached;
    }

    try {
      console.log('Fetching MEXC exchange tickers...');
      
      // First, try to get MEXC exchange info to verify it exists
      let mexcExchangeId = 'mexc_global';
      
      try {
        await coinGeckoApi.getExchangeData(mexcExchangeId);
        console.log(`MEXC exchange found with ID: ${mexcExchangeId}`);
      } catch (exchangeError) {
        console.warn(`Exchange ID ${mexcExchangeId} not found, trying alternative IDs...`);
        
        // Try alternative MEXC exchange IDs
        const alternativeIds = ['mexc', 'mxc', 'mexc_global', 'mexc_exchange'];
        let foundExchange = false;
        
        for (const altId of alternativeIds) {
          try {
            await coinGeckoApi.getExchangeData(altId);
            mexcExchangeId = altId;
            foundExchange = true;
            console.log(`Found MEXC exchange with ID: ${altId}`);
            break;
          } catch (altError) {
            continue;
          }
        }
        
        if (!foundExchange) {
          throw new Error('MEXC exchange not found with any known ID');
        }
      }
      
      // Get MEXC exchange tickers
      const mexcTickers = await coinGeckoApi.getExchangeTickers(mexcExchangeId, 1);
      
      if (!mexcTickers.tickers || mexcTickers.tickers.length === 0) {
        console.warn('No MEXC tickers found');
        return [];
      }

      // Extract unique coin IDs from MEXC tickers
      const mexcCoinIds = new Set<string>();
      mexcTickers.tickers.forEach((ticker: any) => {
        if (ticker.coin_id) {
          mexcCoinIds.add(ticker.coin_id);
        }
      });

      console.log(`Found ${mexcCoinIds.size} unique coins on MEXC`);

      if (mexcCoinIds.size === 0) {
        console.warn('No coin IDs found in MEXC tickers');
        return [];
      }

      // Convert Set to Array and limit the number of coins
      const coinIdsArray = Array.from(mexcCoinIds).slice(0, limit);
      
      // Get market data for these coins
      const coinsData = await coinGeckoApi.getCoins('usd', 'market_cap_desc', Math.max(limit, 200), 1, false, '24h');
      
      // Filter coins to only include those available on MEXC
      const mexcCoins = coinsData.filter(coin => coinIdsArray.includes(coin.id));
      
      console.log(`Filtered to ${mexcCoins.length} coins available on MEXC`);
      
      // If we have coins, cache them
      if (mexcCoins.length > 0) {
        cacheService.cacheMarketData(cacheKey, mexcCoins);
      }
      
      return mexcCoins;
    } catch (error: any) {
      console.error('Error fetching MEXC coins:', error);
      
      // Fallback: try to get a smaller set of popular coins that are likely on MEXC
      try {
        console.log('Falling back to popular coins likely on MEXC...');
        const popularCoins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 50, 1);
        
        // Filter to major coins that are commonly available on most exchanges
        const majorCoins = popularCoins.filter(coin => {
          const symbol = coin.symbol.toLowerCase();
          const majorSymbols = [
            'btc', 'eth', 'bnb', 'ada', 'sol', 'xrp', 'dot', 'doge', 'avax', 'matic',
            'link', 'ltc', 'bch', 'xlm', 'vet', 'fil', 'trx', 'etc', 'atom', 'near',
            'algo', 'mana', 'sand', 'gala', 'axs', 'chz', 'ens', 'lrc', 'cro', 'ftm'
          ];
          return majorSymbols.includes(symbol);
        });
        
        // Cache a smaller set as fallback
        const fallbackCoins = majorCoins.slice(0, Math.min(20, limit));
        
        if (fallbackCoins.length > 0) {
          cacheService.cacheMarketData(cacheKey, fallbackCoins);
        }
        
        console.log(`Fallback returned ${fallbackCoins.length} major coins`);
        return fallbackCoins;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  },

  // New MEXC-first approach: Get all MEXC coins and enhance with CoinGecko data
  getCoinsWithMEXCPrimary: async (
    limit: number = 1500 // Increased default limit to allow more coins for analysis
  ): Promise<Coin[]> => {
    try {
      console.log(`🚀 API: Fetching coins with MEXC as primary source (limit: ${limit})...`);
      
      // Get all MEXC USDT trading pairs as primary list
      const mexcCoins = await mexcApiService.getAllMEXCCoins();
      console.log(`📊 API: Got ${mexcCoins.length} MEXC coins from API`);
      
      if (mexcCoins.length === 0) {
        console.warn('⚠️ API: No MEXC coins found, falling back to CoinGecko');
        return await fetchCoinsWithFallback('usd', 'market_cap_desc', limit, 1);
      }
      
      // Use more coins if available, but respect the limit
      const coinsToProcess = Math.min(mexcCoins.length, limit);
      const limitedMexcCoins = mexcCoins.slice(0, coinsToProcess);
      console.log(`🔄 API: Processing ${limitedMexcCoins.length} MEXC coins (requested: ${limit}, available: ${mexcCoins.length})`);
      
      // Enhance with CoinGecko data for market cap, supply, and other metadata
      const enhancedCoins = await coinGeckoApi.enhanceMEXCCoinsWithCoinGecko(limitedMexcCoins);
      
      currentDataSource = `MEXC Primary (${enhancedCoins.length} coins)`;
      console.log(`✅ API: Successfully fetched ${enhancedCoins.length} coins with MEXC as primary source`);
      
      return enhancedCoins;
      
    } catch (error) {
      console.error('❌ API: Error in getCoinsWithMEXCPrimary:', error);
      // Fallback to regular CoinGecko if MEXC fails
      return await fetchCoinsWithFallback('usd', 'market_cap_desc', limit, 1);
    }
  },

  // Enhance MEXC coins with CoinGecko metadata
  enhanceMEXCCoinsWithCoinGecko: async (mexcCoins: Coin[]): Promise<Coin[]> => {
    try {
      console.log(`Enhancing ${mexcCoins.length} MEXC coins with CoinGecko metadata...`);
      
      // Get a comprehensive list of CoinGecko coins for matching
      const coinGeckoCoins = await fetchCoinsWithFallback('usd', 'market_cap_desc', 2000, 1);
      console.log(`Fetched ${coinGeckoCoins.length} CoinGecko coins for matching`);
      
      // Create multiple maps for better matching
      const coinGeckoBySymbol = new Map<string, Coin>();
      const coinGeckoById = new Map<string, Coin>();
      const coinGeckoByName = new Map<string, Coin>();
      
      coinGeckoCoins.forEach(coin => {
        coinGeckoById.set(coin.id, coin);
        coinGeckoBySymbol.set(coin.symbol.toLowerCase(), coin);
        coinGeckoByName.set(coin.name.toLowerCase(), coin);
      });
      
      console.log(`Created lookup maps: ${coinGeckoById.size} by ID, ${coinGeckoBySymbol.size} by symbol`);
      
      // Enhanced symbol mapping for better matching
      const symbolMappings: { [key: string]: string } = {
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
        'ren': 'republic-protocol'
      };
      
      // Enhance MEXC coins with CoinGecko data
      const enhancedCoins: Coin[] = [];
      let matchedCount = 0;
      let unmatchedCount = 0;
      
      for (const mexcCoin of mexcCoins) {
        let coinGeckoCoin: Coin | undefined;
        
        // Try multiple matching strategies
        // 1. Try direct ID match (if MEXC coin already has proper CoinGecko ID)
        if (mexcCoin.id && mexcCoin.id !== mexcCoin.symbol) {
          coinGeckoCoin = coinGeckoById.get(mexcCoin.id);
        }
        
        // 2. Try symbol mapping
        if (!coinGeckoCoin) {
          const mappedId = symbolMappings[mexcCoin.symbol.toLowerCase()];
          if (mappedId) {
            coinGeckoCoin = coinGeckoById.get(mappedId);
          }
        }
        
        // 3. Try direct symbol match
        if (!coinGeckoCoin) {
          coinGeckoCoin = coinGeckoBySymbol.get(mexcCoin.symbol.toLowerCase());
        }
        
        // 4. Try name-based matching (fallback)
        if (!coinGeckoCoin) {
          coinGeckoCoin = coinGeckoByName.get(mexcCoin.name.toLowerCase());
        }
        
        if (coinGeckoCoin) {
          // Successfully matched - merge MEXC real-time data with CoinGecko metadata
          const enhancedCoin: Coin = {
            // Start with CoinGecko data for all metadata (including market cap!)
            ...coinGeckoCoin,
            
            // Override with MEXC real-time price data
            current_price: mexcCoin.current_price,
            high_24h: mexcCoin.high_24h,
            low_24h: mexcCoin.low_24h,
            price_change_24h: mexcCoin.price_change_24h,
            price_change_percentage_24h: mexcCoin.price_change_percentage_24h,
            total_volume: mexcCoin.total_volume,
            last_updated: mexcCoin.last_updated,
            
            // Add MEXC metadata
            original_price: mexcCoin.original_price,
            price_source: 'Hybrid' as const, // Indicates CoinGecko metadata + MEXC prices
            price_updated_at: mexcCoin.price_updated_at,
            mexc_data: mexcCoin.mexc_data
          };
          
          enhancedCoins.push(enhancedCoin);
          matchedCount++;
        } else {
          // No CoinGecko match found - use MEXC data as-is but mark it
          const mexcOnlyCoin: Coin = {
            ...mexcCoin,
            price_source: 'MEXC' as const,
            // Estimate market cap if we have circulating supply, otherwise leave as 0
            market_cap: mexcCoin.circulating_supply > 0 ? 
              mexcCoin.current_price * mexcCoin.circulating_supply : 0
          };
          
          enhancedCoins.push(mexcOnlyCoin);
          unmatchedCount++;
          
          // Log unmatched coins for debugging (limit to first 10)
          if (unmatchedCount <= 10) {
            console.log(`No CoinGecko match for MEXC coin: ${mexcCoin.symbol.toUpperCase()} (${mexcCoin.name})`);
          }
        }
      }
      
      console.log(`Enhancement complete: ${matchedCount} matched with CoinGecko, ${unmatchedCount} MEXC-only`);
      
      // Sort by market cap (for matched coins) or volume (for MEXC-only coins)
      enhancedCoins.sort((a, b) => {
        // Prioritize coins with market cap data
        if (a.market_cap > 0 && b.market_cap === 0) return -1;
        if (b.market_cap > 0 && a.market_cap === 0) return 1;
        
        // Both have market cap - sort by market cap
        if (a.market_cap > 0 && b.market_cap > 0) {
          return b.market_cap - a.market_cap;
        }
        
        // Both don't have market cap - sort by volume
        return b.total_volume - a.total_volume;
      });
      
      // Update market cap ranks based on final sorting
      enhancedCoins.forEach((coin, index) => {
        coin.market_cap_rank = index + 1;
      });
      
      console.log(`Final enhanced coin list: ${enhancedCoins.length} coins`);
      console.log(`Top 5 by market cap: ${enhancedCoins.slice(0, 5).map(c => 
        `${c.symbol.toUpperCase()}: $${(c.market_cap / 1000000000).toFixed(1)}B`
      ).join(', ')}`);
      
      return enhancedCoins;
      
    } catch (error) {
      console.error('Error enhancing MEXC coins with CoinGecko data:', error);
      // Return MEXC coins as-is if enhancement fails
      console.log('Falling back to MEXC-only data');
      return mexcCoins;
    }
  },
};

// Unified API service for backward compatibility
export const apiService = {
  ...coinGeckoApi,
  getTopCoins: async (limit: number = 100): Promise<Coin[]> => {
    return await coinGeckoApi.getCoins('usd', 'market_cap_desc', limit, 1);
  },
};

export default coinGeckoApi; 