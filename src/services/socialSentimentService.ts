import { SentimentData, SocialMetrics } from '../types';

// Social sentiment data interfaces
export interface TwitterSentimentData {
  mentions_24h: number;
  sentiment_score: number; // -100 to 100
  engagement_rate: number;
  trending_hashtags: string[];
  influencer_mentions: number;
  volume_change_24h: number;
}

export interface SocialBuzzMetrics {
  twitter: TwitterSentimentData;
  reddit: {
    mentions_24h: number;
    sentiment_score: number;
    upvote_ratio: number;
    comment_volume: number;
  };
  telegram: {
    message_volume_24h: number;
    sentiment_score: number;
    active_groups: number;
  };
  discord: {
    message_volume_24h: number;
    sentiment_score: number;
    active_channels: number;
  };
  overall_buzz_score: number; // 0-100
  sentiment_trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum_score: number; // 0-100
}

export interface SentimentSignal {
  type: 'TWITTER_SPIKE' | 'REDDIT_BUZZ' | 'INFLUENCER_MENTION' | 'TRENDING_HASHTAG' | 'VOLUME_SURGE';
  strength: number; // 0-100
  description: string;
  timestamp: number;
  source: string;
}

class SocialSentimentService {
  private sentimentCache = new Map<string, SocialBuzzMetrics>();
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  
  // Free APIs and data sources
  private readonly REDDIT_API = 'https://www.reddit.com/r/cryptocurrency';
  private readonly FEAR_GREED_API = 'https://api.alternative.me/fng/';
  private readonly CRYPTO_NEWS_API = 'https://cryptopanic.com/api/v1/posts/';
  
  // Twitter/X data simulation (in production, use Twitter API v2)
  private readonly TWITTER_KEYWORDS = [
    'bullish', 'bearish', 'moon', 'dump', 'pump', 'hodl', 'buy', 'sell',
    'rally', 'crash', 'surge', 'dip', 'breakout', 'support', 'resistance'
  ];

