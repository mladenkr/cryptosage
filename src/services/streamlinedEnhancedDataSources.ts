import { streamlinedDataFetcher } from './streamlinedDataFetcher';
import { EnhancedCoinData } from './enhancedDataSources';
import { Coin } from '../types';
import { apiService } from './api';

export class StreamlinedEnhancedDataSources {
  
  // Convert regular Coin to EnhancedCoinData with minimal overhead
  private convertToEnhancedCoinData(coin: Coin): EnhancedCoinData {
    return {
      ...coin,
      // Add enhanced fields with defaults
      price_change_percentage_1h: coin.price_change_percentage_1h || 0,
      price_change_percentage_7d: coin.price_change_percentage_7d || 0,
      price_change_percentage_30d: coin.price_change_percentage_30d || 0,
      price_change_percentage_1y: coin.price_change_percentage_1y || 0,
      
      // Volume metrics
      volume_change_24h: 0,
      volume_change_percentage_24h: 0,
      
      // Supply metrics
      circulating_supply_percentage: coin.max_supply && coin.circulating_supply ? 
        (coin.circulating_supply / coin.max_supply) * 100 : undefined,
      
      // Social and development metrics (defaults)
      developer_score: 0,
      community_score: 0,
      liquidity_score: this.calculateLiquidityScore(coin),
      public_interest_score: 0,
      
      // Exchange and trading data
      tickers: [],
      
      // Network and contract information
      network: this.detectNetwork(coin.symbol, coin.id),
      contract_address: undefined,
      is_native_token: this.isNativeToken(coin.symbol, coin.id),
      
      // Data quality and source tracking
      data_sources: ['MEXC', 'CoinGecko'],
      data_quality_score: 95, // High score for real-time MEXC data
      last_updated_source: 'MEXC',
      source_url: `https://www.coingecko.com/en/coins/${coin.id}`
    };
  }

  private calculateLiquidityScore(coin: Coin): number {
    if (!coin.market_cap || !coin.total_volume) return 0;
    
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    
    if (volumeToMarketCap > 0.3) return 95; // Extremely liquid
    if (volumeToMarketCap > 0.15) return 85; // Very liquid
    if (volumeToMarketCap > 0.08) return 75; // Good liquidity
    if (volumeToMarketCap > 0.03) return 60; // Moderate liquidity
    if (volumeToMarketCap > 0.01) return 40; // Low liquidity
    return 20; // Very low liquidity
  }

