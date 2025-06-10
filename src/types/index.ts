export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any;
  last_updated: string;
  categories?: string[];
  sparkline_in_7d?: {
    price: number[];
  };
  sparkline_in_24h?: {
    price: number[];
  };
  // Enhanced data
  sentiment_score?: number;
  social_volume?: number;
  developer_score?: number;
  community_score?: number;
  liquidity_score?: number;
  market_cap_rank_change_24h?: number;
  price_change_percentage_1h?: number;
  price_change_percentage_7d?: number;
  price_change_percentage_30d?: number;
  price_change_percentage_1y?: number;
  volatility_score?: number;
  correlation_with_btc?: number;
  fear_greed_index?: number;
}

export interface CoinDetail extends Coin {
  description: {
    en: string;
  };
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    announcement_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    bitcointalk_thread_identifier: number | null;
    telegram_channel_identifier: string;
    subreddit_url: string;
    repos_url: {
      github: string[];
      bitbucket: string[];
    };
  };
  market_data: {
    current_price: { [key: string]: number };
    market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
  };
  // Enhanced detail data
  technical_indicators?: TechnicalIndicators;
  support_resistance?: SupportResistance;
  fibonacci_levels?: FibonacciLevels;
  volume_profile?: VolumeProfile;
}

export interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    upcoming_icos: number;
    ongoing_icos: number;
    ended_icos: number;
    markets: number;
    total_market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    market_cap_percentage: { [key: string]: number };
    market_cap_change_percentage_24h_usd: number;
    updated_at: number;
  };
}

export interface TrendingCoin {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    small: string;
    large: string;
    slug: string;
    price_btc: number;
    score: number;
  };
}

// New interfaces for enhanced features

export interface MultiTimeframeAnalysis {
  timeframe: '1h' | '4h' | '1d' | '1w' | '1m';
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  technical_score: number;
  fundamental_score: number;
  sentiment_score: number;
  confluence_score?: number;
}

export interface SentimentData {
  twitter_sentiment: number;
  reddit_sentiment: number;
  news_sentiment: number;
  social_volume: number;
  social_dominance: number;
  sentiment_trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  fear_greed_index: number;
}

