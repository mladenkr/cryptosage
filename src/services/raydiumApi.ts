import axios from 'axios';
import { Coin } from '../types';
import { cacheService } from './cacheService';

// Raydium API endpoints based on official documentation
const RAYDIUM_V3_API = 'https://api-v3.raydium.io';
const RAYDIUM_V2_API = 'https://api.raydium.io/v2';

// Create API instances for different Raydium services
const v3Api = axios.create({
  baseURL: RAYDIUM_V3_API,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

const v2Api = axios.create({
  baseURL: RAYDIUM_V2_API,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add error interceptors
[v3Api, v2Api].forEach(api => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('Raydium API Error:', error);
      throw error;
    }
  );
});

// Convert Raydium pool data to Coin format for compatibility with existing system
const convertRaydiumPoolToCoin = (poolData: any): Coin | null => {
  try {
    // Handle different pool formats from Raydium API
    const poolId = poolData.id || poolData.ammId || poolData.address;
    const baseMint = poolData.baseMint || poolData.mint1;
    const quoteMint = poolData.quoteMint || poolData.mint2;
    const baseToken = poolData.baseToken || poolData.token1;
    const quoteToken = poolData.quoteToken || poolData.token2;
    
    // Define stablecoins to exclude from recommendations
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'UST', 'USDH', 'TUSD', 'GUSD', 'PAX', 'SUSD'];
    const majorBaseTokens = ['SOL', 'WSOL'];
    
    // Determine which token to use as the main token
    let mainToken = baseToken;
    let mainMint = baseMint;
    let price = parseFloat(poolData.price || poolData.currentPrice || '0');
    
    // Prefer the token that is NOT a stablecoin
    const baseIsStablecoin = stablecoins.includes(baseToken?.symbol?.toUpperCase());
    const quoteIsStablecoin = stablecoins.includes(quoteToken?.symbol?.toUpperCase());
    const baseIsMajorBase = majorBaseTokens.includes(baseToken?.symbol?.toUpperCase());
    const quoteIsMajorBase = majorBaseTokens.includes(quoteToken?.symbol?.toUpperCase());
    
    // Skip if both tokens are stablecoins
    if (baseIsStablecoin && quoteIsStablecoin) {
      return null;
    }
    
    // Skip if both tokens are major base tokens
    if (baseIsMajorBase && quoteIsMajorBase) {
      return null;
    }
    
    // Prefer non-stablecoin token
    if (quoteToken && !quoteIsStablecoin && baseIsStablecoin) {
      mainToken = quoteToken;
      mainMint = quoteMint;
      // Invert price if we're using quote token
      price = price > 0 ? 1 / price : 0;
    } else if (quoteToken && !quoteIsMajorBase && baseIsMajorBase) {
      mainToken = quoteToken;
      mainMint = quoteMint;
      price = price > 0 ? 1 / price : 0;
    }
    
    const volume24h = parseFloat(poolData.volume24h || poolData.day?.volume || '0');
    const tvl = parseFloat(poolData.tvl || poolData.liquidity || '0');
    const priceChange24h = parseFloat(poolData.priceChange24h || poolData.day?.priceChangePercent || '0');
    
    // Get token image with fallback
    const tokenImage = mainToken?.logoURI || mainToken?.image;
    const fallbackImage = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
    
    return {
      id: mainMint || poolId,
      symbol: (mainToken?.symbol || 'UNKNOWN').toLowerCase(),
      name: mainToken?.name || 'Unknown Token',
      image: tokenImage || fallbackImage,
      current_price: price,
      market_cap: tvl * 2, // Rough estimate
      market_cap_rank: 0,
      fully_diluted_valuation: tvl * 3,
      total_volume: volume24h,
      high_24h: price * 1.1,
      low_24h: price * 0.9,
      price_change_24h: price * (priceChange24h / 100),
      price_change_percentage_24h: priceChange24h,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: priceChange24h,
      circulating_supply: 0,
      total_supply: 0,
      max_supply: null,
      ath: price * 1.5,
      ath_change_percentage: -25,
      ath_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      atl: price * 0.3,
      atl_change_percentage: 200,
      atl_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      roi: null,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: [] },
      sparkline_in_24h: { price: [] }
    };
  } catch (error) {
    console.error('Error converting Raydium pool data:', error);
    return null;
  }
};

class RaydiumApiService {
  // Get CLMM (Concentrated Liquidity) pools from Raydium V2 API
  async getCLMMPools(limit: number = 100): Promise<any[]> {
    try {
      console.log('Fetching CLMM pools from Raydium...');
      const response = await v2Api.get('/ammV3/ammPools');
      
      if (!response.data?.data || !Array.isArray(response.data.data)) {
        console.warn('Invalid CLMM response format');
        return [];
      }
      
      // Sort by TVL descending and take top pools
      const sortedPools = response.data.data
        .filter((pool: any) => pool && parseFloat(pool.tvl || '0') > 100) // Minimum $100 TVL
        .sort((a: any, b: any) => parseFloat(b.tvl || '0') - parseFloat(a.tvl || '0'))
        .slice(0, limit);
      
      console.log(`Fetched ${sortedPools.length} CLMM pools`);
      return sortedPools;
    } catch (error) {
      console.error('Failed to fetch CLMM pools:', error);
      return [];
    }
  }

