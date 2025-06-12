import { Coin } from '../types';

interface MEXCTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  prevClosePrice: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  count: number;
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
}

export class StreamlinedDataFetcher {
  private readonly MEXC_BASE_URL = 'https://api.mexc.com/api/v3';
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  
  // Try multiple CORS proxies for better reliability
  private readonly CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
  ];

  // Symbol mapping for better CoinGecko matching
  private readonly SYMBOL_TO_COINGECKO_ID: { [key: string]: string } = {
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
    'shib': 'shiba-inu',
    'dai': 'dai',
    'apt': 'aptos',
    'qnt': 'quant-network',
    'arb': 'arbitrum',
    'op': 'optimism',
    'imx': 'immutable-x',
    'inj': 'injective-protocol',
    'sei': 'sei-network',
    'tia': 'celestia',
    'wld': 'worldcoin-wld',
    'jup': 'jupiter-exchange-solana',
    'strk': 'starknet',
    'manta': 'manta-network',
    'alt': 'altlayer',
    'jto': 'jito-governance-token',
    'pyth': 'pyth-network',
    'bonk': 'bonk',
    'wif': 'dogwifcoin',
    'pepe': 'pepe',
    'floki': 'floki',
    'meme': 'memecoin',
    'bome': 'book-of-meme'
  };

  // Comprehensive filter lists
  private readonly BLOCKED_TOKENS = [
    // User-reported problematic tokens
    'bsc-usd', 'bscusd', 'weth', 'wsteth', 'bnsol', 'meth', 'steth', 'reth', 
    'rseth', 'weeth', 'jitosol', 'lbtc', 'wbtc', 'cbbtc', 'usde', 'susds', 
    'susde', 'usds', 'usdtb',
    
    // Stablecoins
    'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 'gusd',
    'husd', 'susd', 'cusd', 'ousd', 'musd', 'dusd', 'yusd', 'rusd', 'nusd',
    'usdn', 'ustc', 'ust', 'vai', 'mim', 'fei', 'tribe', 'rai', 'float',
    'eurc', 'eurs', 'eurt', 'gbpt', 'jpyc', 'cadc', 'audc', 'nzds',
    'paxg', 'xaut', 'dgld', 'pmgt', 'cache', 'usdx', 'usdk',
    'usdj', 'fdusd', 'usd1', 'usdt0', 'usdc0', 'usdt1', 'usdc1',
    'pyusd', 'usdm', 'gho', 'crvusd', 'mkusd', 'usdz', 'usdy',
    'usdr', 'usdb', 'usdh', 'usdq',
    
    // Wrapped tokens
    'wbnb', 'wmatic', 'wavax', 'wftm', 'wsol',
    
    // Staked tokens
    'cbeth', 'sfrxeth', 'stmatic', 'stsol',
    
    // Bridge and BSC tokens
    'bsc-usd', 'bscusd', 'anyswap', 'multichain', 'celer', 'synapse'
  ];

  private async makeRequest<T>(url: string, retries = 3): Promise<T> {
    console.log(`🌐 Making request to: ${url}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        // For MEXC API, try multiple CORS proxies
        const isMexcApi = url.includes('api.mexc.com');
        let response;
        
        if (isMexcApi) {
          console.log(`🔄 Using CORS proxy for MEXC API (attempt ${i + 1})...`);
          
          // Try different CORS proxies on different attempts
          let proxyUrl;
          const proxyIndex = i % this.CORS_PROXIES.length;
          const proxy = this.CORS_PROXIES[proxyIndex];
          
          if (proxy.includes('allorigins.win')) {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
          } else if (proxy.includes('cors-anywhere')) {
            proxyUrl = `${proxy}${url}`;
          } else if (proxy.includes('thingproxy')) {
            proxyUrl = `${proxy}${url}`;
          } else {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
          }
          
          console.log(`🔗 Using proxy ${proxyIndex + 1}/${this.CORS_PROXIES.length}: ${proxy}`);
          
          response = await fetch(proxyUrl, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
        } else {
          // Try direct request for CoinGecko (supports CORS)
          console.log(`🔄 Direct request to CoinGecko...`);
          response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
        }

        console.log(`📡 Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`Rate limited by API (${response.status})`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Successfully fetched data (${Array.isArray(data) ? data.length : 'object'} items)`);
        return data;
        
      } catch (error) {
        console.warn(`❌ Request failed (attempt ${i + 1}/${retries}):`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('All retries failed');
  }

  private isTokenBlocked(symbol: string): boolean {
    const symbolLower = symbol.toLowerCase();
    
    // Check explicit blocked list
    if (this.BLOCKED_TOKENS.includes(symbolLower)) {
      return true;
    }
    
    // Pattern-based blocking
    // Wrapped token patterns
    if (symbolLower.startsWith('w') && ['eth', 'btc', 'bnb', 'matic', 'avax', 'ftm', 'sol'].some(token => symbolLower.includes(token))) {
      return true;
    }
    
    // Staked token patterns
    if (symbolLower.includes('staked') || symbolLower.includes('liquid') || 
        symbolLower.includes('jito') || symbolLower.endsWith('sol') ||
        symbolLower.startsWith('st') || symbolLower.includes('seth')) {
      return true;
    }
    
    // BSC and bridge tokens
    if (symbolLower.includes('bsc') || symbolLower.includes('-usd')) {
      return true;
    }
    
    // USD variants
    if (/^usd[tc]?\d+$/i.test(symbolLower) || /^[a-z]*usd[a-z]*\d*$/i.test(symbolLower)) {
      return true;
    }
    
    return false;
  }

  // Step 1: Get MEXC USDT trading pairs with real-time prices
  async getMEXCUSDTPairs(): Promise<MEXCTicker[]> {
    console.log('🔄 Fetching MEXC USDT trading pairs...');
    
    try {
      const url = `${this.MEXC_BASE_URL}/ticker/24hr`;
      const tickers: MEXCTicker[] = await this.makeRequest(url);
      
      // Filter for USDT pairs only
      const usdtPairs = tickers.filter(ticker => 
        ticker.symbol.endsWith('USDT') && 
        ticker.symbol !== 'USDT' // Exclude USDT itself
      );
      
      console.log(`📊 Found ${usdtPairs.length} USDT trading pairs on MEXC`);
      
      // Filter out blocked tokens
      const filteredPairs = usdtPairs.filter(ticker => {
        const baseSymbol = ticker.symbol.replace('USDT', '').toLowerCase();
        const isBlocked = this.isTokenBlocked(baseSymbol);
        
        if (isBlocked) {
          console.log(`🚫 Blocked token: ${baseSymbol.toUpperCase()}`);
        }
        
        return !isBlocked;
      });
      
      console.log(`✅ After filtering: ${filteredPairs.length} valid USDT pairs (blocked ${usdtPairs.length - filteredPairs.length})`);
      
      // Sort by 24h volume (highest first)
      filteredPairs.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      
      return filteredPairs;
      
    } catch (error) {
      console.error('❌ Failed to fetch MEXC USDT pairs:', error);
      throw error;
    }
  }

  // Step 2: Get CoinGecko market data for symbol mapping (with fallback)
  async getCoinGeckoMarketData(): Promise<Map<string, CoinGeckoMarketData>> {
    console.log('🔄 Fetching CoinGecko market data...');
    
    try {
      const url = `${this.COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`;
      const coins: CoinGeckoMarketData[] = await this.makeRequest(url);
      
      // Create symbol -> coin data map
      const symbolMap = new Map<string, CoinGeckoMarketData>();
      
      coins.forEach(coin => {
        symbolMap.set(coin.symbol.toLowerCase(), coin);
      });
      
      console.log(`📊 Loaded ${coins.length} CoinGecko coins for mapping`);
      return symbolMap;
      
    } catch (error) {
      console.warn('⚠️ CoinGecko API failed (likely rate limited), proceeding with MEXC-only data:', error);
      return new Map(); // Return empty map - we'll use MEXC-only data
    }
  }

  // Step 3: Combine MEXC real-time prices with CoinGecko metadata (fallback to MEXC-only)
  async getStreamlinedCoins(limit: number = 100): Promise<Coin[]> {
    console.log(`🚀 Starting streamlined coin fetching (limit: ${limit})...`);
    
    try {
      // Get MEXC USDT pairs and CoinGecko data in parallel
      const [mexcPairs, coinGeckoMap] = await Promise.all([
        this.getMEXCUSDTPairs(),
        this.getCoinGeckoMarketData()
      ]);
      
      if (mexcPairs.length === 0) {
        throw new Error('No MEXC USDT pairs found');
      }
      
      const hasCoinGeckoData = coinGeckoMap.size > 0;
      console.log(`🔄 Processing ${Math.min(mexcPairs.length, limit * 2)} MEXC pairs... (CoinGecko: ${hasCoinGeckoData ? 'Available' : 'Unavailable - using MEXC-only data'})`);
      
      const coins: Coin[] = [];
      
      // Process MEXC pairs (take more than limit to account for failed matches)
      for (let i = 0; i < Math.min(mexcPairs.length, limit * 2); i++) {
        const ticker = mexcPairs[i];
        const baseSymbol = ticker.symbol.replace('USDT', '').toLowerCase();
        
        // Get CoinGecko data for this symbol (if available)
        let coinGeckoData: CoinGeckoMarketData | undefined;
        
        if (hasCoinGeckoData) {
          coinGeckoData = coinGeckoMap.get(baseSymbol);
          
          // Try mapped ID if direct symbol lookup fails
          if (!coinGeckoData && this.SYMBOL_TO_COINGECKO_ID[baseSymbol]) {
            const mappedId = this.SYMBOL_TO_COINGECKO_ID[baseSymbol];
            // Find by ID in the map
            const coinGeckoArray = Array.from(coinGeckoMap.values());
            for (const coin of coinGeckoArray) {
              if (coin.id === mappedId) {
                coinGeckoData = coin;
                break;
              }
            }
          }
        }
        
        // Create coin object
        const currentPrice = parseFloat(ticker.lastPrice) || 0;
        const priceChange24h = parseFloat(ticker.priceChange) || 0;
        const priceChangePercent24h = parseFloat(ticker.priceChangePercent) || 0;
        const volume24h = parseFloat(ticker.quoteVolume) || 0;
        const high24h = parseFloat(ticker.highPrice) || 0;
        const low24h = parseFloat(ticker.lowPrice) || 0;
        
        // Skip if no valid price or volume
        if (currentPrice <= 0 || volume24h <= 1000) {
          continue;
        }
        
        // Estimate market cap from volume if CoinGecko data is not available
        const estimatedMarketCap = hasCoinGeckoData ? 
          (coinGeckoData?.market_cap || 0) : 
          volume24h * 50; // Rough estimate: 50x daily volume
        
        const coin: Coin = {
          // Use CoinGecko data if available, otherwise create from MEXC data
          id: coinGeckoData?.id || baseSymbol,
          symbol: baseSymbol,
          name: coinGeckoData?.name || baseSymbol.toUpperCase(),
          image: coinGeckoData?.image || `https://assets.coingecko.com/coins/images/1/large/${baseSymbol}.png`,
          
          // Real-time MEXC price data
          current_price: currentPrice,
          high_24h: high24h,
          low_24h: low24h,
          price_change_24h: priceChange24h,
          price_change_percentage_24h: priceChangePercent24h,
          total_volume: volume24h,
          
          // CoinGecko metadata (if available) or estimates
          market_cap: estimatedMarketCap,
          market_cap_rank: coinGeckoData?.market_cap_rank || 0,
          fully_diluted_valuation: coinGeckoData?.fully_diluted_valuation || estimatedMarketCap,
          circulating_supply: coinGeckoData?.circulating_supply || 0,
          total_supply: coinGeckoData?.total_supply || 0,
          max_supply: coinGeckoData?.max_supply || null,
          ath: coinGeckoData?.ath || currentPrice * 2, // Estimate ATH as 2x current price
          ath_change_percentage: coinGeckoData?.ath_change_percentage || -50,
          ath_date: coinGeckoData?.ath_date || new Date().toISOString(),
          atl: coinGeckoData?.atl || currentPrice * 0.1, // Estimate ATL as 10% of current price
          atl_change_percentage: coinGeckoData?.atl_change_percentage || 900,
          atl_date: coinGeckoData?.atl_date || new Date().toISOString(),
          
          // Default values
          market_cap_change_24h: priceChange24h * (estimatedMarketCap / currentPrice),
          market_cap_change_percentage_24h: priceChangePercent24h,
          roi: null,
          last_updated: new Date().toISOString(),
          sparkline_in_7d: { price: [] },
          sparkline_in_24h: { price: [] },
          
          // Source tracking
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
        
        coins.push(coin);
        
        // Stop when we have enough coins
        if (coins.length >= limit) {
          break;
        }
      }
      
      // Sort by volume (highest first)
      coins.sort((a, b) => b.total_volume - a.total_volume);
      
      console.log(`✅ Successfully created ${coins.length} streamlined coins`);
      console.log('🏆 Top 10 by volume:');
      coins.slice(0, 10).forEach((coin, index) => {
        const mcap = coin.market_cap > 0 ? `$${(coin.market_cap / 1000000).toFixed(1)}M` : 'No MCap';
        const vol = `$${(coin.total_volume / 1000000).toFixed(1)}M`;
        const source = coinGeckoMap.size > 0 ? 'MEXC+CG' : 'MEXC-only';
        console.log(`  ${index + 1}. ${coin.symbol.toUpperCase()}: ${mcap} MCap, ${vol} Vol (${source})`);
      });
      
      return coins;
      
    } catch (error) {
      console.error('❌ Failed to get streamlined coins:', error);
      throw error;
    }
  }

  // Get price history for technical analysis (can use any API)
  async getPriceHistory(coinId: string, days: number = 7): Promise<number[][]> {
    console.log(`📈 Fetching price history for ${coinId} (${days} days)...`);
    
    try {
      const url = `${this.COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
      const data = await this.makeRequest<{ prices: number[][] }>(url);
      
      return data.prices || [];
    } catch (error) {
      console.warn(`Failed to fetch price history for ${coinId}:`, error);
      return [];
    }
  }
}

export const streamlinedDataFetcher = new StreamlinedDataFetcher(); 