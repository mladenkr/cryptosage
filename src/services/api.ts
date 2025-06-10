import axios from 'axios';
import { Coin, CoinDetail, GlobalData, TrendingCoin } from '../types';

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

  // Get list of coins with market data
  getCoins: async (
    vs_currency: string = 'usd',
    order: string = 'market_cap_desc',
    per_page: number = 100,
    page: number = 1,
    sparkline: boolean = false,
    price_change_percentage: string = '24h'
  ): Promise<Coin[]> => {
    return await fetchCoinsWithFallback(vs_currency, order, per_page, page);
  },

  // Get detailed coin information
  getCoinDetail: async (id: string): Promise<CoinDetail> => {
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

  // Get coin price history
  getCoinHistory: async (
    id: string,
    vs_currency: string = 'usd',
    days: number = 7
  ): Promise<any> => {
    return await fetchPriceHistoryWithFallback(id, vs_currency, days);
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
};

// Unified API service for backward compatibility
export const apiService = {
  ...coinGeckoApi,
  getTopCoins: async (limit: number = 100): Promise<Coin[]> => {
    return await coinGeckoApi.getCoins('usd', 'market_cap_desc', limit, 1);
  },
};

export default coinGeckoApi; 