// Cache for category information
const categoryCache = new Map<string, string[]>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

// Categories that should be excluded from recommendations
const EXCLUDED_CATEGORIES = [
  // Stablecoins - comprehensive list
  'Stablecoins',
  'USD Stablecoin',
  'Fiat-backed Stablecoin',
  'Algorithmic Stablecoin',
  'Euro Stablecoin',
  'Stablecoin',
  'USD-pegged',
  'Fiat-pegged',
  'Asset-backed Stablecoin',
  'Collateralized Stablecoin',
  'Decentralized Stablecoin',
  'Centralized Stablecoin',
  
  // Wrapped tokens
  'Wrapped-Tokens',
  'Crypto-Backed Tokens',
  'Wrapped Tokens',
  'Bridged Tokens',
  
  // Staking derivatives
  'Liquid Staking Tokens',
  'Staking Derivatives',
  'Liquid Staking Derivatives',
  'Staked Tokens',
  'Liquid Staking',
  
  // Other exclusions
  'Synthetic Assets',
  'Tokenized Gold',
  'Tokenized Commodities',
  'Central Bank Digital Currency (CBDC)',
  'CBDC'
];

export class CategoryService {
  // Check if categories should exclude a coin
  static shouldExcludeCoin(categories: string[]): boolean {
    if (!categories || categories.length === 0) {
      return false;
    }
    
    return categories.some(category => 
      EXCLUDED_CATEGORIES.some(excluded => 
        category.toLowerCase().includes(excluded.toLowerCase()) ||
        excluded.toLowerCase().includes(category.toLowerCase())
      )
    );
  }

  // Comprehensive coin filtering that checks both categories and coin properties
  static shouldExcludeCoinComprehensive(coin: { name: string; symbol: string; current_price?: number; price_change_percentage_24h?: number }, categories: string[] = []): boolean {
    // First check categories
    if (this.shouldExcludeCoin(categories)) {
      return true;
    }

    const name = coin.name.toLowerCase();
    const symbol = coin.symbol.toLowerCase();
    
    // Known stablecoin symbols - comprehensive list
    const stablecoinSymbols = [
      'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 'gusd',
      'husd', 'susd', 'cusd', 'ousd', 'musd', 'dusd', 'yusd', 'rusd', 'nusd',
      'usdn', 'ustc', 'ust', 'vai', 'mim', 'fei', 'tribe', 'rai', 'float',
      'eurc', 'eurs', 'eurt', 'gbpt', 'jpyc', 'cadc', 'audc', 'nzds',
      'paxg', 'xaut', 'dgld', 'pmgt', 'cache', 'usdx', 'usdk', 'usds'
    ];
    
    // Stablecoin name patterns
    const stablecoinPatterns = [
      'usd', 'dollar', 'stable', 'peg', 'backed', 'reserve', 'tether',
      'centre', 'paxos', 'trueusd', 'gemini', 'binance usd', 'terrausd',
      'euro', 'eur', 'pound', 'gbp', 'yen', 'jpy', 'yuan', 'cny',
      'canadian', 'cad', 'australian', 'aud', 'swiss', 'chf'
    ];
    
    // Wrapped and staked token patterns
    const wrappedPatterns = [
      'wrapped', 'staked', 'liquid staking', 'staking derivative',
      'weth', 'wbtc', 'wbnb', 'wmatic', 'wavax', 'wftm', 'wsol',
      'steth', 'reth', 'cbeth', 'sfrxeth', 'ankr', 'lido'
    ];
    
    // Check for stablecoin by symbol
    if (stablecoinSymbols.includes(symbol)) {
      return true;
    }
    
    // Check for stablecoin by name patterns
    if (stablecoinPatterns.some(pattern => name.includes(pattern))) {
      return true;
    }
    
    // Check for wrapped/staked tokens
    if (wrappedPatterns.some(pattern => name.includes(pattern) || symbol.includes(pattern))) {
      return true;
    }
    
    // Check for wrapped tokens by symbol pattern
    if (symbol.startsWith('w') && ['eth', 'btc', 'bnb', 'matic', 'avax', 'ftm', 'sol'].some(token => symbol.includes(token))) {
      return true;
    }
    
    // Check for stablecoin by price behavior (if price data available)
    if (coin.current_price !== undefined && coin.price_change_percentage_24h !== undefined) {
      const isStablecoinByPrice = (
        Math.abs(coin.price_change_percentage_24h) < 2 && 
        ((coin.current_price > 0.95 && coin.current_price < 1.05) || // USD pegged
         (coin.current_price > 0.85 && coin.current_price < 1.15))   // Other fiat pegged
      );
      
      if (isStablecoinByPrice) {
        return true;
      }
    }
    
    return false;
  }

  // Fetch categories for a specific coin
  static async getCoinCategories(coinId: string): Promise<string[]> {
    // Check cache first
    const cached = categoryCache.get(coinId);
    const cacheTime = cacheTimestamps.get(coinId);
    
    if (cached && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
      return cached;
    }

    try {
      // Fetch detailed coin information including categories
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch categories for ${coinId}`);
        return [];
      }
      
      const data = await response.json();
      const categories = data.categories || [];
      
      // Cache the result
      categoryCache.set(coinId, categories);
      cacheTimestamps.set(coinId, Date.now());
      
      return categories;
    } catch (error) {
      console.warn(`Error fetching categories for ${coinId}:`, error);
      return [];
    }
  }

  // Batch fetch categories for multiple coins
  static async batchGetCategories(coinIds: string[]): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < coinIds.length; i += batchSize) {
      const batch = coinIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (coinId) => {
        const categories = await this.getCoinCategories(coinId);
        return { coinId, categories };
      });
      
      try {
        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ coinId, categories }) => {
          results.set(coinId, categories);
        });
        
        // Add delay between batches
        if (i + batchSize < coinIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn('Batch category fetch failed:', error);
      }
    }
    
    return results;
  }

  // Clear cache (useful for testing or manual refresh)
  static clearCache(): void {
    categoryCache.clear();
    cacheTimestamps.clear();
  }
}

export default CategoryService; 