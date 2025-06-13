import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  Avatar,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tooltip,
  IconButton,
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
  ContentCopy as ContentCopyIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { EnhancedCryptoAnalysis } from '../services/enhancedAIAnalysis';
import { enhancedAIAnalysis } from '../services/enhancedAIAnalysis';
import { useTheme } from '../contexts/ThemeContext';
import { predictionTracker } from '../services/predictionTracker';
import PredictionAccuracyDisplay from './PredictionAccuracyDisplay';
import Sparkline from './Sparkline';
import {
  formatCurrency,
  formatPercentage,
  getPercentageColor,
} from '../utils/formatters';
import { copyToClipboard, formatContractAddress } from '../utils/dexUtils';
import { apiService } from '../services/api';
import { mexcApiService } from '../services/mexcApi';

interface EnhancedAIRecommendationsProps {
  onCoinClick?: (coinId: string) => void;
}

const EnhancedAIRecommendations: React.FC<EnhancedAIRecommendationsProps> = ({ onCoinClick }) => {
  const { theme } = useTheme();
  const [recommendations, setRecommendations] = useState<EnhancedCryptoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<EnhancedCryptoAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  
  // Real-time prices state
  const [useRealTimePrices, setUseRealTimePrices] = useState(true);
  const [loadingRealTime, setLoadingRealTime] = useState(false);
  
  // MEXC count state
  const [mexcUSDTCount, setMexcUSDTCount] = useState<number | null>(null);
  const [loadingMexcCount, setLoadingMexcCount] = useState(false);

  const [advancedMetricsOpen, setAdvancedMetricsOpen] = useState(false);
  const [selectedAdvancedAnalysis, setSelectedAdvancedAnalysis] = useState<EnhancedCryptoAnalysis | null>(null);

  const loadMexcCount = useCallback(async () => {
    try {
      setLoadingMexcCount(true);
      const count = await mexcApiService.getMEXCUSDTCount();
      setMexcUSDTCount(count);
      console.log(`MEXC USDT trading pairs count: ${count}`);
    } catch (error) {
      console.error('Failed to load MEXC count:', error);
      setMexcUSDTCount(null);
    } finally {
      setLoadingMexcCount(false);
    }
  }, []);

  const loadRecommendations = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setBackgroundLoading(true);
      }
      setError(null);
      
      console.log(`EnhancedAIRecommendations: Starting enhanced analysis... (${new Date().toISOString()})`);
      
      // AGGRESSIVE cache clearing
      console.log('🧹 AGGRESSIVE CACHE CLEARING...');
      localStorage.clear(); // Clear ALL localStorage
      sessionStorage.clear(); // Clear ALL sessionStorage
      
      // Clear any browser cache for this domain
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Force reload of all modules by adding timestamp
      console.log(`🔄 Force refresh timestamp: ${Date.now()}`);
      
      // Add a small delay to ensure cache clearing completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const analyses = await enhancedAIAnalysis.getEnhancedRecommendations(100);
      
      if (analyses.length === 0) {
        setError('No enhanced recommendations available at this time. Please try again later.');
        return;
      }
      
      setRecommendations(analyses);
      setLastUpdated(new Date());
      console.log(`EnhancedAIRecommendations: Loaded ${analyses.length} enhanced recommendations`);
      
      // Save predictions for accuracy tracking
      predictionTracker.savePredictions(analyses);
      console.log(`📊 Saved ${analyses.length} predictions for accuracy tracking`);
      
      // DISABLE caching for debugging
      console.log('🚫 Caching disabled - not storing results');
      // localStorage.setItem('enhanced_ai_cache', JSON.stringify({
      //   data: analyses,
      //   timestamp: Date.now()
      // }));
      
    } catch (error) {
      console.error('EnhancedAIRecommendations: Error loading recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  }, []);

  // DISABLE cache loading - always fetch fresh data
  useEffect(() => {
    // Load MEXC count
    loadMexcCount();
    
    console.log('🚫 Cache loading DISABLED - always fetching fresh data');
    
    // ALWAYS load fresh data with loader
    loadRecommendations(true);
  }, [loadRecommendations, loadMexcCount]);

  const handleCoinClick = (coinId: string, sourceUrl?: string) => {
    // Smart source linking - use source URL if available, otherwise fallback to CoinGecko
    const targetUrl = sourceUrl || `https://www.coingecko.com/en/coins/${coinId}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleViewDetails = (analysis: EnhancedCryptoAnalysis) => {
    setSelectedAnalysis(analysis);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAnalysis(null);
  };

  const handleCopyContract = async (contractAddress: string) => {
    const success = await copyToClipboard(contractAddress);
    setSnackbarMessage(success ? 'Contract address copied!' : 'Failed to copy address');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSignalFilterChange = (filter: 'ALL' | 'LONG' | 'SHORT') => {
    setSignalFilter(filter);
  };

  const handleRealTimePricesToggle = async () => {
    setLoadingRealTime(true);
    setUseRealTimePrices(!useRealTimePrices);
    
    // Update coin prices with MEXC real-time data if enabled
    if (!useRealTimePrices && recommendations.length > 0) {
      try {
        const coinsToUpdate = recommendations.map(r => r.coin);
        const updatedCoins = await apiService.getCoinsWithMEXCPrices('usd', 'market_cap_desc', coinsToUpdate.length, 1);
        
        // Update recommendations with new coin data
        const updatedRecommendations = recommendations.map(rec => {
          const updatedCoin = updatedCoins.find(coin => coin.id === rec.coin.id);
          return updatedCoin ? { ...rec, coin: updatedCoin } : rec;
        });
        
        setRecommendations(updatedRecommendations);
      } catch (error) {
        console.error('Failed to update with real-time prices:', error);
      }
    }
    
    setTimeout(() => setLoadingRealTime(false), 1000);
  };

  // Filter recommendations based on selected signal type
  const filteredRecommendations = (() => {
    let filtered = signalFilter === 'ALL' 
      ? recommendations 
      : recommendations.filter(r => r.recommendation === signalFilter);
    
    // Since we now use MEXC as primary source, all recommendations should already be MEXC coins
    return filtered;
  })();

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'LONG': return theme.palette.success.main;
      case 'SHORT': return theme.palette.error.main;
      default: return theme.palette.warning.main;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return theme.palette.success.main;
      case 'MEDIUM': return theme.palette.warning.main;
      case 'HIGH': return theme.palette.error.main;
      case 'VERY_HIGH': return theme.palette.error.dark;
      default: return theme.palette.grey[500];
    }
  };

  const getMarketCycleColor = (position: string) => {
    switch (position) {
      case 'ACCUMULATION': return theme.palette.success.main;
      case 'DISTRIBUTION': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };



  // Function to generate MEXC exchange URL for a coin
  const getMEXCUrl = (symbol: string): string => {
    // Convert symbol to uppercase and create MEXC trading pair URL
    const upperSymbol = symbol.toUpperCase();
    return `https://www.mexc.com/exchange/${upperSymbol}_USDT`;
  };

  // Handle direct MEXC buy button click
  const handleMEXCBuy = (event: React.MouseEvent, analysis: EnhancedCryptoAnalysis) => {
    event.stopPropagation();
    const mexcUrl = getMEXCUrl(analysis.coin.symbol);
    window.open(mexcUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAdvancedMetricsOpen = (analysis: EnhancedCryptoAnalysis) => {
    setSelectedAdvancedAnalysis(analysis);
    setAdvancedMetricsOpen(true);
  };

  const handleAdvancedMetricsClose = () => {
    setAdvancedMetricsOpen(false);
    setSelectedAdvancedAnalysis(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Enhanced AI Analysis in Progress
          </Typography>
                            <Typography variant="body2" color="text.secondary">
            Analyzing {mexcUSDTCount ? `${mexcUSDTCount.toLocaleString()}` : '2,000+'} USDT trading pairs from MEXC Exchange... (Showing top 100 results)
          </Typography>
          <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => loadRecommendations(true)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="primary" />
            CryptoSage AI Analysis
            {backgroundLoading && (
              <CircularProgress size={20} sx={{ ml: 1 }} />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advanced AI-powered cryptocurrency analysis with multi-source data from 2,000+ coins
            {backgroundLoading && (
              <Typography component="span" sx={{ ml: 1, color: 'primary.main', fontSize: '0.75rem' }}>
                • Updating in background...
              </Typography>
            )}
          </Typography>
          
          {/* MEXC Trading Pairs Information */}
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Analyzing from{' '}
              {loadingMexcCount ? (
                <CircularProgress size={12} sx={{ mx: 0.5 }} />
              ) : mexcUSDTCount ? (
                <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {mexcUSDTCount.toLocaleString()}
                </Typography>
              ) : (
                <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  2,000+
                </Typography>
              )}
              {' '}USDT trading pairs available on MEXC Exchange
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
            {/* Real-time Prices Toggle */}
            <Tooltip title={useRealTimePrices ? 'Disable real-time MEXC prices' : 'Enable real-time MEXC prices'}>
              <Button
                variant={useRealTimePrices ? "contained" : "outlined"}
                color="success"
                onClick={handleRealTimePricesToggle}
                disabled={loadingRealTime || loading || backgroundLoading}
                startIcon={loadingRealTime ? <CircularProgress size={16} /> : null}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  height: 40,
                  background: useRealTimePrices 
                    ? 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)'
                    : 'transparent',
                  border: useRealTimePrices ? 'none' : `2px solid ${theme.palette.success.main}`,
                  color: useRealTimePrices ? 'white' : theme.palette.success.main,
                  '&:hover': {
                    background: useRealTimePrices 
                      ? 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)'
                      : `${theme.palette.success.main}15`,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {loadingRealTime ? 'Switching...' : (
                  <>
                    <span style={{ fontWeight: 'bold' }}>⚡</span>
                    <span style={{ marginLeft: 4, fontSize: '0.85em' }}>Real-time</span>
                  </>
                )}
              </Button>
            </Tooltip>

            {/* MEXC Status Indicator */}
            <Tooltip title="All recommendations are sourced from MEXC USDT trading pairs">
              <Button
                variant="contained"
                color="primary"
                disabled
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 120,
                  height: 40,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                  opacity: 0.9,
                  cursor: 'default',
                  '&.Mui-disabled': {
                    color: 'white',
                    opacity: 0.9,
                  },
                }}
              >
                <span style={{ fontWeight: 'bold' }}>MEXC</span>
                <span style={{ marginLeft: 4, fontSize: '0.85em' }}>Source</span>
              </Button>
            </Tooltip>
            
            {/* Refresh Analysis Button */}
            <Button
              variant="outlined"
              onClick={() => loadRecommendations(true)}
              disabled={loading || backgroundLoading}
              startIcon={<PsychologyIcon />}
            >
              {backgroundLoading ? 'Updating...' : 'Refresh Analysis'}
            </Button>
          </Box>
          
          {/* Active Filter Indicators */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            {useRealTimePrices && (
              <Chip
                label="⚡ Real-time prices active"
                color="success"
                variant="filled"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
            
            <Chip
              label={`${filteredRecommendations.length} MEXC coins analyzed`}
              color="primary"
              variant="filled"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          
          {lastUpdated && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Statistics - Now Clickable Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: signalFilter === 'ALL' ? `2px solid ${theme.palette.primary.main}` : 'none',
              backgroundColor: signalFilter === 'ALL' ? `${theme.palette.primary.main}10` : 'inherit',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
              }
            }}
            onClick={() => handleSignalFilterChange('ALL')}
          >
            <Typography variant="h6" color="primary">
              {recommendations.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All Coins
            </Typography>
            {signalFilter === 'ALL' && (
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                ACTIVE
              </Typography>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: signalFilter === 'LONG' ? `2px solid ${theme.palette.success.main}` : 'none',
              backgroundColor: signalFilter === 'LONG' ? `${theme.palette.success.main}10` : 'inherit',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
              }
            }}
            onClick={() => handleSignalFilterChange('LONG')}
          >
            <Typography variant="h6" color="success.main">
              {recommendations.filter(r => r.recommendation === 'LONG').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Long Signals
            </Typography>
            {signalFilter === 'LONG' && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ACTIVE
              </Typography>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: signalFilter === 'SHORT' ? `2px solid ${theme.palette.error.main}` : 'none',
              backgroundColor: signalFilter === 'SHORT' ? `${theme.palette.error.main}10` : 'inherit',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
              }
            }}
            onClick={() => handleSignalFilterChange('SHORT')}
          >
            <Typography variant="h6" color="error.main">
              {recommendations.filter(r => r.recommendation === 'SHORT').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Short Signals
            </Typography>
            {signalFilter === 'SHORT' && (
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                ACTIVE
              </Typography>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Filter Status */}
      {(signalFilter !== 'ALL') && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: `${theme.palette.primary.main}10`, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
            Showing {filteredRecommendations.length} {signalFilter} Signal{filteredRecommendations.length !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "All Coins" above to see all recommendations
          </Typography>
        </Box>
      )}

      {/* No Results Message */}
      {filteredRecommendations.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {signalFilter !== 'ALL' && (
              <>No {signalFilter} signals found</>
            )}
            {signalFilter === 'ALL' && (
              <>No recommendations available</>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {signalFilter !== 'ALL' && (
              <>Click "All Coins" above to see all recommendations</>
            )}
            {signalFilter === 'ALL' && (
              <>All recommendations are sourced from MEXC USDT trading pairs. Try refreshing the analysis.</>
            )}
          </Typography>
        </Box>
      )}

      {/* Recommendations Grid */}
      <Grid container spacing={2}>
        {filteredRecommendations.map((analysis, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={analysis.coin.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
                },
                height: '100%',
                border: `2px solid ${getRecommendationColor(analysis.recommendation)}`,
                backgroundColor: `${getRecommendationColor(analysis.recommendation)}10`,
                borderRadius: 3,
              }}
              onClick={() => handleCoinClick(analysis.coin.id, analysis.coin.source_url)}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Rank Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Chip
                    label={`#${index + 1}`}
                    size="medium"
                    sx={{
                      backgroundColor: getRecommendationColor(analysis.recommendation),
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.5px',
                      height: 32,
                      minWidth: 48,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      '& .MuiChip-label': {
                        px: 1.5,
                        fontFamily: 'monospace',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      },
                    }}
                  />
                  {index < 5 && (
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
                    {/* Market Cap */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                      MCap: {analysis.coin.market_cap > 1000000000 
                        ? `$${(analysis.coin.market_cap / 1000000000).toFixed(1)}B` 
                        : analysis.coin.market_cap > 1000000 
                        ? `$${(analysis.coin.market_cap / 1000000).toFixed(1)}M` 
                        : `$${(analysis.coin.market_cap / 1000).toFixed(0)}K`}
                    </Typography>
                    
                    {/* Contract Address */}
                    {analysis.coin.contract_address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mr: 0.5 }}>
                          {formatContractAddress(analysis.coin.contract_address)}
                        </Typography>
                        <Tooltip title="Copy contract address">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContract(analysis.coin.contract_address!);
                            }}
                            sx={{ p: 0.25 }}
                          >
                            <ContentCopyIcon sx={{ fontSize: '0.7rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Price */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatCurrency(analysis.coin.current_price)}
                  </Typography>
                  
                  {/* Real-time price indicator */}
                  {analysis.coin.price_source === 'MEXC' && (
                    <Chip
                      label="⚡"
                      size="small"
                      sx={{
                        height: 18,
                        minWidth: 18,
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        fontSize: '0.6rem',
                        '& .MuiChip-label': {
                          px: 0.3,
                        },
                      }}
                      title="Real-time MEXC price"
                    />
                  )}
                </Box>

                {/* Price Change */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {(analysis.coin.price_change_percentage_24h || 0) >= 0 ? (
                    <TrendingUpIcon
                      sx={{
                        color: getPercentageColor(analysis.coin.price_change_percentage_24h || 0),
                        mr: 0.5,
                        fontSize: '1rem',
                      }}
                    />
                  ) : (
                    <TrendingDownIcon
                      sx={{
                        color: getPercentageColor(analysis.coin.price_change_percentage_24h || 0),
                        mr: 0.5,
                        fontSize: '1rem',
                      }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      color: getPercentageColor(analysis.coin.price_change_percentage_24h || 0),
                      fontWeight: 600,
                    }}
                  >
                    {formatPercentage(analysis.coin.price_change_percentage_24h || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (24h)
                  </Typography>
                </Box>

                {/* Volume and 24h Range */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    Vol: {analysis.coin.total_volume > 1000000000 
                      ? `$${(analysis.coin.total_volume / 1000000000).toFixed(1)}B` 
                      : analysis.coin.total_volume > 1000000 
                      ? `$${(analysis.coin.total_volume / 1000000).toFixed(1)}M` 
                      : `$${(analysis.coin.total_volume / 1000).toFixed(0)}K`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    Range: {formatCurrency(analysis.coin.low_24h || analysis.coin.current_price * 0.95)} - {formatCurrency(analysis.coin.high_24h || analysis.coin.current_price * 1.05)}
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
                      color={getPercentageColor(analysis.coin.price_change_percentage_24h || 0)}
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
                      {analysis.overallScore.toFixed(0)}/100
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.overallScore}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: analysis.overallScore >= 80 ? '#00A532' : 
                                       analysis.overallScore >= 65 ? '#4CAF50' : '#FF9800',
                      },
                    }}
                  />
                </Box>

                {/* Enhanced AI Recommendation */}
                <Chip
                  label={analysis.recommendation.replace('_', ' ')}
                  size="small"
                  sx={{
                    backgroundColor: getRecommendationColor(analysis.recommendation),
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
                    label={analysis.riskLevel}
                    size="small"
                    sx={{
                      backgroundColor: getRiskLevelColor(analysis.riskLevel),
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>

                {/* Enhanced Predictions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    1h Prediction
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      color: getPercentageColor(analysis.predictions['1h'])
                    }}
                  >
                    {analysis.predictions['1h'] > 0 ? '+' : ''}{analysis.predictions['1h'].toFixed(1)}%
                  </Typography>
                </Box>

                {/* Confidence Score */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {analysis.confidence.toFixed(0)}%
                  </Typography>
                </Box>

                {/* Market Cycle Position */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Market Cycle
                  </Typography>
                  <Chip
                    label={analysis.marketCyclePosition}
                    size="small"
                    sx={{
                      backgroundColor: getMarketCycleColor(analysis.marketCyclePosition),
                      color: 'white',
                      fontSize: '0.65rem',
                      height: 18,
                    }}
                  />
                </Box>

                {/* MEXC Buy Button */}
                {analysis.coin.symbol && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ShoppingCartIcon />}
                      onClick={(e) => handleMEXCBuy(e, analysis)}
                      sx={{ 
                        fontSize: '0.75rem', 
                        py: 0.5,
                        borderColor: '#2196F3',
                        color: '#2196F3',
                        '&:hover': {
                          borderColor: '#1976D2',
                          backgroundColor: '#2196F315',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Buy on MEXC
                    </Button>
                  </Box>
                )}

                {/* Advanced Metrics Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdvancedMetricsOpen(analysis);
                  }}
                  startIcon={<InfoIcon />}
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    height: 36,
                    background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                    color: 'white',
                    border: 'none',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #7B1FA2 30%, #C2185B 90%)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Advanced Metrics
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Analysis Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        {selectedAnalysis && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedAnalysis.coin.image}
                  alt={selectedAnalysis.coin.name}
                  sx={{ width: 40, height: 40 }}
                />
                <Box>
                  <Typography variant="h6">
                    {selectedAnalysis.coin.name} Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAnalysis.coin.symbol.toUpperCase()} • Rank #{selectedAnalysis.coin.market_cap_rank}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              {/* Prediction Accuracy Display */}
              <PredictionAccuracyDisplay 
                coinId={selectedAnalysis.coin.id}
                coinSymbol={selectedAnalysis.coin.symbol}
                compact={false}
              />
              
              <Grid container spacing={3}>
                {/* Risk Factors */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    Risk Factors
                  </Typography>
                  <List dense>
                    {selectedAnalysis.riskFactors.map((risk, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={risk} />
                      </ListItem>
                    ))}
                    {selectedAnalysis.riskFactors.length === 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="No significant risk factors identified" />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* Opportunity Factors */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StarIcon color="success" />
                    Opportunities
                  </Typography>
                  <List dense>
                    {selectedAnalysis.opportunityFactors.map((opportunity, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={opportunity} />
                      </ListItem>
                    ))}
                    {selectedAnalysis.opportunityFactors.length === 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <InfoIcon color="info" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="No specific opportunities identified" />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* Technical Confidence */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Technical Analysis Confidence
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(selectedAnalysis.technicalConfidence).map(([indicator, confidence]) => (
                      <Grid item xs={12} sm={6} md={4} key={indicator}>
                        <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                            {indicator.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {confidence.toFixed(0)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={confidence}
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Prediction Summary */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Prediction Summary
                  </Typography>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>1h Prediction:</strong> {selectedAnalysis.predictions['1h'] > 0 ? '+' : ''}{selectedAnalysis.predictions['1h'].toFixed(2)}%
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Recommendation:</strong> {selectedAnalysis.recommendation}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Confidence:</strong> {selectedAnalysis.confidence.toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleCoinClick(selectedAnalysis.coin.id, selectedAnalysis.coin.source_url);
                  handleCloseDialog();
                }}
              >
                View Coin Details
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Advanced Metrics Dialog */}
      <Dialog
        open={advancedMetricsOpen}
        onClose={handleAdvancedMetricsClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh' }
        }}
      >
        {selectedAdvancedAnalysis && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedAdvancedAnalysis.coin.image}
                  alt={selectedAdvancedAnalysis.coin.name}
                  sx={{ width: 40, height: 40 }}
                />
                <Box>
                  <Typography variant="h6">
                    {selectedAdvancedAnalysis.coin.name} - Advanced Metrics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAdvancedAnalysis.coin.symbol.toUpperCase()} • Detailed Technical Analysis
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleAdvancedMetricsClose}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Multi-timeframe Predictions */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon color="primary" />
                    Multi-timeframe Predictions
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(selectedAdvancedAnalysis.predictions).map(([timeframe, value]) => (
                      <Grid item xs={12} sm={6} md={4} key={timeframe}>
                        <Box 
                          sx={{ 
                            p: 2,
                            border: `2px solid ${getPercentageColor(value)}`,
                            borderRadius: 2,
                            backgroundColor: `${getPercentageColor(value)}10`,
                            textAlign: 'center'
                          }}
                        >
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              mb: 1
                            }}
                          >
                            {timeframe}
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{ 
                              fontWeight: 700,
                              color: getPercentageColor(value)
                            }}
                          >
                            {value > 0 ? '+' : ''}{value.toFixed(1)}%
                          </Typography>
                          {value > 0 ? (
                            <TrendingUpIcon sx={{ fontSize: '1.5rem', color: getPercentageColor(value), mt: 1 }} />
                          ) : value < 0 ? (
                            <TrendingDownIcon sx={{ fontSize: '1.5rem', color: getPercentageColor(value), mt: 1 }} />
                          ) : null}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Technical Indicators */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon color="primary" />
                    Technical Indicators
                  </Typography>
                  <Box sx={{ space: 2 }}>
                    {Object.entries(selectedAdvancedAnalysis.technicalConfidence).map(([indicator, confidence]) => (
                      <Box key={indicator} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                            {indicator.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {confidence.toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={confidence}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Grid>

                {/* Advanced Metrics */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon color="primary" />
                    Advanced Metrics
                  </Typography>
                  <Box sx={{ space: 2 }}>
                    <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Liquidity Score</Typography>
                      <Typography variant="h5" color="primary">
                        {selectedAdvancedAnalysis.liquidityScore.toFixed(0)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={selectedAdvancedAnalysis.liquidityScore}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Volatility Risk</Typography>
                      <Typography variant="h5" color="error">
                        {selectedAdvancedAnalysis.volatilityRisk.toFixed(0)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={selectedAdvancedAnalysis.volatilityRisk}
                        color="error"
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Market Cycle</Typography>
                      <Typography variant="h6" color={getMarketCycleColor(selectedAdvancedAnalysis.marketCyclePosition)}>
                        {selectedAdvancedAnalysis.marketCyclePosition}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Prediction Accuracy */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StarIcon color="warning" />
                    Prediction Accuracy
                  </Typography>
                  <PredictionAccuracyDisplay 
                    coinId={selectedAdvancedAnalysis.coin.id}
                    coinSymbol={selectedAdvancedAnalysis.coin.symbol}
                    compact={false}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleAdvancedMetricsClose}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleViewDetails(selectedAdvancedAnalysis);
                  handleAdvancedMetricsClose();
                }}
              >
                Full Analysis
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>

    {/* Snackbar for notifications */}
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={3000}
      onClose={handleSnackbarClose}
      message={snackbarMessage}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />

    </Container>
  );
};

export default EnhancedAIRecommendations; 