  private detectNetwork(symbol: string, id: string): string | undefined {
    // Simple network detection
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
    
    return 'Ethereum'; // Default to Ethereum for most tokens
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

  // Stablecoin detection method (same as in enhancedAIAnalysis)
  private isStablecoin(coin: EnhancedCoinData): boolean {
    const symbol = coin.symbol.toLowerCase();
    const name = coin.name.toLowerCase();
    
    // Direct stablecoin symbols
    const stablecoinSymbols = [
      'usdt', 'usdc', 'busd', 'dai', 'tusd', 'frax', 'lusd', 'usdd', 'usdp', 'gusd',
      'husd', 'susd', 'cusd', 'ousd', 'musd', 'dusd', 'yusd', 'rusd', 'nusd',
      'usdn', 'ustc', 'ust', 'vai', 'mim', 'fei', 'tribe', 'rai', 'float',
      'eurc', 'eurs', 'eurt', 'gbpt', 'jpyc', 'cadc', 'audc', 'nzds',
      'paxg', 'xaut', 'dgld', 'pmgt', 'cache', 'usdx', 'usdk',
      'usdj', 'fdusd', 'usd1', 'usdt0', 'usdc0', 'usdt1', 'usdc1',
      'pyusd', 'usdm', 'gho', 'crvusd', 'mkusd', 'usdz', 'usdy',
      'usdr', 'usdb', 'usdh', 'usdq', 'usde', 'tusd'
    ];
    
    if (stablecoinSymbols.includes(symbol)) {
      return true;
    }
    
    // Name-based detection
    const stablecoinNames = [
      'tether', 'usd coin', 'binance usd', 'dai', 'trueusd', 'frax', 'liquity usd',
      'usdd', 'pax dollar', 'gemini dollar', 'huobi usd', 'synthetix usd', 'celo dollar',
      'origin dollar', 'magic internet money', 'fei protocol', 'reflexer ungovernance',
      'euro coin', 'stasis eurs', 'tether eurt', 'paxos gold', 'tether gold'
    ];
    
    if (stablecoinNames.some(stableName => name.includes(stableName))) {
      return true;
    }
    
    // Price stability check - if price is very close to $1 and has minimal volatility
    if (coin.current_price >= 0.95 && coin.current_price <= 1.05) {
      const volatility24h = Math.abs(coin.price_change_percentage_24h || 0);
      const volatility7d = Math.abs(coin.price_change_percentage_7d || 0);
      
      // If both 24h and 7d volatility are under 2%, likely a stablecoin
      if (volatility24h < 2 && volatility7d < 5) {
        return true;
      }
    }
    
    return false;
  }

  // Main method to get streamlined enhanced coin list with fallback
  async getStreamlinedEnhancedCoinList(limit: number = 100): Promise<EnhancedCoinData[]> {
    console.log(`🚀 StreamlinedEnhancedDataSources: Fetching ${limit} coins...`);
    
    try {
      // Try streamlined data fetcher first (MEXC + CoinGecko)
      console.log(`🔄 Attempting streamlined data fetcher (MEXC + CoinGecko)...`);
      const coins = await streamlinedDataFetcher.getStreamlinedCoins(limit);
      
      if (coins.length > 0) {
        console.log(`✅ Streamlined fetcher succeeded with ${coins.length} coins`);
        return this.processCoins(coins, 'Streamlined (MEXC+CG)');
      }
      
    } catch (error) {
      console.warn('⚠️ Streamlined data fetcher failed, trying fallback...', error);
    }
    
    try {
      // Fallback: Use existing API service (CoinGecko only)
      console.log(`🔄 Fallback: Using existing API service (CoinGecko only)...`);
      const coins = await apiService.getCoins('usd', 'market_cap_desc', limit, 1);
      
      if (coins.length > 0) {
        console.log(`✅ Fallback API succeeded with ${coins.length} coins`);
        return this.processCoins(coins, 'Fallback (CoinGecko)');
      }
      
    } catch (error) {
      console.error('❌ Fallback API also failed:', error);
    }
    
    // If both methods fail, throw an error
    throw new Error('Failed to fetch cryptocurrency data from both MEXC and CoinGecko APIs. Please check your internet connection and try again.');
  }

  private processCoins(coins: Coin[], source: string): EnhancedCoinData[] {
    // Convert to enhanced coin data
    const enhancedCoins = coins.map(coin => this.convertToEnhancedCoinData(coin));
    
    // Apply validation and stablecoin filtering
    const validCoins = enhancedCoins.filter(coin => {
      // Basic validation - price and volume
      if (!coin.current_price || coin.current_price <= 0) {
        console.warn(`⚠️ Invalid price for ${coin.symbol}: ${coin.current_price}`);
        return false;
      }
      if (!coin.total_volume || coin.total_volume <= 1000) {
        console.warn(`⚠️ Low volume for ${coin.symbol}: ${coin.total_volume}`);
        return false;
      }
      
      // CRITICAL: Filter out stablecoins
      if (this.isStablecoin(coin)) {
        console.log(`🚫 STABLECOIN FILTERED: ${coin.symbol.toUpperCase()} - Excluded from recommendations`);
        return false;
      }
      
      return true;
    });
    
    if (validCoins.length === 0) {
      throw new Error('All fetched coins had invalid price or volume data');
    }
    
    console.log(`✅ StreamlinedEnhancedDataSources: Returning ${validCoins.length} valid enhanced coins from ${source}`);
    
    // Log top 10 for debugging
    console.log(`🏆 Top 10 coins from ${source}:`);
    validCoins.slice(0, 10).forEach((coin, index) => {
      const mcap = coin.market_cap > 0 ? `$${(coin.market_cap / 1000000).toFixed(1)}M` : 'No MCap';
      const vol = `$${(coin.total_volume / 1000000).toFixed(1)}M`;
      const liq = coin.liquidity_score || 0;
      console.log(`  ${index + 1}. ${coin.symbol.toUpperCase()}: ${mcap} MCap, ${vol} Vol, ${liq} Liq`);
    });
    
    return validCoins;
  }

  // Get price history for technical analysis
  async getPriceHistory(coinId: string, days: number = 7): Promise<number[][]> {
    try {
      return await streamlinedDataFetcher.getPriceHistory(coinId, days);
    } catch (error) {
      console.warn(`Failed to get price history from streamlined fetcher, trying fallback...`);
      // Could add fallback here if needed
      return [];
    }
  }
}

export const streamlinedEnhancedDataSources = new StreamlinedEnhancedDataSources(); 