export interface PortfolioOptimization {
  recommended_allocation: { [coinId: string]: number };
  risk_score: number;
  expected_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  diversification_score: number;
  correlation_matrix: { [coinId: string]: { [coinId: string]: number } };
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger_bands: {
    upper: number;
    middle: number;
    lower: number;
  };
  moving_averages: {
    sma_20: number;
    sma_50: number;
    sma_200: number;
    ema_12: number;
    ema_26: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  volume_indicators: {
    volume_sma: number;
    volume_ratio: number;
    on_balance_volume: number;
  };
}

export interface SupportResistance {
  support_levels?: number[];
  resistance_levels?: number[];
  pivot_point?: number;
  strength_scores?: { [level: number]: number };
  // Properties used in interactive charts
  level: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
  last_touch: string;
  first_touch?: string;
}

export interface FibonacciLevels {
  high: number;
  low: number;
  levels: {
    '0.236': number;
    '0.382': number;
    '0.5': number;
    '0.618': number;
    '0.786': number;
  };
}

export interface VolumeProfile {
  price_levels?: number[];
  volume_at_price?: number[];
  poc?: number; // Point of Control
  value_area_high?: number;
  value_area_low?: number;
  // Properties used in interactive charts
  price_level?: number;
  total_volume?: number;
  buy_volume?: number;
  sell_volume?: number;
  volume_percentage?: number;
}

export interface AlertCondition {
  type: 'price_above' | 'price_below' | 'volume_spike' | 'technical_signal' | 'news_alert' | 'price_change_24h' | 'sentiment_change' | 'market_cap_change';
  value?: number;
  signal_type?: string;
  keywords?: string[];
  description?: string;
  operator?: 'AND' | 'OR';
}

export interface SmartAlert {
  id: string;
  coin_id: string;
  type: 'PRICE_TARGET' | 'TECHNICAL_BREAKOUT' | 'VOLUME_SPIKE' | 'AI_CONFIDENCE_CHANGE' | 'NEWS_SENTIMENT';
  condition?: string;
  conditions?: AlertCondition[];
  target_value: number;
  current_value: number;
  is_active: boolean;
  created_at: string;
  triggered_at?: string;
  message: string;
  // Additional properties used in components
  status?: 'active' | 'paused' | 'triggered';
  priority?: 'low' | 'medium' | 'high';
  ai_confidence?: number;
}

export interface UserPreferences {
  risk_tolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  investment_timeline: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  trading_strategy: 'SWING' | 'DAY' | 'HODL' | 'SCALPING';
  preferred_sectors: string[];
  max_portfolio_allocation: number;
  notification_preferences: {
    price_alerts: boolean;
    ai_recommendations: boolean;
    market_news: boolean;
    portfolio_updates: boolean;
  };
  theme_preferences: {
    mode: 'light' | 'dark' | 'auto';
    color_scheme: 'default' | 'colorblind' | 'high_contrast';
    chart_style: 'candlestick' | 'line' | 'area';
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'TRADING' | 'ANALYSIS' | 'SOCIAL' | 'LEARNING';
  points: number;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  coin_ids: string[];
  is_ai_curated: boolean;
  strategy_type?: 'GROWTH' | 'VALUE' | 'MOMENTUM' | 'DEFENSIVE';
  created_at: string;
  updated_at: string;
  performance_metrics?: {
    total_return: number;
    volatility: number;
    sharpe_ratio: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  sentiment_score: number;
  relevance_score: number;
  related_coins: string[];
  category: 'MARKET' | 'REGULATION' | 'TECHNOLOGY' | 'ADOPTION' | 'SECURITY';
}

export interface DeFiOpportunity {
  protocol: string;
  token_pair: string;
  apy: number;
  tvl: number;
  risk_score: number;
  impermanent_loss_risk: number;
  platform: string;
  chain: string;
  minimum_deposit: number;
}

export interface BacktestResult {
  strategy_name: string;
  start_date: string;
  end_date: string;
  total_return: number;
  annual_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  coin_id: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  return_percentage: number;
  reason: string;
}

export interface MarketHeatmapData {
  coin_id: string;
  symbol: string;
  name: string;
  market_cap: number;
  price_change_24h: number;
  volume_24h: number;
  sector?: string;
  size_metric?: 'market_cap' | 'volume' | 'price_change';
  color_metric?: 'price_change' | 'volume_change' | 'sentiment';
  // Additional properties used in the service
  value?: number;
  size?: number;
  color?: string;
  metric?: string;
  price_change_7d?: number;
  updated_at?: string;
}

export interface CorrelationMatrix {
  coins: string[];
  matrix: number[][];
  timeframe: string;
  updated_at: string;
}

export interface RiskMetrics {
  value_at_risk: number;
  expected_shortfall: number;
  beta: number;
  alpha: number;
  information_ratio: number;
  tracking_error: number;
  downside_deviation: number;
  sortino_ratio: number;
}

export interface SocialMetrics {
  twitter_followers: number;
  twitter_mentions_24h: number;
  reddit_subscribers: number;
  reddit_posts_24h: number;
  github_commits_30d: number;
  telegram_members: number;
  discord_members: number;
  social_dominance: number;
}

export interface ExchangeIntegration {
  exchange_id: string;
  exchange_name: string;
  api_key_encrypted: string;
  is_connected: boolean;
  permissions: ('READ' | 'TRADE' | 'WITHDRAW')[];
  last_sync: string;
  portfolio_value: number;
  holdings: ExchangeHolding[];
}

export interface ExchangeHolding {
  coin_id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
}

export interface VoiceCommand {
  command: string;
  intent: 'PRICE_QUERY' | 'PORTFOLIO_STATUS' | 'RECOMMENDATIONS' | 'NEWS' | 'ALERTS';
  parameters: { [key: string]: any };
  confidence: number;
}

export interface ChartPattern {
  pattern_type?: 'HEAD_AND_SHOULDERS' | 'TRIANGLE' | 'FLAG' | 'WEDGE' | 'DOUBLE_TOP' | 'DOUBLE_BOTTOM';
  type?: string; // For backward compatibility with interactiveCharts service
  confidence: number;
  start_date?: string;
  end_date?: string;
  start_time?: any; // For backward compatibility
  end_time?: any; // For backward compatibility
  target_price: number;
  stop_loss?: number;
  breakout_direction?: 'BULLISH' | 'BEARISH';
  key_levels: any[];
  description: string;
}

export interface AIModel {
  model_id: string;
  model_name: string;
  model_type: 'TECHNICAL' | 'FUNDAMENTAL' | 'SENTIMENT' | 'ENSEMBLE';
  accuracy: number;
  last_trained: string;
  features_used: string[];
  hyperparameters: { [key: string]: any };
  performance_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
  };
}

// Additional interfaces for interactive charts
export interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FibonacciLevel {
  level: number;
  ratio: number;
  type: 'support' | 'resistance' | 'retracement';
  strength: number;
  touches: number;
}

export interface ChartData {
  candlestickData?: CandlestickData[];
  volumeProfile?: VolumeProfile[];
  supportResistance?: SupportResistance[];
  fibonacciLevels?: FibonacciLevel[];
  chartPatterns?: ChartPattern[];
  technicalIndicators?: TechnicalIndicators;
  // Legacy property names for backward compatibility
  candlestick_data?: CandlestickData[];
  volume_profile?: VolumeProfile[];
  support_resistance?: SupportResistance[];
  fibonacci_levels?: FibonacciLevel[];
  chart_patterns?: ChartPattern[];
  // Cache properties
  coin_id?: string;
  timeframe?: string;
  updated_at?: string;
} 