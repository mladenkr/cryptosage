import { Coin } from '../types';

// Enhanced coin data interface with additional fields from multiple sources
export interface EnhancedCoinData extends Coin {
  // Additional data from multiple sources
  price_change_percentage_1h?: number;
  price_change_percentage_7d?: number;
  price_change_percentage_30d?: number;
  price_change_percentage_1y?: number;
  
  // Volume and liquidity metrics
  volume_change_24h?: number;
  volume_change_percentage_24h?: number;
  
  // Supply metrics
  circulating_supply_percentage?: number;
  
  // Social and development metrics
  developer_score?: number;
  community_score?: number;
  liquidity_score?: number;
  public_interest_score?: number;
  
  // Exchange and trading data
  tickers?: any[];
  
  // Network and contract information
  network?: string; // e.g., "Ethereum", "Binance Smart Chain", "Polygon", etc.
  contract_address?: string; // Smart contract address
  is_native_token?: boolean; // True for native tokens like ETH, BNB, MATIC
  
  // Data quality and source tracking
  data_sources?: string[];
  data_quality_score?: number;
  last_updated_source?: string;
  source_url?: string; // URL to the original source page
}

export class EnhancedDataSources {
  private readonly COINPAPRIKA_BASE = 'https://api.coinpaprika.com/v1';
  private readonly COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
  private readonly CRYPTOCOMPARE_BASE = 'https://min-api.cryptocompare.com/data';
  private readonly MESSARI_BASE = 'https://data.messari.io/api/v1';
  
  // Rate limiting to respect free tier limits
  private lastRequest: { [key: string]: number } = {};
  private readonly RATE_LIMIT_MS = 1000; // 1 second between requests per API

