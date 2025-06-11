import axios from 'axios';
import { Coin } from '../types';
import { cacheService } from './cacheService';

// CoinGecko On-Chain DEX API endpoints
const COINGECKO_ONCHAIN_BASE_URL = 'https://api.coingecko.com/api/v3/onchain';

// Solana network identifier for CoinGecko
const SOLANA_NETWORK = 'solana';

// Meteora DEX identifier (we'll need to find this from the supported DEXes list)
const METEORA_DEX_ID = 'meteora';

// Create API instance for on-chain data
const onchainApi = axios.create({
  baseURL: COINGECKO_ONCHAIN_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

onchainApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Meteora API Error:', error);
    throw error;
  }
);

// Convert pool data to Coin format for compatibility with existing system
const convertPoolDataToCoin = (poolData: any, tokenData: any): Coin => {
  const baseToken = poolData.relationships?.base_token?.data;
  const quoteToken = poolData.relationships?.quote_token?.data;
  
  // Use the token with higher market cap as the main token
  const mainToken = tokenData.find((token: any) => 
    token.id === baseToken?.id || token.id === quoteToken?.id
  ) || {};
  
  const attributes = poolData.attributes || {};
  const tokenAttributes = mainToken.attributes || {};
  
  return {
    id: mainToken.id || poolData.id,
    symbol: tokenAttributes.symbol || 'UNKNOWN',
    name: tokenAttributes.name || 'Unknown Token',
    image: tokenAttributes.image_url || '',
    current_price: parseFloat(attributes.base_token_price_usd || '0'),
    market_cap: parseFloat(tokenAttributes.market_cap_usd || '0'),
    market_cap_rank: 0, // Will be set based on sorting
    fully_diluted_valuation: parseFloat(tokenAttributes.fdv_usd || '0'),
    total_volume: parseFloat(attributes.volume_usd?.h24 || '0'),
    high_24h: 0, // Not available in pool data
    low_24h: 0, // Not available in pool data
    price_change_24h: parseFloat(attributes.price_change_percentage?.h24 || '0'),
    price_change_percentage_24h: parseFloat(attributes.price_change_percentage?.h24 || '0'),
    market_cap_change_24h: 0,
    market_cap_change_percentage_24h: parseFloat(attributes.price_change_percentage?.h24 || '0'),
    circulating_supply: 0, // Not available
    total_supply: parseFloat(tokenAttributes.total_supply || '0'),
    max_supply: null,
    ath: parseFloat(attributes.base_token_price_usd || '0'),
    ath_change_percentage: 0,
    ath_date: new Date().toISOString(),
    atl: 0,
    atl_change_percentage: 0,
    atl_date: new Date().toISOString(),
    roi: null,
    last_updated: new Date().toISOString(),
    sparkline_in_7d: { price: [] },
    sparkline_in_24h: { price: [] }
  };
};