  // Get Constant Product (CP) pools from Raydium V2 API
  async getCPPools(limit: number = 100): Promise<any[]> {
    try {
      console.log('Fetching CP pools from Raydium...');
      const response = await v2Api.get('/main/pairs');
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('Invalid CP pools response format');
        return [];
      }
      
      // Sort by volume descending and take top pools
      const sortedPools = response.data
        .filter((pool: any) => pool && parseFloat(pool.volume_24h || '0') > 1000) // Minimum $1k volume
        .sort((a: any, b: any) => parseFloat(b.volume_24h || '0') - parseFloat(a.volume_24h || '0'))
        .slice(0, limit);
      
      console.log(`Fetched ${sortedPools.length} CP pools`);
      return sortedPools;
    } catch (error) {
      console.error('Failed to fetch CP pools:', error);
      return [];
    }
  }

  // Get farm information (for additional token data)
  async getFarmInfo(): Promise<any[]> {
    try {
      console.log('Fetching farm info from Raydium...');
      const response = await v2Api.get('/main/farm/info');
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('Invalid farm info response format');
        return [];
      }
      
      console.log(`Fetched ${response.data.length} farms`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch farm info:', error);
      return [];
    }
  }

  // Main method to get Raydium coins
  async getRaydiumCoins(limit: number = 50): Promise<Coin[]> {
    const cacheKey = `raydium_coins_${limit}`;
    
    try {
      // Check cache first
      const cached = cacheService.getCachedMarketData(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`Using cached Raydium coins: ${cached.length} coins`);
        return cached;
      }

      console.log('Fetching fresh Raydium data...');
      
      // Fetch data from multiple endpoints in parallel
      const [clmmPools, cpPools] = await Promise.allSettled([
        this.getCLMMPools(limit * 2),
        this.getCPPools(limit * 2)
      ]);

      const allPools: any[] = [];
      
      // Process CLMM pools
      if (clmmPools.status === 'fulfilled') {
        allPools.push(...clmmPools.value);
      }
      
      // Process CP pools
      if (cpPools.status === 'fulfilled') {
        allPools.push(...cpPools.value);
      }

      if (allPools.length === 0) {
        console.warn('No pools fetched from any Raydium endpoint');
        return [];
      }

      // Convert pools to coins and filter out invalid ones
      const coins = allPools
        .map(convertRaydiumPoolToCoin)
        .filter((coin): coin is Coin => coin !== null)
        .filter((coin, index, self) => 
          // Remove duplicates based on symbol
          index === self.findIndex(c => c.symbol === coin.symbol)
        );

      if (coins.length === 0) {
        console.warn('No valid coins after conversion and filtering');
        return [];
      }

      // Sort by a combination of volume and TVL for diversity
      const sortedCoins = coins.sort((a, b) => {
        const scoreA = (a.total_volume || 0) + (a.market_cap || 0) * 0.1;
        const scoreB = (b.total_volume || 0) + (b.market_cap || 0) * 0.1;
        return scoreB - scoreA;
      });

      // Take the requested number of coins
      const finalCoins = sortedCoins.slice(0, limit);
      
      // Set market cap ranks
      finalCoins.forEach((coin, index) => {
        coin.market_cap_rank = index + 1;
      });

      console.log(`Successfully processed ${finalCoins.length} Raydium coins`);
      
      // Cache the results for 5 minutes
      cacheService.cacheMarketData(cacheKey, finalCoins);
      
      return finalCoins;
    } catch (error) {
      console.error('Error in getRaydiumCoins:', error);
      
      // Try to return cached data even if expired
      const cached = cacheService.getCachedMarketData(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('Returning expired cached data as fallback');
        return cached;
      }
      
      return [];
    }
  }

  // Get trending Raydium coins (high volume, recent activity)
  async getTrendingRaydiumCoins(limit: number = 20): Promise<Coin[]> {
    const cacheKey = `trending_raydium_coins_${limit}`;
    
    try {
      // Check cache first
      const cached = cacheService.getCachedMarketData(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`Using cached trending Raydium coins: ${cached.length} coins`);
        return cached;
      }

      console.log('Fetching trending Raydium data...');
      
      // Get more pools to find trending ones
      const allCoins = await this.getRaydiumCoins(limit * 3);
      
      if (allCoins.length === 0) {
        return [];
      }

      // Sort by trending factors: volume, price change, and recent activity
      const trendingCoins = allCoins
        .filter(coin => Math.abs(coin.price_change_percentage_24h) > 1) // Some price movement
        .sort((a, b) => {
          // Trending score: volume weight + price change weight + volatility
          const scoreA = (a.total_volume || 0) * 0.6 + 
                        Math.abs(a.price_change_percentage_24h) * 1000 * 0.3 +
                        ((a.high_24h - a.low_24h) / a.current_price) * 10000 * 0.1;
          const scoreB = (b.total_volume || 0) * 0.6 + 
                        Math.abs(b.price_change_percentage_24h) * 1000 * 0.3 +
                        ((b.high_24h - b.low_24h) / b.current_price) * 10000 * 0.1;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      console.log(`Found ${trendingCoins.length} trending Raydium coins`);
      
      // Cache for 3 minutes (shorter cache for trending data)
      cacheService.cacheMarketData(cacheKey, trendingCoins);
      
      return trendingCoins;
    } catch (error) {
      console.error('Error in getTrendingRaydiumCoins:', error);
      
      // Fallback to regular coins if trending fails
      const regularCoins = await this.getRaydiumCoins(limit);
      return regularCoins.slice(0, limit);
    }
  }

  // Clear all Raydium-related cache
  clearCache(): void {
    // Use the cache service's built-in clear methods
    cacheService.clearMarketDataCache();
    console.log('Cleared Raydium cache entries');
  }
}

// Export singleton instance
export const raydiumApiService = new RaydiumApiService();
export default raydiumApiService; 