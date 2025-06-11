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
const convertRaydiumPoolToCoin = (poolData: any, poolType: 'CLMM' | 'CP' = 'CP'): Coin | null => {
  try {
    // Handle different pool formats from Raydium API
    let poolId, baseMint, price, volume24h, tvl, priceChange24h;
    let tokenSymbol, tokenName;
    
    if (poolType === 'CP') {
      // CP Pool format from /main/pairs
      poolId = poolData.ammId;
      baseMint = poolData.baseMint;
      // quoteMint = poolData.quoteMint; // Available for future use
      price = parseFloat(poolData.price || '0');
      volume24h = parseFloat(poolData.volume24h || '0');
      tvl = parseFloat(poolData.liquidity || '0');
      priceChange24h = 0; // Not available in CP pools
      
      // Extract token info from pool name (e.g., "USDT/USDC" -> prefer non-stablecoin)
      const poolName = poolData.name || '';
      const tokens = poolName.split('/');
      
      // Define stablecoins to exclude from recommendations
      const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'UST', 'USDH', 'TUSD', 'GUSD', 'PAX', 'SUSD'];
      const majorBaseTokens = ['SOL', 'WSOL'];
      
      // Skip if both tokens are stablecoins
      if (tokens.length === 2) {
        const token1IsStablecoin = stablecoins.includes(tokens[0].toUpperCase());
        const token2IsStablecoin = stablecoins.includes(tokens[1].toUpperCase());
        
        if (token1IsStablecoin && token2IsStablecoin) {
          return null; // Skip stablecoin pairs
        }
        
        // Prefer non-stablecoin token
        if (!token1IsStablecoin && token2IsStablecoin) {
          tokenSymbol = tokens[0];
        } else if (token1IsStablecoin && !token2IsStablecoin) {
          tokenSymbol = tokens[1];
          // Invert price for quote token
          price = price > 0 ? 1 / price : 0;
        } else {
          // Neither is stablecoin, prefer non-major-base token
          const token1IsMajorBase = majorBaseTokens.includes(tokens[0].toUpperCase());
          const token2IsMajorBase = majorBaseTokens.includes(tokens[1].toUpperCase());
          
          if (!token1IsMajorBase && token2IsMajorBase) {
            tokenSymbol = tokens[0];
          } else if (token1IsMajorBase && !token2IsMajorBase) {
            tokenSymbol = tokens[1];
            price = price > 0 ? 1 / price : 0;
          } else {
            // Both are similar type, prefer the one with higher volume or just use first
            tokenSymbol = tokens[0]; // Default to first token
          }
        }
      } else {
        tokenSymbol = tokens[0] || 'UNKNOWN';
      }
      
      tokenName = `${tokenSymbol} Token`;
    } else {
      // CLMM Pool format from /ammV3/ammPools
      poolId = poolData.id;
      baseMint = poolData.mintA;
      // quoteMint = poolData.mintB; // Not currently used but available for future features
      price = 0; // Price calculation would need additional token data
      volume24h = 0; // Not directly available
      tvl = parseFloat(poolData.tvl || '0');
      priceChange24h = 0;
      
      // For CLMM pools, we need to fetch token metadata separately
      // For now, create a generic token based on mint address
      tokenSymbol = baseMint?.slice(-8) || 'UNKNOWN'; // Use last 8 chars of mint as symbol
      tokenName = `Token ${tokenSymbol}`;
    }
    
    // Skip pools with insufficient data (be more lenient)
    if (!poolId || !tokenSymbol || tokenSymbol === 'UNKNOWN') {
      return null;
    }
    
    // Only skip pools with extremely problematic prices
    if (price && (price < 1e-18 || price > 1e18)) {
      console.log(`Skipping pool ${tokenSymbol} with extreme price: ${price}`);
      return null;
    }
    
    // Allow pools with zero volume but require some liquidity
    if (tvl <= 0) {
      return null;
    }
    
    // Generate fallback image
    const fallbackImage = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
    
    return {
      id: baseMint || poolId,
      symbol: tokenSymbol.toLowerCase(),
      name: tokenName,
      image: fallbackImage,
      current_price: price || 1, // Default to $1 if no price
      market_cap: tvl * 2, // Rough estimate
      market_cap_rank: 0,
      fully_diluted_valuation: tvl * 3,
      total_volume: volume24h,
      high_24h: (price || 1) * 1.1,
      low_24h: (price || 1) * 0.9,
      price_change_24h: (price || 1) * (priceChange24h / 100),
      price_change_percentage_24h: priceChange24h,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: priceChange24h,
      circulating_supply: 0,
      total_supply: 0,
      max_supply: null,
      ath: (price || 1) * 1.5,
      ath_change_percentage: -25,
      ath_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      atl: (price || 1) * 0.3,
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
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await v2Api.get('/ammV3/ammPools', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.data?.data || !Array.isArray(response.data.data)) {
        console.warn('Invalid CLMM response format');
        return [];
      }
      
      // Sort by TVL descending and take top pools
      const sortedPools = response.data.data
        .filter((pool: any) => pool && parseFloat(pool.tvl || '0') > 10) // Minimum $10 TVL
        .sort((a: any, b: any) => parseFloat(b.tvl || '0') - parseFloat(a.tvl || '0'))
        .slice(0, limit);
      
      console.log(`Fetched ${sortedPools.length} CLMM pools`);
      return sortedPools;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('CLMM pools request timed out');
      } else {
        console.error('Failed to fetch CLMM pools:', error);
      }
      return [];
    }
  }

  // Get Constant Product (CP) pools from Raydium V2 API
  async getCPPools(limit: number = 100): Promise<any[]> {
    try {
      console.log('Fetching CP pools from Raydium...');
      
      // Try fetch first (better CORS support), then fallback to axios
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://api.raydium.io/v2/main/pairs', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.warn('Invalid CP pools response format from fetch');
          throw new Error('Invalid response format');
        }
        
        console.log(`Fetched ${data.length} CP pools using fetch`);
        
        // Apply the same filtering and sorting logic
        const sortedPools = data
          .filter((pool: any) => pool && pool.name && parseFloat(pool.liquidity || '0') > 0)
          .sort((a: any, b: any) => {
            const liquidityA = parseFloat(a.liquidity || '0');
            const liquidityB = parseFloat(b.liquidity || '0');
            const volumeA = parseFloat(a.volume24h || '0');
            const volumeB = parseFloat(b.volume24h || '0');
            
            if (liquidityB !== liquidityA) {
              return liquidityB - liquidityA;
            }
            return volumeB - volumeA;
          })
          .slice(0, limit);
        
        console.log(`Filtered to ${sortedPools.length} CP pools`);
        return sortedPools;
        
      } catch (fetchError: any) {
        console.warn('Fetch failed, trying axios:', fetchError.message);
        
        // Fallback to axios
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 15000);
        
        const axiosResponse = await v2Api.get('/main/pairs', {
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        
        if (!axiosResponse.data || !Array.isArray(axiosResponse.data)) {
          console.warn('Invalid CP pools response format from axios');
          return [];
        }
        
        // Apply the same filtering and sorting logic for axios response
        const sortedAxiosData = axiosResponse.data
          .filter((pool: any) => pool && pool.name && parseFloat(pool.liquidity || '0') > 0)
          .sort((a: any, b: any) => {
            const liquidityA = parseFloat(a.liquidity || '0');
            const liquidityB = parseFloat(b.liquidity || '0');
            const volumeA = parseFloat(a.volume24h || '0');
            const volumeB = parseFloat(b.volume24h || '0');
            
            if (liquidityB !== liquidityA) {
              return liquidityB - liquidityA;
            }
            return volumeB - volumeA;
          })
          .slice(0, limit);
        
        console.log(`Filtered axios data to ${sortedAxiosData.length} CP pools`);
        return sortedAxiosData;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('CP pools request timed out');
      } else {
        console.error('Failed to fetch CP pools:', error);
      }
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
      
      // Fetch data from multiple endpoints in parallel with shorter timeout for CLMM
      const [clmmPools, cpPools] = await Promise.allSettled([
        this.getCLMMPools(limit).catch(error => {
          console.warn('CLMM pools failed, continuing with CP pools only:', error.message);
          return [];
        }),
        this.getCPPools(limit * 3) // Get more CP pools since they have better data
      ]);

      // Convert pools to coins and filter out invalid ones
      const coins: Coin[] = [];
      
      // Process CLMM pools
      if (clmmPools.status === 'fulfilled') {
        const clmmCoins = clmmPools.value
          .map((pool: any) => convertRaydiumPoolToCoin(pool, 'CLMM'))
          .filter((coin): coin is Coin => coin !== null);
        coins.push(...clmmCoins);
        console.log(`Converted ${clmmCoins.length} CLMM pools to coins`);
      }
      
      // Process CP pools
      if (cpPools.status === 'fulfilled') {
        console.log(`Processing ${cpPools.value.length} CP pools...`);
        
        // Debug: Show first few pools
        if (cpPools.value.length > 0) {
          console.log('Sample CP pools:');
          cpPools.value.slice(0, 3).forEach((pool, i) => {
            console.log(`  ${i+1}. ${pool.name} - Price: ${pool.price}, Volume: ${pool.volume24h}, Liquidity: ${pool.liquidity}`);
          });
        }
        
        let processedCount = 0;
        let skippedStablecoin = 0;
        let skippedExtreme = 0;
        let skippedOther = 0;
        let successCount = 0;
        
        const cpCoins = cpPools.value
          .map((pool: any) => {
            processedCount++;
            const coin = convertRaydiumPoolToCoin(pool, 'CP');
            
            if (!coin) {
              // Log why it was filtered
              const tokens = (pool.name || '').split('/');
              const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'UST', 'USDH', 'TUSD', 'GUSD', 'PAX', 'SUSD'];
              
              if (tokens.length === 2) {
                const token1IsStablecoin = stablecoins.includes(tokens[0].toUpperCase());
                const token2IsStablecoin = stablecoins.includes(tokens[1].toUpperCase());
                
                if (token1IsStablecoin && token2IsStablecoin) {
                  skippedStablecoin++;
                  if (skippedStablecoin <= 3) console.log(`Skipped stablecoin pair: ${pool.name}`);
                } else if (pool.price && (pool.price < 1e-12 || pool.price > 1e12)) {
                  skippedExtreme++;
                  if (skippedExtreme <= 3) console.log(`Skipped extreme price: ${pool.name} (${pool.price})`);
                } else {
                  skippedOther++;
                  if (skippedOther <= 3) console.log(`Skipped other reason: ${pool.name} (vol: ${pool.volume24h}, liq: ${pool.liquidity})`);
                }
              }
            } else {
              successCount++;
              if (successCount <= 3) console.log(`Successfully converted: ${pool.name} -> ${coin.symbol}`);
            }
            
            return coin;
          })
          .filter((coin): coin is Coin => coin !== null);
          
        console.log(`CP Pool conversion stats: ${processedCount} processed, ${successCount} successful, ${skippedStablecoin} stablecoin, ${skippedExtreme} extreme price, ${skippedOther} other`);
        coins.push(...cpCoins);
        console.log(`Converted ${cpCoins.length} CP pools to coins`);
      }

      if (coins.length === 0) {
        console.warn('No pools converted to coins from any Raydium endpoint, trying fallback...');
        console.log('CLMM status:', clmmPools.status, clmmPools.status === 'fulfilled' ? `${clmmPools.value.length} pools` : clmmPools.reason);
        console.log('CP status:', cpPools.status, cpPools.status === 'fulfilled' ? `${cpPools.value.length} pools` : cpPools.reason);
        
        // Fallback: create coins from any available pools with minimal filtering
        if (cpPools.status === 'fulfilled' && cpPools.value.length > 0) {
          console.log('Attempting fallback conversion with minimal filtering...');
          
          const fallbackCoins: Coin[] = [];
          const topPools = cpPools.value
            .filter((pool: any) => pool && pool.name && parseFloat(pool.liquidity || '0') > 0)
            .sort((a: any, b: any) => parseFloat(b.liquidity || '0') - parseFloat(a.liquidity || '0'))
            .slice(0, 20);
          
          for (const pool of topPools) {
            try {
              const poolName = pool.name || '';
              const tokens = poolName.split('/');
              const tokenSymbol = tokens[0] || 'UNKNOWN';
              const price = parseFloat(pool.price || '1');
              const volume24h = parseFloat(pool.volume24h || '0');
              const tvl = parseFloat(pool.liquidity || '0');
              
              if (tokenSymbol && tokenSymbol !== 'UNKNOWN' && tokenSymbol.length > 0) {
                const fallbackCoin = {
                  id: pool.ammId || `fallback-${tokenSymbol}`,
                  symbol: tokenSymbol.toLowerCase(),
                  name: `${tokenSymbol} Token`,
                  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                  current_price: Math.max(price || 1, 0.000001), // Ensure positive price
                  market_cap: tvl * 2,
                  market_cap_rank: 0,
                  fully_diluted_valuation: tvl * 3,
                  total_volume: volume24h,
                  high_24h: Math.max(price || 1, 0.000001) * 1.1,
                  low_24h: Math.max(price || 1, 0.000001) * 0.9,
                  price_change_24h: 0,
                  price_change_percentage_24h: 0,
                  market_cap_change_24h: 0,
                  market_cap_change_percentage_24h: 0,
                  circulating_supply: 0,
                  total_supply: 0,
                  max_supply: null,
                  ath: Math.max(price || 1, 0.000001) * 1.5,
                  ath_change_percentage: -25,
                  ath_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  atl: Math.max(price || 1, 0.000001) * 0.3,
                  atl_change_percentage: 200,
                  atl_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                  roi: null,
                  last_updated: new Date().toISOString(),
                  sparkline_in_7d: { price: [] },
                  sparkline_in_24h: { price: [] }
                };
                
                // Check for duplicates
                if (!fallbackCoins.some(c => c.symbol === fallbackCoin.symbol)) {
                  fallbackCoins.push(fallbackCoin);
                  console.log(`Created fallback coin: ${tokenSymbol} from pool ${poolName}`);
                }
                
                if (fallbackCoins.length >= 10) break;
              }
            } catch (error) {
              console.warn(`Failed to create fallback coin from pool ${pool.name}:`, error);
            }
          }
          
          if (fallbackCoins.length > 0) {
            console.log(`Created ${fallbackCoins.length} fallback coins`);
            // Cache and return fallback coins
            cacheService.cacheMarketData(cacheKey, fallbackCoins);
            return fallbackCoins.slice(0, limit);
          }
        }
        
        return [];
      }
      
      // Remove duplicates based on symbol
      const uniqueCoins = coins.filter((coin, index, self) => 
        index === self.findIndex(c => c.symbol === coin.symbol)
      );

      if (uniqueCoins.length === 0) {
        console.warn('No valid coins after conversion and filtering');
        return [];
      }

      // Sort by a combination of volume and TVL for diversity
      const sortedCoins = uniqueCoins.sort((a, b) => {
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