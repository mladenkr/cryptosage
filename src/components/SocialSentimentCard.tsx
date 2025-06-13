import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Twitter as TwitterIcon,
  Reddit as RedditIcon,
  Telegram as TelegramIcon,
  Discord as DiscordIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Whatshot as WhatshotIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { SocialBuzzMetrics, SentimentSignal } from '../services/socialSentimentService';

interface SocialSentimentCardProps {
  coinSymbol: string;
  socialBuzz: SocialBuzzMetrics | null;
  sentimentSignals: SentimentSignal[];
  socialSentimentScore: number;
  sentimentImpact: {
    prediction_modifier: number;
    confidence_boost: number;
    risk_adjustment: number;
  };
  compact?: boolean;
}

const SocialSentimentCard: React.FC<SocialSentimentCardProps> = ({
  coinSymbol,
  socialBuzz,
  sentimentSignals,
  socialSentimentScore,
  sentimentImpact,
  compact = false
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  if (!socialBuzz) {
    return (
      <Card sx={{ mb: 2, opacity: 0.7 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PsychologyIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Social Sentiment
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Social sentiment data unavailable for {coinSymbol.toUpperCase()}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return theme.palette.success.main;
      case 'BEARISH': return theme.palette.error.main;
      default: return theme.palette.warning.main;
    }
  };

  const getSentimentIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return <TrendingUpIcon />;
      case 'BEARISH': return <TrendingDownIcon />;
      default: return <TrendingFlatIcon />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.palette.success.main;
    if (score >= 40) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PsychologyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Social Sentiment
            </Typography>
            <Chip
              label={socialBuzz.sentiment_trend}
              icon={getSentimentIcon(socialBuzz.sentiment_trend)}
              sx={{
                ml: 2,
                backgroundColor: getSentimentColor(socialBuzz.sentiment_trend),
                color: 'white',
                fontWeight: 600
              }}
              size="small"
            />
          </Box>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
            sx={{ color: theme.palette.text.secondary }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: getScoreColor(socialBuzz.overall_buzz_score) 
              }}>
                {socialBuzz.overall_buzz_score}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Buzz Score
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: getScoreColor(socialBuzz.momentum_score) 
              }}>
                {socialBuzz.momentum_score}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Momentum
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: sentimentImpact.prediction_modifier > 0 ? 
                  theme.palette.success.main : 
                  sentimentImpact.prediction_modifier < 0 ? 
                    theme.palette.error.main : 
                    theme.palette.text.secondary
              }}>
                {sentimentImpact.prediction_modifier > 0 ? '+' : ''}{sentimentImpact.prediction_modifier.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Price Impact
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: theme.palette.info.main 
              }}>
                +{sentimentImpact.confidence_boost}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confidence Boost
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Platform Overview */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
              <TwitterIcon sx={{ mr: 1, color: '#1DA1F2' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatNumber(socialBuzz.twitter.mentions_24h)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  mentions
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
              <RedditIcon sx={{ mr: 1, color: '#FF4500' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatNumber(socialBuzz.reddit.mentions_24h)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  posts
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
              <TelegramIcon sx={{ mr: 1, color: '#0088CC' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatNumber(socialBuzz.telegram.message_volume_24h)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  messages
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
              <DiscordIcon sx={{ mr: 1, color: '#7289DA' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatNumber(socialBuzz.discord.message_volume_24h)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  messages
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Sentiment Signals */}
        {sentimentSignals.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Active Signals
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {sentimentSignals.slice(0, 3).map((signal, index) => (
                <Tooltip key={index} title={signal.description}>
                  <Chip
                    icon={<WhatshotIcon />}
                    label={`${signal.type.replace('_', ' ')} (${signal.strength})`}
                    size="small"
                    sx={{
                      backgroundColor: signal.strength > 70 ? 
                        theme.palette.error.main : 
                        signal.strength > 40 ? 
                          theme.palette.warning.main : 
                          theme.palette.info.main,
                      color: 'white'
                    }}
                  />
                </Tooltip>
              ))}
              {sentimentSignals.length > 3 && (
                <Chip
                  label={`+${sentimentSignals.length - 3} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Expanded Details */}
        <Collapse in={expanded}>
          <Box sx={{ pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Grid container spacing={3}>
              {/* Twitter Details */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <TwitterIcon sx={{ mr: 1, color: '#1DA1F2' }} />
                  Twitter/X Details
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Sentiment Score:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {socialBuzz.twitter.sentiment_score.toFixed(1)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Engagement Rate:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(socialBuzz.twitter.engagement_rate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Influencer Mentions:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {socialBuzz.twitter.influencer_mentions}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Volume Change 24h:</Typography>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600,
                      color: socialBuzz.twitter.volume_change_24h > 0 ? 
                        theme.palette.success.main : 
                        theme.palette.error.main
                    }}>
                      {socialBuzz.twitter.volume_change_24h > 0 ? '+' : ''}{socialBuzz.twitter.volume_change_24h.toFixed(1)}%
                    </Typography>
                  </Box>
                  {socialBuzz.twitter.trending_hashtags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Trending: {socialBuzz.twitter.trending_hashtags.slice(0, 3).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Reddit Details */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <RedditIcon sx={{ mr: 1, color: '#FF4500' }} />
                  Reddit Details
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Sentiment Score:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {socialBuzz.reddit.sentiment_score.toFixed(1)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Upvote Ratio:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(socialBuzz.reddit.upvote_ratio * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Comment Volume:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatNumber(socialBuzz.reddit.comment_volume)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* All Sentiment Signals */}
            {sentimentSignals.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  All Sentiment Signals
                </Typography>
                {sentimentSignals.map((signal, index) => (
                  <Box key={index} sx={{ 
                    p: 1, 
                    mb: 1, 
                    backgroundColor: theme.palette.background.paper, 
                    borderRadius: 1,
                    borderLeft: `4px solid ${
                      signal.strength > 70 ? 
                        theme.palette.error.main : 
                        signal.strength > 40 ? 
                          theme.palette.warning.main : 
                          theme.palette.info.main
                    }`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {signal.type.replace(/_/g, ' ')}
                      </Typography>
                      <Chip
                        label={`${signal.strength}/100`}
                        size="small"
                        sx={{
                          backgroundColor: signal.strength > 70 ? 
                            theme.palette.error.main : 
                            signal.strength > 40 ? 
                              theme.palette.warning.main : 
                              theme.palette.info.main,
                          color: 'white'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {signal.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Source: {signal.source} • {new Date(signal.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default SocialSentimentCard; 