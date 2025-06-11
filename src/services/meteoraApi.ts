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
const convertMeteoraPoolToCoin = (poolData: any): Coin | null => {
  // Handle both DLMM and AMM pool formats
  const poolAddress = poolData.pool_address || poolData.address;
  const tokenX = poolData.token_x || poolData.mint_x;
  const tokenY = poolData.token_y || poolData.mint_y;
  
  // Use the non-stablecoin token as the main token, prioritizing non-stablecoins
  let mainToken = tokenX;
  let mainTokenInfo = poolData.token_x_info || poolData.mint_x_info;
  let price = parseFloat(poolData.current_price || poolData.price || '0');
  
  // Define stablecoins to exclude from recommendations (keep filtering these)
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'UST', 'USDH', 'TUSD', 'GUSD', 'PAX', 'SUSD'];
  // Only exclude major base tokens when they appear as both tokens in a pair (to avoid SOL/SOL pairs etc.)
  const majorBaseTokens = ['SOL', 'WSOL'];
  const excludedTokens = [...stablecoins];
  
  // Prefer the token that is NOT a stablecoin
  const tokenXIsStablecoin = stablecoins.includes(tokenX?.symbol?.toUpperCase());
  const tokenYIsStablecoin = stablecoins.includes(tokenY?.symbol?.toUpperCase());
  const tokenXIsMajorBase = majorBaseTokens.includes(tokenX?.symbol?.toUpperCase());
  const tokenYIsMajorBase = majorBaseTokens.includes(tokenY?.symbol?.toUpperCase());
  
  // Skip if both tokens are stablecoins
  if (tokenXIsStablecoin && tokenYIsStablecoin) {
    return null; // Will be filtered out
  }
  
  // Skip if both tokens are major base tokens (like SOL/SOL pairs)
  if (tokenXIsMajorBase && tokenYIsMajorBase) {
    return null; // Will be filtered out
  }
  
  // Prefer non-stablecoin token
  if (tokenY && !tokenYIsStablecoin && tokenXIsStablecoin) {
    mainToken = tokenY;
    mainTokenInfo = poolData.token_y_info || poolData.mint_y_info;
    // Invert price if we're using token_y
    price = price > 0 ? 1 / price : 0;
  } else if (tokenX && !tokenXIsStablecoin && tokenYIsStablecoin) {
    // Keep tokenX as mainToken
    mainToken = tokenX;
    mainTokenInfo = poolData.token_x_info || poolData.mint_x_info;
  } else if (tokenY && !tokenYIsMajorBase && tokenXIsMajorBase) {
    // Prefer non-major-base token
    mainToken = tokenY;
    mainTokenInfo = poolData.token_y_info || poolData.mint_y_info;
    price = price > 0 ? 1 / price : 0;
  } else if (tokenX && !tokenXIsMajorBase && tokenYIsMajorBase) {
    // Keep tokenX as mainToken
    mainToken = tokenX;
    mainTokenInfo = poolData.token_x_info || poolData.mint_x_info;
  }
  // If neither token is excluded, keep the default (tokenX)
  
  const volume24h = parseFloat(poolData.volume_24h || poolData.trade_volume_24h || '0');
  const tvl = parseFloat(poolData.tvl || poolData.liquidity || '0');
  const priceChange24h = parseFloat(poolData.price_change_24h || '0');
  
  // Get token image with fallback to a default Solana token icon
  const tokenImage = mainToken?.logoURI || mainTokenInfo?.logoURI || mainToken?.image || mainTokenInfo?.image;
  const fallbackImage = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'; // SOL logo as fallback
  
  return {
    id: mainToken?.address || poolAddress,
    symbol: (mainToken?.symbol || mainTokenInfo?.symbol || 'UNKNOWN').toLowerCase(),
    name: mainToken?.name || mainTokenInfo?.name || 'Unknown Token',
    image: tokenImage || fallbackImage,
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
      
      // Fetch pools from multiple Meteora APIs and search queries with more aggressive fetching
      const [dlmmPools, searchSol, searchUsdc, searchPopular, searchBtc, searchEth, searchMeme, searchDefi] = await Promise.allSettled([
        this.getDLMMPools(limit * 3), // Get even more DLMM pools
        this.searchPools('sol', limit),
        this.searchPools('usdc', limit),
        this.searchPools('', limit * 2), // Get more popular pools
        this.searchPools('btc', limit),
        this.searchPools('eth', limit),
        this.searchPools('meme', Math.ceil(limit / 2)), // Search for meme tokens
        this.searchPools('defi', Math.ceil(limit / 2))  // Search for DeFi tokens
      ]);

      // Combine all pools
      const allPools: any[] = [];
      
      if (dlmmPools.status === 'fulfilled') {
        allPools.push(...dlmmPools.value);
        console.log(`Added ${dlmmPools.value.length} DLMM pools`);
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
      
      if (searchBtc.status === 'fulfilled') {
        allPools.push(...searchBtc.value);
        console.log(`Added ${searchBtc.value.length} BTC search pools`);
      }
      
      if (searchEth.status === 'fulfilled') {
        allPools.push(...searchEth.value);
        console.log(`Added ${searchEth.value.length} ETH search pools`);
      }
      
      if (searchMeme.status === 'fulfilled') {
        allPools.push(...searchMeme.value);
        console.log(`Added ${searchMeme.value.length} meme token pools`);
      }
      
      if (searchDefi.status === 'fulfilled') {
        allPools.push(...searchDefi.value);
        console.log(`Added ${searchDefi.value.length} DeFi token pools`);
      }

      console.log(`Total pools fetched: ${allPools.length}`);

      if (allPools.length === 0) {
        console.error('No Meteora pools found from APIs - returning empty array');
        return [];
      }

      // Convert pools to Coin format with quality filtering
      const coins: Coin[] = [];
      const seenTokens = new Set<string>();

      allPools.forEach((pool: any) => {
        try {
          const coin = convertMeteoraPoolToCoin(pool);
          
          // Skip if conversion returned null (excluded tokens like stablecoins)
          if (!coin) {
            return;
          }
          
          // Apply more relaxed quality filters to get more Meteora tokens (stablecoins already filtered in conversion)
          const hasValidPrice = coin.current_price > 0;
          const hasMinimumVolume = coin.total_volume > 100; // Reduced from $1k to $100 daily volume
          const hasMinimumMarketCap = coin.market_cap > 1000; // Reduced from $10k to $1k market cap proxy
          const hasAnyChange = Math.abs(coin.price_change_percentage_24h) >= 0; // Accept any price change (including 0)
          const isNotUnknown = coin.symbol !== 'unknown' && coin.name !== 'Unknown Token';
          
          // Avoid duplicates and ensure valid data (much more permissive)
          if (!seenTokens.has(coin.id) && hasValidPrice && hasMinimumVolume && 
              hasMinimumMarketCap && hasAnyChange && isNotUnknown) {
            seenTokens.add(coin.id);
            coins.push(coin);
          }
        } catch (conversionError) {
          console.warn('Failed to convert pool to coin:', conversionError);
        }
      });

      // Multi-factor sorting: prioritize high price change, high volume, and high market cap
      coins.sort((a, b) => {
        // Calculate composite score: 40% price change volatility, 30% volume, 30% market cap
        const aScore = (Math.abs(a.price_change_percentage_24h) * 0.4) + 
                      (Math.log10(a.total_volume + 1) * 0.3) + 
                      (Math.log10(a.market_cap + 1) * 0.3);
        const bScore = (Math.abs(b.price_change_percentage_24h) * 0.4) + 
                      (Math.log10(b.total_volume + 1) * 0.3) + 
                      (Math.log10(b.market_cap + 1) * 0.3);
        return bScore - aScore;
      });
      
      // Set market cap ranks
      coins.forEach((coin, index) => {
        coin.market_cap_rank = index + 1;
      });

      // Log top coins for debugging
      if (coins.length > 0) {
        console.log('Top 5 Meteora coins by composite score:', coins.slice(0, 5).map(c => ({
          name: c.name,
          symbol: c.symbol,
          volume: c.total_volume,
          marketCap: c.market_cap,
          priceChange: c.price_change_percentage_24h.toFixed(2) + '%',
          price: c.current_price
        })));
      }

      let finalCoins = coins.slice(0, limit);
      
      // Log if we have fewer coins than expected
      if (finalCoins.length < Math.min(10, limit)) {
        console.warn(`Only got ${finalCoins.length} real Meteora coins (no mock data used)`);
      }

      console.log(`Returning ${finalCoins.length} Meteora coins`);

      // Cache the result
      cacheService.cacheMarketData(cacheKey, finalCoins);

      return finalCoins;
    } catch (error) {
      console.error('Failed to fetch Meteora coins:', error);
      
      // Return empty array instead of mock data
      console.error('No fallback data - returning empty array');
      return [];
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
      const coins = trendingPools.slice(0, limit)
        .map((pool: any) => convertMeteoraPoolToCoin(pool))
        .filter((coin): coin is Coin => coin !== null)
        .map((coin, index) => {
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