import { SentimentData, NewsItem } from '../types';

// Real free APIs for sentiment data
const FEAR_GREED_API = 'https://api.alternative.me/fng/';
const CRYPTO_NEWS_API = 'https://cryptopanic.com/api/v1/posts/';
const REDDIT_API = 'https://www.reddit.com/r/cryptocurrency.json';

class SentimentAnalysisService {
  private sentimentCache = new Map<string, SentimentData>();
  private newsCache: NewsItem[] = [];
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getSentimentData(coinId: string): Promise<SentimentData | null> {
    const cached = this.sentimentCache.get(coinId);
    const now = Date.now();

    if (cached && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Only use real APIs with actual data
      const [fearGreedData, redditData] = await Promise.all([
        this.getFearGreedIndex(),
        this.getRedditSentiment()
      ]);

      if (!fearGreedData) {
        console.warn('Fear & Greed API unavailable');
        return null;
      }

      const sentimentData: SentimentData = {
        twitter_sentiment: 0, // Will implement when Twitter API access is available
        reddit_sentiment: redditData?.sentiment || 0,
        news_sentiment: 0, // Will implement with real news API
        social_volume: redditData?.volume || 0,
        social_dominance: 0,
        sentiment_trend: this.calculateSentimentTrend(redditData?.sentiment || 0),
        fear_greed_index: fearGreedData.value
      };

      this.sentimentCache.set(coinId, sentimentData);
      this.cacheTimestamp = now;

      return sentimentData;
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
      return null; // Return null instead of mock data
    }
  }

  private async getFearGreedIndex(): Promise<{ value: number; classification: string } | null> {
    try {
      const response = await fetch(FEAR_GREED_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        value: parseInt(data.data[0].value),
        classification: data.data[0].value_classification
      };
    } catch (error) {
      console.error('Fear & Greed API error:', error);
      return null; // Return null instead of mock data
    }
  }

  private async getRedditSentiment(): Promise<{ sentiment: number; volume: number } | null> {
    try {
      const response = await fetch(REDDIT_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (!data.data?.children) {
        return null;
      }

      const posts = data.data.children;
      let totalScore = 0;
      let postCount = 0;

      posts.forEach((post: any) => {
        if (post.data?.score !== undefined) {
          totalScore += post.data.score;
          postCount++;
        }
      });

      if (postCount === 0) {
        return null;
      }

      // Convert Reddit scores to sentiment (0-100 scale)
      const avgScore = totalScore / postCount;
      const sentiment = Math.max(0, Math.min(100, 50 + (avgScore / 100) * 50));

      return {
        sentiment,
        volume: postCount
      };
    } catch (error) {
      console.error('Reddit API error:', error);
      return null;
    }
  }

  private calculateSentimentTrend(sentiment: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (sentiment > 60) return 'BULLISH';
    if (sentiment < 40) return 'BEARISH';
    return 'NEUTRAL';
  }

  async getMarketNews(limit: number = 20): Promise<NewsItem[]> {
    if (this.newsCache.length > 0 && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.newsCache.slice(0, limit);
    }

    try {
      // Use CryptoPanic free API (requires registration but is free)
      const response = await fetch(`${CRYPTO_NEWS_API}?auth_token=free&public=true`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results) {
        return [];
      }

      const news: NewsItem[] = data.results.slice(0, limit).map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        title: item.title || 'No title',
        description: item.title || 'No description',
        url: item.url || '',
        source: item.source?.title || 'Unknown',
        published_at: item.published_at || new Date().toISOString(),
        sentiment_score: this.calculateNewsSentiment(item.title || ''),
        relevance_score: item.votes?.liked || 0,
        related_coins: item.currencies?.map((c: any) => c.code.toLowerCase()) || [],
        category: this.categorizeNews(item.title || '')
      }));

      this.newsCache = news;
      return news;
    } catch (error) {
      console.error('Error fetching market news:', error);
      return []; // Return empty array instead of mock data
    }
  }

  private calculateNewsSentiment(title: string): number {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['bullish', 'surge', 'rally', 'gain', 'rise', 'up', 'positive', 'growth', 'adoption'];
    const negativeWords = ['bearish', 'crash', 'fall', 'drop', 'down', 'negative', 'decline', 'sell', 'dump'];
    
    const lowerTitle = title.toLowerCase();
    let score = 50; // Neutral baseline
    
    positiveWords.forEach(word => {
      if (lowerTitle.includes(word)) score += 10;
    });
    
    negativeWords.forEach(word => {
      if (lowerTitle.includes(word)) score -= 10;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  private categorizeNews(title: string): 'MARKET' | 'REGULATION' | 'TECHNOLOGY' | 'ADOPTION' | 'SECURITY' {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('regulation') || lowerTitle.includes('sec') || lowerTitle.includes('government')) {
      return 'REGULATION';
    }
    if (lowerTitle.includes('technology') || lowerTitle.includes('blockchain') || lowerTitle.includes('protocol')) {
      return 'TECHNOLOGY';
    }
    if (lowerTitle.includes('adoption') || lowerTitle.includes('partnership') || lowerTitle.includes('integration')) {
      return 'ADOPTION';
    }
    if (lowerTitle.includes('hack') || lowerTitle.includes('security') || lowerTitle.includes('exploit')) {
      return 'SECURITY';
    }
    
    return 'MARKET';
  }

  async analyzeSentimentTrend(coinId: string, timeframe: '1h' | '24h' | '7d'): Promise<{
    current: number;
    previous: number;
    change: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  } | null> {
    // This would require historical sentiment data which isn't available in free APIs
    // Return null to indicate feature not available with current API limitations
    console.warn('Sentiment trend analysis requires historical data not available in free APIs');
    return null;
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService(); 