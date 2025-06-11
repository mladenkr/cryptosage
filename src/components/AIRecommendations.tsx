import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Psychology as PsychologyIcon,

  Info as InfoIcon,
  Star as StarIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { CryptoAnalysis } from '../services/technicalAnalysis';
import { cacheService } from '../services/cacheService';
import { scheduledDataFetcher } from '../services/scheduledDataFetcher';
import { useTheme } from '../contexts/ThemeContext';
import Sparkline from './Sparkline';
import {
  formatCurrency,
  formatPercentage,
  getPercentageColor,
} from '../utils/formatters';

interface AIRecommendationsProps {
  onCoinClick?: (coinId: string) => void;
}

interface AILogicDialogProps {
  open: boolean;
  onClose: () => void;
  analysis: CryptoAnalysis;
}

const AILogicDialog: React.FC<AILogicDialogProps> = ({ open, onClose, analysis }) => {
  const { theme, mode } = useTheme();

  const getSignalIcon = (signal: string) => {
    if (signal.includes('Bullish') || signal.includes('Golden Cross') || signal.includes('Oversold')) {
      return <CheckCircleIcon sx={{ color: '#00A532', fontSize: '1.2rem' }} />;
    } else if (signal.includes('Overbought') || signal.includes('Bearish')) {
      return <ErrorIcon sx={{ color: '#F44336', fontSize: '1.2rem' }} />;
    } else {
      return <WarningIcon sx={{ color: '#FF9800', fontSize: '1.2rem' }} />;
    }
  };

  const getSignalExplanation = (signal: string) => {
    const explanations: { [key: string]: string } = {
      'RSI Oversold': 'RSI below 30 indicates the asset may be oversold and due for a price bounce.',
      'RSI Overbought': 'RSI above 70 suggests the asset may be overbought and due for a correction.',
      'MACD Bullish': 'MACD line above signal line indicates bullish momentum and potential upward price movement.',
      'Above SMA20': 'Price trading above 20-day Simple Moving Average shows short-term bullish trend.',
      'Golden Cross': 'Short-term moving average crossing above long-term MA is a strong bullish signal.',
      'Bollinger Oversold': 'Price near lower Bollinger Band suggests oversold conditions and potential reversal.',
    };
    return explanations[signal] || 'Technical indicator providing market insight.';
  };

  const getRecommendationExplanation = (recommendation: string, predicted24hChange: number) => {
    switch (recommendation) {
      case 'LONG':
        return `AI predicts a ${predicted24hChange.toFixed(1)}% price increase in the next 24 hours based on bullish technical indicators and positive market momentum.`;
      case 'SHORT':
        return `AI predicts a ${Math.abs(predicted24hChange).toFixed(1)}% price decrease in the next 24 hours based on bearish technical indicators and negative market momentum.`;
      case 'NEUTRAL':
        return `AI predicts minimal price movement (${predicted24hChange.toFixed(1)}%) in the next 24 hours due to mixed or neutral technical signals.`;
      default:
        return 'AI analysis based on technical indicators and market data.';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: mode === 'light' ? '#FFFBFE' : '#1C1B1F',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SmartToyIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '1.5rem' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                AI Logic: {analysis.coin.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Technical Analysis Breakdown
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Recommendation Summary */}
        <Card sx={{ mb: 3, backgroundColor: mode === 'light' ? '#EADDFF' : '#4A4458' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={analysis.recommendation}
                sx={{
                  backgroundColor: analysis.recommendation === 'LONG' ? '#00A532' : 
                                 analysis.recommendation === 'SHORT' ? '#F44336' : '#FF9800',
                  color: 'white',
                  fontWeight: 600,
                  mr: 2,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {analysis.predicted24hChange > 0 ? '+' : ''}{analysis.predicted24hChange.toFixed(1)}% Predicted
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {getRecommendationExplanation(analysis.recommendation, analysis.predicted24hChange)}
            </Typography>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          AI Score Breakdown
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {analysis.technicalScore.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Technical Score
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
                Based on RSI, MACD, moving averages, and momentum indicators
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                {analysis.fundamentalScore.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fundamental Score
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
                Market cap, volume, liquidity, and adoption metrics
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                {analysis.sentimentScore.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sentiment Score
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
                Market sentiment and recent price momentum
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Technical Indicators */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Technical Indicators
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                RSI (14-day)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {analysis.indicators.rsi.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.indicators.rsi < 30 ? 'Oversold' : 
                   analysis.indicators.rsi > 70 ? 'Overbought' : 'Neutral'}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={analysis.indicators.rsi}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: analysis.indicators.rsi < 30 ? '#00A532' : 
                                   analysis.indicators.rsi > 70 ? '#F44336' : '#FF9800',
                  },
                }}
              />
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                MACD Signal
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {analysis.indicators.macd.MACD.toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.indicators.macd.MACD > analysis.indicators.macd.signal ? 'Bullish' : 'Bearish'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Signal: {analysis.indicators.macd.signal.toFixed(4)}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Trading Signals */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Active Trading Signals
        </Typography>
        
        {analysis.signals.length > 0 ? (
          <List sx={{ bgcolor: mode === 'light' ? '#F7F2FA' : '#2A2A2A', borderRadius: 2, mb: 2 }}>
            {analysis.signals.map((signal, index) => (
              <ListItem key={index} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getSignalIcon(signal)}
                </ListItemIcon>
                <ListItemText
                  primary={signal}
                  secondary={getSignalExplanation(signal)}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.8rem' }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No specific trading signals detected at this time.
          </Typography>
        )}

        {/* Risk Assessment */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Risk Assessment
        </Typography>
        
        <Card sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Risk Level
            </Typography>
            <Chip
              label={analysis.riskLevel}
              size="small"
              sx={{
                backgroundColor: analysis.riskLevel === 'LOW' ? '#4CAF50' : 
                               analysis.riskLevel === 'HIGH' ? '#F44336' : '#FF9800',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Confidence Level
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {analysis.confidence.toFixed(0)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Price Target (24h)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatCurrency(analysis.priceTarget)}
            </Typography>
          </Box>
        </Card>

        {/* Disclaimer */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            This analysis is for informational purposes only and should not be considered as financial advice. 
            Cryptocurrency investments carry high risk and past performance does not guarantee future results.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="contained" fullWidth>
          Close Analysis
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AIRecommendations: React.FC<AIRecommendationsProps> = ({ onCoinClick }) => {
  const { theme, mode } = useTheme();
  const [recommendations, setRecommendations] = useState<CryptoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CryptoAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetcherStatus, setFetcherStatus] = useState(scheduledDataFetcher.getStatus());

  const loadCachedData = useCallback(() => {
    const cached = cacheService.getCachedRecommendations();
    if (cached) {
      console.log('AIRecommendations: Loading cached data, count:', cached.recommendations.length);
      setRecommendations(cached.recommendations);
      setLastUpdated(cached.fetchedAt);
      setError(null);
      return true;
    }
    return false;
  }, []);

  const initializeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to load cached data
      if (loadCachedData()) {
        setLoading(false);
        return;
      }
      
      // If no cached data and it's time to fetch, try to fetch
      if (cacheService.isTimeForNextFetch()) {
        console.log('AIRecommendations: No cached data available, attempting fresh fetch...');
        try {
          const success = await scheduledDataFetcher.fetchDataNow();
          if (success) {
            loadCachedData();
          } else {
            setError('Unable to load cryptocurrency data. Please wait for the next scheduled update.');
          }
        } catch (err: any) {
          console.error('AIRecommendations: Error during initial fetch:', err);
          setError('Failed to load AI recommendations. Data will be available at the next scheduled update.');
        }
      } else {
        setError('No Meteora DEX data available. Data updates automatically every hour.');
      }
    } catch (err: any) {
      console.error('AIRecommendations: Error during initialization:', err);
      setError('Failed to initialize AI recommendations. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [loadCachedData]);

  // Update fetcher status periodically
  useEffect(() => {
    const updateStatus = () => {
      setFetcherStatus(scheduledDataFetcher.getStatus());
      
      // Check if new data is available
      if (!loading && !scheduledDataFetcher.isFetchingData()) {
        loadCachedData();
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [loading, loadCachedData]);

  useEffect(() => {
    // Load initial data first without initializing the scheduler
    initializeData();
    
    // Initialize the scheduled data fetcher after a delay to avoid initialization conflicts
    const timer = setTimeout(() => {
      try {
        scheduledDataFetcher.init();
      } catch (error) {
        console.error('Error initializing scheduled data fetcher:', error);
      }
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clean up if component unmounts
      try {
        scheduledDataFetcher.stop();
      } catch (error) {
        console.error('Error stopping scheduled data fetcher:', error);
      }
    };
  }, [initializeData]);



  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'LONG':
        return '#00A532'; // Green for bullish prediction
      case 'NEUTRAL':
        return '#FF9800'; // Orange for neutral prediction
      case 'SHORT':
        return '#F44336'; // Red for bearish prediction
      default:
        return theme.palette.text.secondary;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return '#4CAF50';
      case 'MEDIUM':
        return '#FF9800';
      case 'HIGH':
        return '#F44336';
      default:
        return theme.palette.text.secondary;
    }
  };

  const handleCoinClick = (analysis: CryptoAnalysis) => {
    if (onCoinClick) {
      onCoinClick(analysis.coin.id);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PsychologyIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              AI-Powered Recommendations
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Analyzing Top 200 Cryptocurrencies
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Our AI is performing technical analysis on market data to identify the best investment opportunities...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PsychologyIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              AI-Powered Recommendations
            </Typography>
          </Box>
          
          <Alert 
            severity="error" 
            action={
              cacheService.isTimeForNextFetch() ? (
                <Button color="inherit" size="small" onClick={() => initializeData()}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                backgroundColor: mode === 'light' ? '#EADDFF' : '#4A4458', // Primary container
                borderRadius: 3,
                p: 1.5,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PsychologyIcon sx={{ color: mode === 'light' ? '#21005D' : '#E8DEF8', fontSize: '1.5rem' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 400, mb: 0.5 }}>
                AI-Powered Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Top 10 cryptocurrencies with highest predicted 24h price volatility
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdated && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Updated: {lastUpdated.toLocaleDateString('en-GB', { 
                    timeZone: 'Europe/Berlin',
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
                {(() => {
                  const cacheStatus = cacheService.getCacheStatus();
                  if (cacheStatus.hasCache) {
                    return (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {cacheStatus.isFresh ? '🟢 Current hour data' : `🟡 Waiting for next hour`}
                      </Typography>
                    );
                  }
                  return (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      🔄 Scheduled updates every hour
                    </Typography>
                  );
                })()}
              </Box>
            )}
            
            <Tooltip title={`Next update: ${scheduledDataFetcher.getTimeUntilNextFetch()}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Next update: ${scheduledDataFetcher.getTimeUntilNextFetch()}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />
                {fetcherStatus.isFetching && (
                  <CircularProgress size={16} />
                )}
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* Recommendations Grid */}
        {recommendations.length > 0 ? (
          <Grid container spacing={2}>
            {recommendations.map((analysis, index) => {
              // Debug logging for undefined values
              if (analysis.predicted24hChange === undefined || analysis.predicted24hChange === null) {
                console.warn('Missing predicted24hChange for coin:', analysis.coin.name, 'Value:', analysis.predicted24hChange, 'Full analysis:', analysis);
              }
              if (analysis.overallScore === undefined || analysis.overallScore === null) {
                console.warn('Missing overallScore for coin:', analysis.coin.name, 'Value:', analysis.overallScore, 'Full analysis:', analysis);
              }
              if (analysis.confidence === undefined || analysis.confidence === null) {
                console.warn('Missing confidence for coin:', analysis.coin.name, 'Value:', analysis.confidence, 'Full analysis:', analysis);
              }
              
              return (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={analysis.coin.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design 3 easing
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)', // Elevation 2
                    },
                    height: '100%',
                    border: index < 3 ? `2px solid #6750A4` : 'none', // Primary border for top 3
                    backgroundColor: index < 3 
                      ? (mode === 'light' ? '#EADDFF' : '#4A4458') // Primary container for top 3
                      : (mode === 'light' ? '#FFFBFE' : '#1C1B1F'), // Surface
                    borderRadius: 3, // 12px
                  }}
                                     onClick={() => handleCoinClick(analysis)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Rank Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip
                        label={`#${index + 1}`}
                        size="small"
                        sx={{
                          backgroundColor: index < 3 
                            ? (mode === 'light' ? '#21005D' : '#EADDFF') // Primary dark or primary container
                            : (mode === 'light' ? '#E8DEF8' : '#4A4458'), // Secondary container
                          color: index < 3 
                            ? (mode === 'light' ? '#FFFFFF' : '#21005D') // White or on primary container
                            : (mode === 'light' ? '#1D192B' : '#E8DEF8'), // On secondary container
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          letterSpacing: '0.5px',
                        }}
                      />
                      {index < 3 && (
                        <StarIcon sx={{ color: theme.palette.warning.main, fontSize: '1.2rem' }} />
                      )}
                    </Box>

                    {/* Coin Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={analysis.coin.image}
                        alt={analysis.coin.name}
                        sx={{ width: 32, height: 32, mr: 1 }}
                      />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {analysis.coin.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {analysis.coin.symbol.toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Price */}
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatCurrency(analysis.coin.current_price)}
                    </Typography>

                    {/* Price Change */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {analysis.coin.price_change_percentage_24h >= 0 ? (
                        <TrendingUpIcon
                          sx={{
                            color: getPercentageColor(analysis.coin.price_change_percentage_24h),
                            mr: 0.5,
                            fontSize: '1rem',
                          }}
                        />
                      ) : (
                        <TrendingDownIcon
                          sx={{
                            color: getPercentageColor(analysis.coin.price_change_percentage_24h),
                            mr: 0.5,
                            fontSize: '1rem',
                          }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: getPercentageColor(analysis.coin.price_change_percentage_24h),
                          fontWeight: 600,
                        }}
                      >
                        {formatPercentage(analysis.coin.price_change_percentage_24h)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (24h)
                      </Typography>
                    </Box>

                    {/* 24-hour Sparkline Chart */}
                    {analysis.coin.sparkline_in_24h?.price && analysis.coin.sparkline_in_24h.price.length > 1 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          24h trend
                        </Typography>
                        <Sparkline
                          data={analysis.coin.sparkline_in_24h.price}
                          color={getPercentageColor(analysis.coin.price_change_percentage_24h)}
                          height={30}
                        />
                      </Box>
                    )}

                    {/* AI Score */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          AI Score
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {(analysis.overallScore || 0).toFixed(0)}/100
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={analysis.overallScore || 0}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: mode === 'light' ? theme.palette.grey[200] : '#49454F',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: (analysis.overallScore || 0) >= 80 ? '#00A532' : 
                                           (analysis.overallScore || 0) >= 65 ? '#4CAF50' : '#FF9800',
                          },
                        }}
                      />
                    </Box>

                    {/* Recommendation */}
                    <Chip
                      label={(analysis.recommendation || 'NEUTRAL').replace('_', ' ')}
                      size="small"
                      sx={{
                        backgroundColor: getRecommendationColor(analysis.recommendation || 'NEUTRAL'),
                        color: 'white',
                        fontWeight: 600,
                        mb: 1,
                        width: '100%',
                      }}
                    />

                    {/* Risk Level */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Risk Level
                      </Typography>
                      <Chip
                        label={analysis.riskLevel || 'MEDIUM'}
                        size="small"
                        sx={{
                          backgroundColor: getRiskColor(analysis.riskLevel || 'MEDIUM'),
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>

                    {/* Predicted 24h Change */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        24h Prediction
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600,
                          color: (analysis.predicted24hChange || 0) > 0 ? '#00A532' : 
                                 (analysis.predicted24hChange || 0) < 0 ? '#F44336' : 
                                 theme.palette.text.secondary
                        }}
                      >
                        {(analysis.predicted24hChange || 0) > 0 ? '+' : ''}{(analysis.predicted24hChange || 0).toFixed(1)}%
                      </Typography>
                    </Box>

                    {/* Price Target */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Target Price
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {formatCurrency(analysis.priceTarget || 0)}
                      </Typography>
                    </Box>

                    {/* Confidence */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Confidence
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {(analysis.confidence || 0).toFixed(0)}%
                      </Typography>
                    </Box>

                    {/* AI Logic Button */}
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      startIcon={<SmartToyIcon sx={{ fontSize: '1rem' }} />}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        setSelectedAnalysis(analysis);
                        setDialogOpen(true);
                      }}
                      sx={{
                        backgroundColor: mode === 'light' ? '#6750A4' : '#D0BCFF',
                        color: mode === 'light' ? '#FFFFFF' : '#21005D',
                        '&:hover': {
                          backgroundColor: mode === 'light' ? '#5A3F9A' : '#E8DEF8',
                          boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.3)',
                        },
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        py: 1,
                        px: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        letterSpacing: '0.5px',
                        boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      AI Logic
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No recommendations available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unable to generate recommendations at this time. Please try again later.
            </Typography>
          </Box>
        )}

        {/* Analysis Info */}
        {recommendations.length > 0 && (
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            backgroundColor: mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
            borderRadius: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoIcon sx={{ mr: 1, fontSize: '1rem', color: theme.palette.info.main }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                How AI Analysis Works
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Our AI analyzes technical indicators (RSI, MACD, Moving Averages), fundamental metrics (market cap, volume, momentum), 
              and sentiment data to predict 24-hour price movements. LONG = price expected to rise &gt;2%, NEUTRAL = minimal change (-2% to 2%), 
              SHORT = price expected to fall &gt;2%. Top 10 coins ranked by highest predicted price volatility (up or down).
            </Typography>
          </Box>
        )}

        {/* AI Logic Dialog */}
        {selectedAnalysis && (
          <AILogicDialog
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setSelectedAnalysis(null);
            }}
            analysis={selectedAnalysis}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations; 