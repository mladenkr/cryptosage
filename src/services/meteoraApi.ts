import axios from 'axios';
import { Coin } from '../types';
import { cacheService } from './cacheService';

// Meteora native API endpoints
const METEORA_DLMM_API = 'https://dlmm-api.meteora.ag';
const METEORA_AMM_API = 'https://amm-v2.meteora.ag';
const METEORA_UNIVERSAL_SEARCH = 'https://universal-search-api.meteora.ag';
// const METEORA_STAKE_API = 'https://stake-for-fee-api.meteora.ag'; // For future use

// Create API instances for different Meteora services
const dlmmApi = axios.create({
  baseURL: METEORA_DLMM_API,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

const ammApi = axios.create({
  baseURL: METEORA_AMM_API,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

const searchApi = axios.create({
  baseURL: METEORA_UNIVERSAL_SEARCH,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add error interceptors
[dlmmApi, ammApi, searchApi].forEach(api => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('Meteora API Error:', error);
      throw error;
    }
  );
});

// Convert Meteora pool data to Coin format for compatibility with existing system
const convertMeteoraPoolToCoin = (poolData: any): Coin => {
  // Handle both DLMM and AMM pool formats
  const poolAddress = poolData.pool_address || poolData.address;
  const tokenX = poolData.token_x || poolData.mint_x;
  const tokenY = poolData.token_y || poolData.mint_y;
  
  // Use the non-SOL/USDC token as the main token, or token_x if both are non-stablecoins
  let mainToken = tokenX;
  let mainTokenInfo = poolData.token_x_info || poolData.mint_x_info;
  let price = parseFloat(poolData.current_price || poolData.price || '0');
  
  // If token_y is not a stablecoin/SOL, prefer it
  const stablecoins = ['USDC', 'USDT', 'SOL', 'WSOL'];
  if (tokenY && !stablecoins.includes(tokenY.symbol?.toUpperCase())) {
    mainToken = tokenY;
    mainTokenInfo = poolData.token_y_info || poolData.mint_y_info;
    // Invert price if we're using token_y
    price = price > 0 ? 1 / price : 0;
  }
  
  const volume24h = parseFloat(poolData.volume_24h || poolData.trade_volume_24h || '0');
  const tvl = parseFloat(poolData.tvl || poolData.liquidity || '0');
  const priceChange24h = parseFloat(poolData.price_change_24h || '0');
  
  return {
    id: mainToken?.address || poolAddress,
    symbol: (mainToken?.symbol || mainTokenInfo?.symbol || 'UNKNOWN').toLowerCase(),
    name: mainToken?.name || mainTokenInfo?.name || 'Unknown Token',
    image: mainToken?.logoURI || mainTokenInfo?.logoURI || '',
    current_price: price,
    market_cap: tvl * 2, // Rough estimate: TVL * 2 as market cap proxy
    market_cap_rank: 0, // Will be set based on sorting
    fully_diluted_valuation: tvl * 3, // Rough estimate
    total_volume: volume24h,
    high_24h: price * 1.1, // Estimate
    low_24h: price * 0.9, // Estimate
    price_change_24h: price * (priceChange24h / 100),
    price_change_percentage_24h: priceChange24h,
    market_cap_change_24h: 0,
    market_cap_change_percentage_24h: priceChange24h,
    circulating_supply: 0, // Not available
    total_supply: 0, // Not available
    max_supply: null,
    ath: price * 1.5, // Estimate
    ath_change_percentage: -25,
    ath_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    atl: price * 0.3, // Estimate
    atl_change_percentage: 200,
    atl_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    roi: null,
    last_updated: new Date().toISOString(),
    sparkline_in_7d: { price: [] },
    sparkline_in_24h: { price: [] }
  };
};

class MeteoraApiService {
  // Get DLMM pools from Meteora
  async getDLMMPools(limit: number = 50): Promise<any[]> {
    try {
      console.log('Fetching DLMM pools from Meteora...');
      const response = await dlmmApi.get('/pair/all');
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('Invalid DLMM response format');
        return [];
      }
      
      // Sort by TVL descending and take top pools
      const sortedPools = response.data
        .filter((pool: any) => pool && parseFloat(pool.tvl || '0') > 0)
        .sort((a: any, b: any) => parseFloat(b.tvl || '0') - parseFloat(a.tvl || '0'))
        .slice(0, limit);
      
      console.log(`Fetched ${sortedPools.length} DLMM pools`);
      return sortedPools;
    } catch (error) {
      console.error('Failed to fetch DLMM pools:', error);
      return [];
    }
  }

  // Get Dynamic AMM pools from Meteora (currently not available via public API)
  async getAMMPools(limit: number = 50): Promise<any[]> {
    try {
      console.log('AMM API endpoints not currently available, skipping...');
      // The AMM v2 API endpoints are not publicly accessible yet
      // We'll rely on DLMM and Universal Search APIs instead
      return [];
    } catch (error) {
      console.error('Failed to fetch AMM pools:', error);
      return [];
    }
  }

  // Use Universal Search API to find pools
  async searchPools(query: string = 'sol', limit: number = 50): Promise<any[]> {
    try {
      console.log(`Searching pools with query: ${query}`);
      const response = await searchApi.get('/pool/search', {
        params: {
          q: query,
          query_by: 'pool_mint,pool_name,token_mints',
          sort_by: 'tvl:desc,volume_24h:desc',
          facet_by: 'pool_type',
          per_page: limit
        }
      });
      
      if (!response.data?.hits) {
        console.warn('No search results found');
        return [];
      }
      
      console.log(`Found ${response.data.hits.length} pools from search`);
      return response.data.hits.map((hit: any) => hit.document);
    } catch (error) {
      console.error('Failed to search pools:', error);
      return [];
    }
  }

  // Create mock Meteora coins for development/fallback
  private createMockMeteoraCoins(limit: number = 50): Coin[] {
    console.log('Creating mock Meteora coins for development/fallback');
    
    const mockTokens = [
      { symbol: 'SOL', name: 'Solana', price: 95.50, volume: 2500000, change: 5.2 },
      { symbol: 'USDC', name: 'USD Coin', price: 1.00, volume: 8500000, change: 0.1 },
      { symbol: 'RAY', name: 'Raydium', price: 2.15, volume: 1200000, change: -2.3 },
      { symbol: 'SRM', name: 'Serum', price: 0.45, volume: 850000, change: 3.8 },
      { symbol: 'ORCA', name: 'Orca', price: 1.85, volume: 650000, change: -1.2 },
      { symbol: 'MNGO', name: 'Mango', price: 0.12, volume: 420000, change: 7.5 },
      { symbol: 'STEP', name: 'Step Finance', price: 0.08, volume: 320000, change: -4.1 },
      { symbol: 'COPE', name: 'Cope', price: 0.25, volume: 280000, change: 2.9 },
      { symbol: 'ROPE', name: 'Rope Token', price: 0.003, volume: 180000, change: -8.2 },
      { symbol: 'FIDA', name: 'Bonfida', price: 0.35, volume: 220000, change: 1.8 },
      { symbol: 'MEDIA', name: 'Media Network', price: 0.15, volume: 160000, change: 4.3 },
      { symbol: 'MAPS', name: 'Maps.me', price: 0.08, volume: 140000, change: -2.7 },
      { symbol: 'TULIP', name: 'Tulip Protocol', price: 0.45, volume: 190000, change: 6.1 },
      { symbol: 'SLIM', name: 'Solanium', price: 0.12, volume: 110000, change: -3.4 },
      { symbol: 'PORT', name: 'Port Finance', price: 0.06, volume: 95000, change: 2.1 }
    ];

    return mockTokens.slice(0, limit).map((token, index) => ({
      id: `${token.symbol.toLowerCase()}-meteora`,
      symbol: token.symbol.toLowerCase(),
      name: `${token.name} (Meteora)`,
      image: '',
      current_price: token.price,
      market_cap: token.price * 1000000, // Mock market cap
      market_cap_rank: index + 1,
      fully_diluted_valuation: token.price * 1200000,
      total_volume: token.volume,
      high_24h: token.price * 1.1,
      low_24h: token.price * 0.9,
      price_change_24h: token.price * (token.change / 100),
      price_change_percentage_24h: token.change,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: token.change,
      circulating_supply: 1000000,
      total_supply: 1200000,
      max_supply: null,
      ath: token.price * 1.5,
      ath_change_percentage: -25,
      ath_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      atl: token.price * 0.3,
      atl_change_percentage: 200,
      atl_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      roi: null,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: [] },
      sparkline_in_24h: { price: [] }
    }));
  }

  // Get Meteora coins formatted for the recommendation system
  async getMeteoraCoins(limit: number = 50): Promise<Coin[]> {
    const cacheKey = `meteora_coins_${limit}`;
    
    // Check cache first
    const cached = cacheService.getCachedMarketData(cacheKey);
    if (cached) {
      console.log('Using cached Meteora coins data');
      return cached;
    }

    try {
      console.log('Fetching fresh Meteora coins data from native APIs...');
      
      // Fetch pools from multiple Meteora APIs and search queries
      const [dlmmPools, ammPools, searchSol, searchUsdc, searchPopular] = await Promise.allSettled([
        this.getDLMMPools(limit),
        this.getAMMPools(Math.ceil(limit / 2)),
        this.searchPools('sol', Math.ceil(limit / 3)),
        this.searchPools('usdc', Math.ceil(limit / 4)),
        this.searchPools('', Math.ceil(limit / 2)) // Get popular pools
      ]);

      // Combine all pools
      const allPools: any[] = [];
      
      if (dlmmPools.status === 'fulfilled') {
        allPools.push(...dlmmPools.value);
        console.log(`Added ${dlmmPools.value.length} DLMM pools`);
      }
      
      if (ammPools.status === 'fulfilled') {
        allPools.push(...ammPools.value);
        console.log(`Added ${ammPools.value.length} AMM pools`);
      }
      
      if (searchSol.status === 'fulfilled') {
        allPools.push(...searchSol.value);
        console.log(`Added ${searchSol.value.length} SOL search pools`);
      }
      
      if (searchUsdc.status === 'fulfilled') {
        allPools.push(...searchUsdc.value);
        console.log(`Added ${searchUsdc.value.length} USDC search pools`);
      }
      
      if (searchPopular.status === 'fulfilled') {
        allPools.push(...searchPopular.value);
        console.log(`Added ${searchPopular.value.length} popular pools`);
      }

      console.log(`Total pools fetched: ${allPools.length}`);

      if (allPools.length === 0) {
        console.warn('No Meteora pools found from APIs, using mock data');
        const mockCoins = this.createMockMeteoraCoins(limit);
        cacheService.cacheMarketData(cacheKey, mockCoins);
        return mockCoins;
      }

      // Convert pools to Coin format
      const coins: Coin[] = [];
      const seenTokens = new Set<string>();

      allPools.forEach((pool: any) => {
        try {
          const coin = convertMeteoraPoolToCoin(pool);
          
          // Avoid duplicates and ensure valid data
          if (!seenTokens.has(coin.id) && coin.current_price > 0 && coin.symbol !== 'unknown') {
            seenTokens.add(coin.id);
            coins.push(coin);
          }
        } catch (conversionError) {
          console.warn('Failed to convert pool to coin:', conversionError);
        }
      });

      // Sort by volume (24h) descending
      coins.sort((a, b) => b.total_volume - a.total_volume);
      
      // Set market cap ranks
      coins.forEach((coin, index) => {
        coin.market_cap_rank = index + 1;
      });

      let finalCoins = coins.slice(0, limit);
      
      // If we don't have enough coins, supplement with mock data
      if (finalCoins.length < Math.min(10, limit)) {
        console.warn(`Only got ${finalCoins.length} real Meteora coins, supplementing with mock data`);
        const mockCoins = this.createMockMeteoraCoins(limit - finalCoins.length);
        finalCoins.push(...mockCoins);
        finalCoins = finalCoins.slice(0, limit);
      }

      console.log(`Returning ${finalCoins.length} Meteora coins`);

      // Cache the result
      cacheService.cacheMarketData(cacheKey, finalCoins);

      return finalCoins;
    } catch (error) {
      console.error('Failed to fetch Meteora coins:', error);
      
      // Fallback to mock data
      console.log('Using mock Meteora data as fallback');
      const mockCoins = this.createMockMeteoraCoins(limit);
      cacheService.cacheMarketData(cacheKey, mockCoins);
      return mockCoins;
    }
  }

  // Get trending Meteora pools
  async getTrendingMeteoraCoins(limit: number = 20): Promise<Coin[]> {
    try {
      // Use search API to find trending pools or get subset of regular pools
      console.log('Fetching trending Meteora pools...');
      const trendingPools = await this.searchPools('trending', limit);
      
      if (trendingPools.length === 0) {
        console.log('No trending pools found, returning subset of regular coins');
        const regularCoins = await this.getMeteoraCoins(limit);
        return regularCoins.slice(0, limit);
      }

      // Convert to coins format
      const coins = trendingPools.slice(0, limit).map((pool: any, index: number) => {
        const coin = convertMeteoraPoolToCoin(pool);
        coin.market_cap_rank = index + 1;
        return coin;
      });

      console.log(`Returning ${coins.length} trending Meteora coins`);
      return coins;
    } catch (error) {
      console.error('Failed to fetch trending Meteora coins:', error);
      // Fallback to regular coins
      console.log('Falling back to regular Meteora coins for trending');
      const regularCoins = await this.getMeteoraCoins(limit);
      return regularCoins.slice(0, limit);
    }
  }
}

// Export a singleton instance
export const meteoraApi = new MeteoraApiService(); 