class MeteoraApiService {
  // Get supported DEXes on Solana to find Meteora's exact ID
  async getSupportedDexes(): Promise<any[]> {
    try {
      const response = await onchainApi.get(`/networks/${SOLANA_NETWORK}/dexes`);
      console.log('Supported DEXes on Solana:', response.data);
      return (response.data && response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch supported DEXes:', error);
      throw new Error('Failed to fetch supported DEXes on Solana');
    }
  }

  // Get top pools from Meteora DEX
  async getMeteoraTopPools(page: number = 1, limit: number = 20): Promise<any[]> {
    try {
      const response = await onchainApi.get(`/networks/${SOLANA_NETWORK}/dexes/${METEORA_DEX_ID}/pools`, {
        params: {
          page,
          include: 'base_token,quote_token'
        }
      });
      
      console.log(`Meteora pools page ${page}:`, response.data);
      return (response.data && response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch Meteora pools:', error);
      // Try alternative approach if direct DEX filtering fails
      return await this.getMeteoraPoolsAlternative(page, limit);
    }
  }

  // Alternative method: Get all Solana pools and filter for Meteora
  async getMeteoraPoolsAlternative(page: number = 1, limit: number = 20): Promise<any[]> {
    try {
      console.log('Trying alternative method to get Meteora pools...');
      const response = await onchainApi.get(`/networks/${SOLANA_NETWORK}/pools`, {
        params: {
          page,
          include: 'base_token,quote_token,dex'
        }
      });
      
      const allPools = (response.data && response.data.data) ? response.data.data : [];
      
      // Filter pools that belong to Meteora
      const meteoraPools = allPools.filter((pool: any) => {
        const dexName = pool.relationships?.dex?.data?.id?.toLowerCase();
        return dexName === 'meteora' || (dexName && dexName.includes('meteora'));
      });
      
      console.log(`Found ${meteoraPools.length} Meteora pools from ${allPools.length} total pools`);
      return meteoraPools.slice(0, limit);
    } catch (error) {
      console.error('Alternative Meteora pools fetch failed:', error);
      throw new Error('Failed to fetch Meteora pools using alternative method');
    }
  }

  // Get token data for pools
  async getTokensData(tokenAddresses: string[]): Promise<any[]> {
    try {
      if (tokenAddresses.length === 0) return [];
      
      const response = await onchainApi.get(`/networks/${SOLANA_NETWORK}/tokens/multi/${tokenAddresses.join(',')}`);
      return (response.data && response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch token data:', error);
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
      console.log('Fetching fresh Meteora coins data...');
      
      // First, try to get the correct DEX list to find Meteora's ID
      try {
        const dexes = await this.getSupportedDexes();
        const meteoraDex = dexes.find((dex: any) => 
          dex.id?.toLowerCase().includes('meteora') || 
          dex.attributes?.name?.toLowerCase().includes('meteora')
        );
        
        if (meteoraDex) {
          console.log('Found Meteora DEX:', meteoraDex);
          // Update the DEX ID if we found it
          const actualMeteoraId = meteoraDex.id;
          console.log(`Using Meteora DEX ID: ${actualMeteoraId}`);
        }
      } catch (dexError) {
        console.warn('Could not fetch DEX list, proceeding with default ID');
      }

      // Fetch multiple pages of pools to get enough tokens
      const allPools: any[] = [];
      const maxPages = Math.ceil(limit / 20); // 20 pools per page typically
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const pools = await this.getMeteoraTopPools(page, 20);
          allPools.push(...pools);
          
          if (pools.length < 20) break; // No more pages
        } catch (pageError) {
          console.warn(`Failed to fetch page ${page}, continuing with available data`);
          break;
        }
      }

      console.log(`Fetched ${allPools.length} Meteora pools`);

      if (allPools.length === 0) {
        throw new Error('No Meteora pools found');
      }

      // Extract unique token addresses from pools
      const tokenAddresses = new Set<string>();
      allPools.forEach((pool: any) => {
        const baseToken = pool.relationships?.base_token?.data?.id;
        const quoteToken = pool.relationships?.quote_token?.data?.id;
        
        if (baseToken) tokenAddresses.add(baseToken);
        if (quoteToken) tokenAddresses.add(quoteToken);
      });

      // Get detailed token data
      const tokensData = await this.getTokensData(Array.from(tokenAddresses));
      
      // Convert pools to Coin format
      const coins: Coin[] = [];
      const seenTokens = new Set<string>();

      allPools.forEach((pool: any) => {
        try {
          const coin = convertPoolDataToCoin(pool, tokensData);
          
          // Avoid duplicates and ensure valid data
          if (!seenTokens.has(coin.id) && coin.current_price > 0 && coin.symbol !== 'UNKNOWN') {
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

      const finalCoins = coins.slice(0, limit);
      console.log(`Returning ${finalCoins.length} Meteora coins`);

      // Cache the result
      cacheService.cacheMarketData(cacheKey, finalCoins);

      return finalCoins;
    } catch (error) {
      console.error('Failed to fetch Meteora coins:', error);
      
      // Return empty array as fallback
      return [];
    }
  }

  // Get trending Meteora pools
  async getTrendingMeteoraCoins(limit: number = 20): Promise<Coin[]> {
    try {
      // Get trending pools across all networks and filter for Solana/Meteora
      const response = await onchainApi.get('/networks/trending_pools');
      const trendingPools = (response.data && response.data.data) ? response.data.data : [];
      
      const meteoraTrendingPools = trendingPools.filter((pool: any) => {
        const network = pool.relationships?.network?.data?.id;
        const dex = pool.relationships?.dex?.data?.id;
        return network === 'solana' && (dex?.toLowerCase().includes('meteora') || dex === 'meteora');
      });

      console.log(`Found ${meteoraTrendingPools.length} trending Meteora pools`);

      // Convert to coins format
      const coins = meteoraTrendingPools.slice(0, limit).map((pool: any, index: number) => {
        const coin = convertPoolDataToCoin(pool, []);
        coin.market_cap_rank = index + 1;
        return coin;
      });

      return coins;
    } catch (error) {
      console.error('Failed to fetch trending Meteora coins:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const meteoraApi = new MeteoraApiService(); 