  private async rateLimitedFetch(url: string, apiName: string): Promise<any> {
    const now = Date.now();
    const lastReq = this.lastRequest[apiName] || 0;
    const timeSinceLastReq = now - lastReq;
    
    if (timeSinceLastReq < this.RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastReq));
    }
    
    this.lastRequest[apiName] = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoSage/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch from ${apiName}:`, error);
      return null;
    }
  }

  // Get comprehensive coin list from multiple sources
  async getEnhancedCoinList(limit: number = 1000): Promise<EnhancedCoinData[]> {
    console.log(`EnhancedDataSources: Fetching comprehensive coin data for ${limit} coins...`);
    
    const coinSources = await Promise.allSettled([
      this.getCoinGeckoCoins(limit),
      this.getCoinPaprikaCoins(limit),
      this.getMessariCoins(limit)
    ]);

    // Merge and deduplicate coins from multiple sources
    const allCoins = new Map<string, EnhancedCoinData>();
    
    coinSources.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const sourceName = ['CoinGecko', 'CoinPaprika', 'Messari'][index];
        console.log(`EnhancedDataSources: Successfully fetched ${result.value.length} coins from ${sourceName}`);
        
        result.value.forEach((coin: EnhancedCoinData) => {
          const key = coin.symbol.toLowerCase();
          if (!allCoins.has(key) || this.isHigherQualityData(coin, allCoins.get(key)!)) {
            allCoins.set(key, coin);
          }
        });
      }
    });

    const mergedCoins = Array.from(allCoins.values())
      .filter(coin => this.isValidForAnalysis(coin))
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, limit);

    console.log(`EnhancedDataSources: Merged and filtered to ${mergedCoins.length} high-quality coins`);
    return mergedCoins;
  }

  private async getCoinGeckoCoins(limit: number): Promise<EnhancedCoinData[]> {
    try {
      const url = `${this.COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${Math.min(limit, 250)}&page=1&sparkline=true&price_change_percentage=1h,24h,7d,30d`;
      const data = await this.rateLimitedFetch(url, 'coingecko');
      
      if (!data || !Array.isArray(data)) return [];
      
      return data.map(coin => this.transformCoinGeckoData(coin));
    } catch (error) {
      console.warn('Failed to fetch CoinGecko data:', error);
      return [];
    }
  }

  private async getCoinPaprikaCoins(limit: number): Promise<EnhancedCoinData[]> {
    try {
      const url = `${this.COINPAPRIKA_BASE}/tickers?limit=${Math.min(limit, 5000)}&quotes=USD`;
      const data = await this.rateLimitedFetch(url, 'coinpaprika');
      
      if (!data || !Array.isArray(data)) return [];
      
      return data.slice(0, limit).map(coin => this.transformCoinPaprikaData(coin));
    } catch (error) {
      console.warn('Failed to fetch CoinPaprika data:', error);
      return [];
    }
  }

  private async getMessariCoins(limit: number): Promise<EnhancedCoinData[]> {
    try {
      const url = `${this.MESSARI_BASE}/assets?limit=${Math.min(limit, 500)}&fields=id,slug,symbol,name,metrics/market_data,metrics/marketcap,metrics/supply,profile/general/overview/project_details`;
      const data = await this.rateLimitedFetch(url, 'messari');
      
      if (!data?.data || !Array.isArray(data.data)) return [];
      
      return data.data.map((coin: any) => this.transformMessariData(coin));
    } catch (error) {
      console.warn('Failed to fetch Messari data:', error);
      return [];
    }
  }

  private transformCoinGeckoData(coin: any): EnhancedCoinData {
    return {
      ...coin,
      price_change_percentage_1h: coin.price_change_percentage_1h_in_currency,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency,
      price_change_percentage_30d: coin.price_change_percentage_30d_in_currency,
      circulating_supply_percentage: coin.max_supply ? 
        (coin.circulating_supply / coin.max_supply) * 100 : undefined,
      
      // Network and contract information
      network: this.detectNetwork(coin),
      contract_address: this.extractContractAddress(coin),
      is_native_token: this.isNativeToken(coin.symbol, coin.id),
      
      // Source tracking
      data_sources: ['CoinGecko'],
      data_quality_score: this.calculateDataQuality(coin, 'coingecko'),
      last_updated_source: 'CoinGecko',
      source_url: `https://www.coingecko.com/en/coins/${coin.id}`
    };
  }

  private transformCoinPaprikaData(coin: any): EnhancedCoinData {
    const quotes = coin.quotes?.USD || {};
    return {
      id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
      image: `https://static.coinpaprika.com/coin/${coin.id}/logo.png`,
      current_price: quotes.price || 0,
      market_cap: quotes.market_cap || 0,
      market_cap_rank: coin.rank || 0,
      fully_diluted_valuation: quotes.market_cap || 0,
      total_volume: quotes.volume_24h || 0,
      high_24h: quotes.price * 1.05 || 0,
      low_24h: quotes.price * 0.95 || 0,
      price_change_24h: quotes.price * (quotes.percent_change_24h / 100) || 0,
      price_change_percentage_24h: quotes.percent_change_24h || 0,
      price_change_percentage_1h: quotes.percent_change_1h || 0,
      price_change_percentage_7d: quotes.percent_change_7d || 0,
      price_change_percentage_30d: quotes.percent_change_30d || 0,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: quotes.percent_change_24h || 0,
      circulating_supply: coin.circulating_supply || 0,
      total_supply: coin.total_supply || 0,
      max_supply: coin.max_supply || null,
      circulating_supply_percentage: coin.max_supply ? 
        (coin.circulating_supply / coin.max_supply) * 100 : undefined,
      ath: quotes.ath_price || quotes.price,
      ath_change_percentage: 0,
      ath_date: quotes.ath_date || new Date().toISOString(),
      atl: 0,
      atl_change_percentage: 0,
      atl_date: new Date().toISOString(),
      roi: null,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: [] },
      sparkline_in_24h: { price: [] },
      
      // Network and contract information
      network: this.detectNetworkFromSymbol(coin.symbol, coin.id),
      is_native_token: this.isNativeToken(coin.symbol, coin.id),
      
      // Source tracking
      data_sources: ['CoinPaprika'],
      data_quality_score: this.calculateDataQuality(coin, 'coinpaprika'),
      last_updated_source: 'CoinPaprika',
      source_url: `https://coinpaprika.com/coin/${coin.id}`
    };
  }

  private transformMessariData(coin: any): EnhancedCoinData {
    const metrics = coin.metrics || {};
    const marketData = metrics.market_data || {};
    const supply = metrics.supply || {};
    
    return {
      id: coin.slug || coin.id,
      symbol: coin.symbol?.toLowerCase() || '',
      name: coin.name || '',
      image: `https://messari.io/asset-images/${coin.slug}/128.png`,
      current_price: marketData.price_usd || 0,
      market_cap: metrics.marketcap?.current_marketcap_usd || 0,
      market_cap_rank: metrics.marketcap?.rank || 0,
      fully_diluted_valuation: metrics.marketcap?.y_2050_marketcap_usd || 0,
      total_volume: marketData.real_volume_last_24_hours || 0,
      high_24h: (marketData.price_usd || 0) * 1.05,
      low_24h: (marketData.price_usd || 0) * 0.95,
      price_change_24h: marketData.percent_change_usd_last_24_hours || 0,
      price_change_percentage_24h: marketData.percent_change_usd_last_24_hours || 0,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: marketData.percent_change_usd_last_24_hours || 0,
      circulating_supply: supply.circulating || 0,
      total_supply: supply.total || 0,
      max_supply: supply.max || null,
      circulating_supply_percentage: supply.max ? 
        (supply.circulating / supply.max) * 100 : undefined,
      ath: marketData.price_usd || 0,
      ath_change_percentage: 0,
      ath_date: new Date().toISOString(),
      atl: 0,
      atl_change_percentage: 0,
      atl_date: new Date().toISOString(),
      roi: null,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: [] },
      sparkline_in_24h: { price: [] },
      data_sources: ['Messari'],
      data_quality_score: this.calculateDataQuality(coin, 'messari'),
      last_updated_source: 'Messari'
    };
  }

  private async getSocialMetrics(coinId: string, symbol: string): Promise<any> {
    try {
      // CoinGecko social data
      const url = `${this.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true`;
      const data = await this.rateLimitedFetch(url, 'coingecko_social');
      
      if (!data) return null;
      
      return {
        twitterFollowers: data.community_data?.twitter_followers || 0,
        redditSubscribers: data.community_data?.reddit_subscribers || 0,
        githubStars: data.developer_data?.stars || 0,
        telegramMembers: data.community_data?.telegram_channel_user_count || 0
      };
    } catch (error) {
      console.warn(`Failed to get social metrics for ${symbol}:`, error);
      return null;
    }
  }

  private calculateDataQuality(coin: any, source: string): number {
    let score = 50; // Base score
    
    // Price data quality
    if (coin.current_price || coin.quotes?.USD?.price || coin.metrics?.market_data?.price_usd) {
      score += 15;
    }
    
    // Volume data quality
    if (coin.total_volume || coin.quotes?.USD?.volume_24h || coin.metrics?.market_data?.real_volume_last_24_hours) {
      score += 15;
    }
    
    // Market cap data quality
    if (coin.market_cap || coin.quotes?.USD?.market_cap || coin.metrics?.marketcap?.current_marketcap_usd) {
      score += 10;
    }
    
    // Supply data quality
    if (coin.circulating_supply || coin.metrics?.supply?.circulating) {
      score += 10;
    }
    
    // Source reliability bonus
    const sourceBonus: { [key: string]: number } = {
      'coingecko': 10,
      'coinpaprika': 8,
      'messari': 6
    };
    score += sourceBonus[source] || 0;
    
    return Math.min(100, Math.max(0, score));
  }

  private isHigherQualityData(newCoin: EnhancedCoinData, existingCoin: EnhancedCoinData): boolean {
    return (newCoin.data_quality_score || 0) > (existingCoin.data_quality_score || 0);
  }

  private isValidForAnalysis(coin: EnhancedCoinData): boolean {
    // Filter out invalid coins
    if (!coin.current_price || coin.current_price <= 0) return false;
    if (!coin.market_cap || coin.market_cap < 1000000) return false; // Min $1M market cap
    if (!coin.total_volume || coin.total_volume <= 0) return false;
    
    // Filter out stablecoins
    const stablecoinPatterns = [
      'usd', 'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp',
      'stable', 'peg', 'backed', 'reserve', 'tether', 'dollar'
    ];
    
    const name = coin.name.toLowerCase();
    const symbol = coin.symbol.toLowerCase();
    
    if (stablecoinPatterns.some(pattern => name.includes(pattern) || symbol.includes(pattern))) {
      return false;
    }
    
    // Filter out wrapped tokens
    const wrappedPatterns = ['wrapped', 'weth', 'wbtc', 'wbnb'];
    if (wrappedPatterns.some(pattern => name.includes(pattern) || symbol.includes(pattern))) {
      return false;
    }
    
    return true;
  }

  // Get enhanced data for a specific coin
  async getEnhancedCoinData(coinId: string): Promise<EnhancedCoinData | null> {
    const sources = await Promise.allSettled([
      this.getCoinGeckoSingleCoin(coinId),
      this.getCoinPaprikaSingleCoin(coinId),
      this.getMessariSingleCoin(coinId)
    ]);

    // Merge data from multiple sources
    let bestCoin: EnhancedCoinData | null = null;
    
    sources.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        if (!bestCoin || this.isHigherQualityData(result.value, bestCoin)) {
          bestCoin = result.value;
        }
      }
    });

    return bestCoin;
  }

  private async getCoinGeckoSingleCoin(coinId: string): Promise<EnhancedCoinData | null> {
    try {
      const url = `${this.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true`;
      const data = await this.rateLimitedFetch(url, 'coingecko_single');
      
      if (!data) return null;
      
      return this.transformCoinGeckoDetailedData(data);
    } catch (error) {
      console.warn(`Failed to fetch detailed CoinGecko data for ${coinId}:`, error);
      return null;
    }
  }

  private async getCoinPaprikaSingleCoin(coinId: string): Promise<EnhancedCoinData | null> {
    try {
      const url = `${this.COINPAPRIKA_BASE}/tickers/${coinId}?quotes=USD`;
      const data = await this.rateLimitedFetch(url, 'coinpaprika_single');
      
      if (!data) return null;
      
      return this.transformCoinPaprikaData(data);
    } catch (error) {
      console.warn(`Failed to fetch detailed CoinPaprika data for ${coinId}:`, error);
      return null;
    }
  }

  private async getMessariSingleCoin(coinId: string): Promise<EnhancedCoinData | null> {
    try {
      const url = `${this.MESSARI_BASE}/assets/${coinId}/metrics`;
      const data = await this.rateLimitedFetch(url, 'messari_single');
      
      if (!data?.data) return null;
      
      return this.transformMessariData(data.data);
    } catch (error) {
      console.warn(`Failed to fetch detailed Messari data for ${coinId}:`, error);
      return null;
    }
  }

  private transformCoinGeckoDetailedData(coin: any): EnhancedCoinData {
    const marketData = coin.market_data || {};
    
    return {
      id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
      image: coin.image?.large || coin.image?.small || '',
      current_price: marketData.current_price?.usd || 0,
      market_cap: marketData.market_cap?.usd || 0,
      market_cap_rank: coin.market_cap_rank || 0,
      fully_diluted_valuation: marketData.fully_diluted_valuation?.usd || 0,
      total_volume: marketData.total_volume?.usd || 0,
      high_24h: marketData.high_24h?.usd || 0,
      low_24h: marketData.low_24h?.usd || 0,
      price_change_24h: marketData.price_change_24h || 0,
      price_change_percentage_24h: marketData.price_change_percentage_24h || 0,
      price_change_percentage_1h: marketData.price_change_percentage_1h || 0,
      price_change_percentage_7d: marketData.price_change_percentage_7d || 0,
      price_change_percentage_30d: marketData.price_change_percentage_30d || 0,
      price_change_percentage_1y: marketData.price_change_percentage_1y || 0,
      market_cap_change_24h: marketData.market_cap_change_24h || 0,
      market_cap_change_percentage_24h: marketData.market_cap_change_percentage_24h || 0,
      circulating_supply: marketData.circulating_supply || 0,
      total_supply: marketData.total_supply || 0,
      max_supply: marketData.max_supply || null,
      circulating_supply_percentage: marketData.max_supply ? 
        (marketData.circulating_supply / marketData.max_supply) * 100 : undefined,
      ath: marketData.ath?.usd || 0,
      ath_change_percentage: marketData.ath_change_percentage?.usd || 0,
      ath_date: marketData.ath_date?.usd || new Date().toISOString(),
      atl: marketData.atl?.usd || 0,
      atl_change_percentage: marketData.atl_change_percentage?.usd || 0,
      atl_date: marketData.atl_date?.usd || new Date().toISOString(),
      roi: coin.roi,
      last_updated: coin.last_updated || new Date().toISOString(),
      sparkline_in_7d: marketData.sparkline_7d || { price: [] },
      sparkline_in_24h: { price: [] },
      
      // Enhanced metrics
      developer_score: coin.developer_score || 0,
      community_score: coin.community_score || 0,
      liquidity_score: coin.liquidity_score || 0,
      public_interest_score: coin.public_interest_score || 0,
      
      tickers: coin.tickers || [],
      data_sources: ['CoinGecko'],
      data_quality_score: this.calculateDataQuality(coin, 'coingecko'),
      last_updated_source: 'CoinGecko'
    };
  }

  // Helper methods for network and contract detection
  private detectNetwork(coin: any): string | undefined {
    // Common network detection based on coin data
    const symbol = coin.symbol?.toLowerCase();
    const id = coin.id?.toLowerCase();
    const name = coin.name?.toLowerCase();
    
    // Native tokens
    if (symbol === 'eth' || id === 'ethereum') return 'Ethereum';
    if (symbol === 'bnb' || id === 'binancecoin') return 'BNB Chain';
    if (symbol === 'matic' || id === 'matic-network') return 'Polygon';
    if (symbol === 'avax' || id === 'avalanche-2') return 'Avalanche';
    if (symbol === 'sol' || id === 'solana') return 'Solana';
    if (symbol === 'ada' || id === 'cardano') return 'Cardano';
    if (symbol === 'dot' || id === 'polkadot') return 'Polkadot';
    if (symbol === 'atom' || id === 'cosmos') return 'Cosmos';
    if (symbol === 'near' || id === 'near') return 'NEAR Protocol';
    if (symbol === 'ftm' || id === 'fantom') return 'Fantom';
    if (symbol === 'one' || id === 'harmony') return 'Harmony';
    if (symbol === 'cro' || id === 'crypto-com-chain') return 'Cronos';
    
    // ERC-20 tokens (most common)
    if (coin.platforms?.ethereum || coin.contract_address) return 'Ethereum';
    
    // BSC tokens
    if (coin.platforms?.['binance-smart-chain']) return 'BNB Chain';
    
    // Polygon tokens
    if (coin.platforms?.['polygon-pos']) return 'Polygon';
    
    // Other networks
    if (coin.platforms?.avalanche) return 'Avalanche';
    if (coin.platforms?.solana) return 'Solana';
    if (coin.platforms?.fantom) return 'Fantom';
    if (coin.platforms?.arbitrum) return 'Arbitrum';
    if (coin.platforms?.optimism) return 'Optimism';
    
    return undefined;
  }

  private extractContractAddress(coin: any): string | undefined {
    // Extract contract address from various sources
    if (coin.contract_address) return coin.contract_address;
    if (coin.platforms?.ethereum) return coin.platforms.ethereum;
    if (coin.platforms?.['binance-smart-chain']) return coin.platforms['binance-smart-chain'];
    if (coin.platforms?.['polygon-pos']) return coin.platforms['polygon-pos'];
    if (coin.platforms?.avalanche) return coin.platforms.avalanche;
    if (coin.platforms?.solana) return coin.platforms.solana;
    if (coin.platforms?.fantom) return coin.platforms.fantom;
    if (coin.platforms?.arbitrum) return coin.platforms.arbitrum;
    if (coin.platforms?.optimism) return coin.platforms.optimism;
    
    return undefined;
  }

  private isNativeToken(symbol: string, id: string): boolean {
    const nativeTokens = [
      'btc', 'eth', 'bnb', 'matic', 'avax', 'sol', 'ada', 'dot', 
      'atom', 'near', 'ftm', 'one', 'cro', 'ltc', 'bch', 'xrp',
      'xlm', 'algo', 'egld', 'hbar', 'icp', 'vet', 'theta',
      'fil', 'trx', 'eos', 'xtz', 'neo', 'waves', 'zil'
    ];
    
    return nativeTokens.includes(symbol?.toLowerCase()) || 
           nativeTokens.includes(id?.toLowerCase());
  }

  private detectNetworkFromSymbol(symbol: string, id: string): string | undefined {
    // Common network detection based on coin data
    
    // Native tokens
    if (symbol === 'eth' || id === 'ethereum') return 'Ethereum';
    if (symbol === 'bnb' || id === 'binancecoin') return 'BNB Chain';
    if (symbol === 'matic' || id === 'matic-network') return 'Polygon';
    if (symbol === 'avax' || id === 'avalanche-2') return 'Avalanche';
    if (symbol === 'sol' || id === 'solana') return 'Solana';
    if (symbol === 'ada' || id === 'cardano') return 'Cardano';
    if (symbol === 'dot' || id === 'polkadot') return 'Polkadot';
    if (symbol === 'atom' || id === 'cosmos') return 'Cosmos';
    if (symbol === 'near' || id === 'near') return 'NEAR Protocol';
    if (symbol === 'ftm' || id === 'fantom') return 'Fantom';
    if (symbol === 'one' || id === 'harmony') return 'Harmony';
    if (symbol === 'cro' || id === 'crypto-com-chain') return 'Cronos';
    
    // ERC-20 tokens (most common)
    const name = symbol?.toLowerCase();
    if (name.includes('ethereum') || name.includes('matic') || name.includes('polygon')) return 'Ethereum';
    
    // BSC tokens
    if (name.includes('binance') || name.includes('bnb')) return 'BNB Chain';
    
    // Polygon tokens
    if (name.includes('matic') || name.includes('polygon')) return 'Polygon';
    
    // Other networks
    if (name.includes('avalanche') || name.includes('avax')) return 'Avalanche';
    if (name.includes('solana')) return 'Solana';
    if (name.includes('fantom')) return 'Fantom';
    if (name.includes('arbitrum')) return 'Arbitrum';
    if (name.includes('optimism')) return 'Optimism';
    
    return undefined;
  }
}

// Export singleton instance
export const enhancedDataSources = new EnhancedDataSources(); 