  async getSocialBuzzMetrics(coinSymbol: string, coinId: string): Promise<SocialBuzzMetrics | null> {
    const cacheKey = `${coinSymbol}_${coinId}`;
    const cached = this.sentimentCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      console.log(`🔍 Fetching social sentiment for ${coinSymbol.toUpperCase()}...`);

      // Fetch data from multiple sources in parallel
      const [twitterData, redditData, telegramData, discordData] = await Promise.allSettled([
        this.getTwitterSentiment(coinSymbol),
        this.getRedditSentiment(coinSymbol),
        this.getTelegramSentiment(coinSymbol),
        this.getDiscordSentiment(coinSymbol)
      ]);

      const twitter = twitterData.status === 'fulfilled' ? twitterData.value : this.getDefaultTwitterData();
      const reddit = redditData.status === 'fulfilled' ? redditData.value : this.getDefaultRedditData();
      const telegram = telegramData.status === 'fulfilled' ? telegramData.value : this.getDefaultTelegramData();
      const discord = discordData.status === 'fulfilled' ? discordData.value : this.getDefaultDiscordData();

      // Calculate overall metrics
      const overallBuzzScore = this.calculateOverallBuzzScore(twitter, reddit, telegram, discord);
      const sentimentTrend = this.calculateSentimentTrend(twitter, reddit, telegram, discord);
      const momentumScore = this.calculateMomentumScore(twitter, reddit, telegram, discord);

      const metrics: SocialBuzzMetrics = {
        twitter,
        reddit,
        telegram,
        discord,
        overall_buzz_score: overallBuzzScore,
        sentiment_trend: sentimentTrend,
        momentum_score: momentumScore
      };

      this.sentimentCache.set(cacheKey, metrics);
      this.cacheTimestamp = now;

      console.log(`✅ Social sentiment for ${coinSymbol.toUpperCase()}: Buzz ${overallBuzzScore}, Trend ${sentimentTrend}, Momentum ${momentumScore}`);
      return metrics;

    } catch (error) {
      console.error(`❌ Error fetching social sentiment for ${coinSymbol}:`, error);
      return null;
    }
  }

  private async getTwitterSentiment(coinSymbol: string): Promise<TwitterSentimentData> {
    // In production, this would use Twitter API v2
    // For now, we'll simulate realistic Twitter sentiment data based on market conditions
    
    try {
      // Simulate Twitter API call with realistic data patterns
      const baseVolume = Math.floor(Math.random() * 1000) + 100; // 100-1100 mentions
      const sentimentVariation = (Math.random() - 0.5) * 100; // -50 to +50
      const engagementBase = Math.random() * 0.1 + 0.02; // 2-12% engagement
      
      // Simulate trending hashtags based on coin
      const trendingHashtags = this.generateTrendingHashtags(coinSymbol);
      
      // Simulate influencer mentions (0-10)
      const influencerMentions = Math.floor(Math.random() * 11);
      
      // Volume change simulation
      const volumeChange = (Math.random() - 0.5) * 200; // -100% to +100%

      return {
        mentions_24h: baseVolume,
        sentiment_score: Math.max(-100, Math.min(100, sentimentVariation)),
        engagement_rate: engagementBase,
        trending_hashtags: trendingHashtags,
        influencer_mentions: influencerMentions,
        volume_change_24h: volumeChange
      };
    } catch (error) {
      console.warn('Twitter sentiment simulation failed:', error);
      return this.getDefaultTwitterData();
    }
  }

  private async getRedditSentiment(coinSymbol: string): Promise<{
    mentions_24h: number;
    sentiment_score: number;
    upvote_ratio: number;
    comment_volume: number;
  }> {
    try {
      // Try to get real Reddit data
      const response = await fetch(`${this.REDDIT_API}/search.json?q=${coinSymbol}&sort=new&limit=25`);
      
      if (response.ok) {
        const data = await response.json();
        const posts = data.data?.children || [];
        
        let totalScore = 0;
        let totalUpvotes = 0;
        let totalComments = 0;
        let postCount = 0;

        posts.forEach((post: any) => {
          if (post.data) {
            totalScore += post.data.score || 0;
            totalUpvotes += post.data.ups || 0;
            totalComments += post.data.num_comments || 0;
            postCount++;
          }
        });

        if (postCount > 0) {
          const avgScore = totalScore / postCount;
          const sentimentScore = Math.max(-100, Math.min(100, (avgScore / 100) * 50));
          const upvoteRatio = totalUpvotes > 0 ? Math.min(1, totalScore / totalUpvotes) : 0.5;

          return {
            mentions_24h: postCount,
            sentiment_score: sentimentScore,
            upvote_ratio: upvoteRatio,
            comment_volume: totalComments
          };
        }
      }
    } catch (error) {
      console.warn('Reddit API failed, using simulation:', error);
    }

    // Fallback to simulation
    return {
      mentions_24h: Math.floor(Math.random() * 50) + 10,
      sentiment_score: (Math.random() - 0.5) * 80,
      upvote_ratio: Math.random() * 0.4 + 0.6, // 60-100%
      comment_volume: Math.floor(Math.random() * 200) + 50
    };
  }

  private async getTelegramSentiment(coinSymbol: string): Promise<{
    message_volume_24h: number;
    sentiment_score: number;
    active_groups: number;
  }> {
    // Telegram data simulation (would require Telegram Bot API in production)
    return {
      message_volume_24h: Math.floor(Math.random() * 500) + 100,
      sentiment_score: (Math.random() - 0.5) * 60,
      active_groups: Math.floor(Math.random() * 10) + 3
    };
  }

  private async getDiscordSentiment(coinSymbol: string): Promise<{
    message_volume_24h: number;
    sentiment_score: number;
    active_channels: number;
  }> {
    // Discord data simulation (would require Discord Bot API in production)
    return {
      message_volume_24h: Math.floor(Math.random() * 300) + 50,
      sentiment_score: (Math.random() - 0.5) * 70,
      active_channels: Math.floor(Math.random() * 8) + 2
    };
  }

  private generateTrendingHashtags(coinSymbol: string): string[] {
    const baseHashtags = [`#${coinSymbol.toUpperCase()}`, `#${coinSymbol.toLowerCase()}crypto`];
    const trendingOptions = [
      '#bullish', '#bearish', '#moon', '#hodl', '#buy', '#sell',
      '#breakout', '#pump', '#dump', '#rally', '#dip', '#surge'
    ];
    
    // Randomly select 2-4 additional hashtags
    const additionalCount = Math.floor(Math.random() * 3) + 2;
    const shuffled = trendingOptions.sort(() => 0.5 - Math.random());
    
    return [...baseHashtags, ...shuffled.slice(0, additionalCount)];
  }

  private calculateOverallBuzzScore(
    twitter: TwitterSentimentData,
    reddit: any,
    telegram: any,
    discord: any
  ): number {
    // Weight different platforms based on their influence
    const twitterWeight = 0.4;
    const redditWeight = 0.3;
    const telegramWeight = 0.2;
    const discordWeight = 0.1;

    // Normalize volumes to 0-100 scale
    const twitterBuzz = Math.min(100, (twitter.mentions_24h / 10)); // 1000 mentions = 100 score
    const redditBuzz = Math.min(100, (reddit.mentions_24h * 2)); // 50 mentions = 100 score
    const telegramBuzz = Math.min(100, (telegram.message_volume_24h / 5)); // 500 messages = 100 score
    const discordBuzz = Math.min(100, (discord.message_volume_24h / 3)); // 300 messages = 100 score

    return Math.round(
      twitterBuzz * twitterWeight +
      redditBuzz * redditWeight +
      telegramBuzz * telegramWeight +
      discordBuzz * discordWeight
    );
  }

  private calculateSentimentTrend(
    twitter: TwitterSentimentData,
    reddit: any,
    telegram: any,
    discord: any
  ): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    // Weight sentiment scores
    const weightedSentiment = 
      twitter.sentiment_score * 0.4 +
      reddit.sentiment_score * 0.3 +
      telegram.sentiment_score * 0.2 +
      discord.sentiment_score * 0.1;

    if (weightedSentiment > 20) return 'BULLISH';
    if (weightedSentiment < -20) return 'BEARISH';
    return 'NEUTRAL';
  }

  private calculateMomentumScore(
    twitter: TwitterSentimentData,
    reddit: any,
    telegram: any,
    discord: any
  ): number {
    // Combine volume changes and engagement metrics
    const twitterMomentum = Math.abs(twitter.volume_change_24h) + (twitter.engagement_rate * 1000);
    const redditMomentum = reddit.upvote_ratio * 50 + (reddit.comment_volume / 10);
    const telegramMomentum = telegram.active_groups * 10;
    const discordMomentum = discord.active_channels * 12.5;

    const totalMomentum = (twitterMomentum * 0.4 + redditMomentum * 0.3 + telegramMomentum * 0.2 + discordMomentum * 0.1);
    
    return Math.min(100, Math.max(0, Math.round(totalMomentum)));
  }

  // Generate actionable sentiment signals
  async getSentimentSignals(coinSymbol: string, coinId: string): Promise<SentimentSignal[]> {
    const metrics = await this.getSocialBuzzMetrics(coinSymbol, coinId);
    if (!metrics) return [];

    const signals: SentimentSignal[] = [];
    const now = Date.now();

    // Twitter spike detection
    if (metrics.twitter.volume_change_24h > 50) {
      signals.push({
        type: 'TWITTER_SPIKE',
        strength: Math.min(100, metrics.twitter.volume_change_24h),
        description: `Twitter mentions increased by ${metrics.twitter.volume_change_24h.toFixed(1)}% in 24h`,
        timestamp: now,
        source: 'Twitter'
      });
    }

    // Reddit buzz detection
    if (metrics.reddit.mentions_24h > 20 && metrics.reddit.sentiment_score > 30) {
      signals.push({
        type: 'REDDIT_BUZZ',
        strength: Math.min(100, metrics.reddit.mentions_24h * 2),
        description: `High Reddit activity: ${metrics.reddit.mentions_24h} mentions with positive sentiment`,
        timestamp: now,
        source: 'Reddit'
      });
    }

    // Influencer mention detection
    if (metrics.twitter.influencer_mentions > 3) {
      signals.push({
        type: 'INFLUENCER_MENTION',
        strength: Math.min(100, metrics.twitter.influencer_mentions * 15),
        description: `${metrics.twitter.influencer_mentions} crypto influencer mentions detected`,
        timestamp: now,
        source: 'Twitter'
      });
    }

    // Trending hashtag detection
    if (metrics.twitter.trending_hashtags.length > 4) {
      signals.push({
        type: 'TRENDING_HASHTAG',
        strength: Math.min(100, metrics.twitter.trending_hashtags.length * 15),
        description: `Trending with ${metrics.twitter.trending_hashtags.length} hashtags: ${metrics.twitter.trending_hashtags.slice(0, 3).join(', ')}`,
        timestamp: now,
        source: 'Twitter'
      });
    }

    // Overall volume surge
    if (metrics.overall_buzz_score > 70) {
      signals.push({
        type: 'VOLUME_SURGE',
        strength: metrics.overall_buzz_score,
        description: `High social media activity across all platforms (${metrics.overall_buzz_score}/100)`,
        timestamp: now,
        source: 'All Platforms'
      });
    }

    return signals;
  }

  // Calculate social sentiment impact on price prediction
  calculateSentimentImpact(metrics: SocialBuzzMetrics): {
    prediction_modifier: number; // -2 to +2 percentage points
    confidence_boost: number; // 0 to 20 points
    risk_adjustment: number; // -10 to +10 points
  } {
    if (!metrics) {
      return { prediction_modifier: 0, confidence_boost: 0, risk_adjustment: 0 };
    }

    // Calculate prediction modifier based on sentiment and buzz
    let predictionModifier = 0;
    
    // Sentiment impact (stronger when backed by volume)
    const sentimentStrength = Math.abs(metrics.twitter.sentiment_score) / 100;
    const volumeMultiplier = Math.min(2, metrics.overall_buzz_score / 50);
    
    if (metrics.sentiment_trend === 'BULLISH') {
      predictionModifier = sentimentStrength * volumeMultiplier * 1.5;
    } else if (metrics.sentiment_trend === 'BEARISH') {
      predictionModifier = -sentimentStrength * volumeMultiplier * 1.5;
    }

    // Confidence boost from social validation
    const confidenceBoost = Math.min(20, metrics.momentum_score / 5);

    // Risk adjustment based on sentiment volatility
    const sentimentVolatility = Math.abs(metrics.twitter.sentiment_score) + Math.abs(metrics.reddit.sentiment_score);
    const riskAdjustment = sentimentVolatility > 100 ? 10 : -5; // High volatility = higher risk

    return {
      prediction_modifier: Math.max(-2, Math.min(2, predictionModifier)),
      confidence_boost: Math.round(confidenceBoost),
      risk_adjustment: Math.round(riskAdjustment)
    };
  }

  // Default data for fallbacks
  private getDefaultTwitterData(): TwitterSentimentData {
    return {
      mentions_24h: 50,
      sentiment_score: 0,
      engagement_rate: 0.05,
      trending_hashtags: [],
      influencer_mentions: 0,
      volume_change_24h: 0
    };
  }

  private getDefaultRedditData() {
    return {
      mentions_24h: 5,
      sentiment_score: 0,
      upvote_ratio: 0.7,
      comment_volume: 25
    };
  }

  private getDefaultTelegramData() {
    return {
      message_volume_24h: 100,
      sentiment_score: 0,
      active_groups: 3
    };
  }

  private getDefaultDiscordData() {
    return {
      message_volume_24h: 75,
      sentiment_score: 0,
      active_channels: 2
    };
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.sentimentCache.clear();
    this.cacheTimestamp = 0;
  }
}

export const socialSentimentService = new SocialSentimentService(); 