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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  ExpandMore as ExpandMoreIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { EnhancedCryptoAnalysis, enhancedAIAnalysis } from '../services/enhancedAIAnalysis';
import { useTheme } from '../contexts/ThemeContext';
import {
  formatCurrency,
  formatPercentage,
  getPercentageColor,
} from '../utils/formatters';

interface EnhancedAIRecommendationsProps {
  onCoinClick?: (coinId: string) => void;
}

const EnhancedAIRecommendations: React.FC<EnhancedAIRecommendationsProps> = ({ onCoinClick }) => {
  const { theme } = useTheme();
  const [recommendations, setRecommendations] = useState<EnhancedCryptoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<EnhancedCryptoAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('EnhancedAIRecommendations: Starting enhanced analysis...');
      const analyses = await enhancedAIAnalysis.getEnhancedRecommendations(20);
      
      if (analyses.length === 0) {
        setError('No enhanced recommendations available at this time. Please try again later.');
        return;
      }
      
      setRecommendations(analyses);
      setLastUpdated(new Date());
      console.log(`EnhancedAIRecommendations: Loaded ${analyses.length} enhanced recommendations`);
      
    } catch (err: any) {
      console.error('EnhancedAIRecommendations: Error loading recommendations:', err);
      setError(err.message || 'Failed to load enhanced recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleCoinClick = (coinId: string) => {
    if (onCoinClick) {
      onCoinClick(coinId);
    }
  };

  const handleViewDetails = (analysis: EnhancedCryptoAnalysis) => {
    setSelectedAnalysis(analysis);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAnalysis(null);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'LONG': return theme.palette.success.main;
      case 'SHORT': return theme.palette.error.main;
      default: return theme.palette.warning.main;
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'LONG': return <TrendingUpIcon />;
      case 'SHORT': return <TrendingDownIcon />;
      default: return <TrendingFlatIcon />;
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
      case 'ACCUMULATION': return theme.palette.info.main;
      case 'MARKUP': return theme.palette.success.main;
      case 'DISTRIBUTION': return theme.palette.warning.main;
      case 'MARKDOWN': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };



  if (loading) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Enhanced AI Analysis in Progress
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyzing 500+ cryptocurrencies from multiple data sources...
        </Typography>
        <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadRecommendations}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="primary" />
            Enhanced AI Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-source analysis of 500+ cryptocurrencies with advanced AI models
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Button
            variant="outlined"
            onClick={loadRecommendations}
            disabled={loading}
            startIcon={<PsychologyIcon />}
          >
            Refresh Analysis
          </Button>
          {lastUpdated && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {recommendations.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coins Analyzed
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {recommendations.filter(r => r.recommendation === 'LONG').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Long Signals
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {recommendations.filter(r => r.recommendation === 'SHORT').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Short Signals
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {recommendations.filter(r => r.recommendation === 'NEUTRAL').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Neutral Signals
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Recommendations Grid */}
      <Grid container spacing={2}>
        {recommendations.map((analysis, index) => (
          <Grid item xs={12} md={6} lg={4} key={analysis.coin.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8],
                },
                border: `2px solid ${getRecommendationColor(analysis.recommendation)}20`,
              }}
              onClick={() => handleCoinClick(analysis.coin.id)}
            >
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={analysis.coin.image}
                    alt={analysis.coin.name}
                    sx={{ width: 40, height: 40, mr: 2 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {analysis.coin.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {analysis.coin.symbol.toUpperCase()} • #{analysis.coin.market_cap_rank}
                    </Typography>
                  </Box>
                  <Chip
                    icon={getRecommendationIcon(analysis.recommendation)}
                    label={analysis.recommendation}
                    size="small"
                    sx={{
                      backgroundColor: `${getRecommendationColor(analysis.recommendation)}20`,
                      color: getRecommendationColor(analysis.recommendation),
                      fontWeight: 'bold',
                    }}
                  />
                </Box>

                {/* Price and Change */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(analysis.coin.current_price)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: getPercentageColor(analysis.coin.price_change_percentage_24h || 0),
                      fontWeight: 'bold',
                    }}
                  >
                    {formatPercentage(analysis.coin.price_change_percentage_24h || 0)} (24h)
                  </Typography>
                </Box>

                {/* AI Scores */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Overall Score</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {analysis.overallScore.toFixed(1)}/100
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
                        backgroundColor: analysis.overallScore > 70 ? theme.palette.success.main :
                                       analysis.overallScore > 50 ? theme.palette.warning.main :
                                       theme.palette.error.main,
                      },
                    }}
                  />
                </Box>

                {/* Key Metrics */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        24h Prediction
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ color: getPercentageColor(analysis.predictions['24h']) }}
                      >
                        {formatPercentage(analysis.predictions['24h'])}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Confidence
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {analysis.confidence.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Risk and Cycle */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={`Risk: ${analysis.riskLevel}`}
                    size="small"
                    sx={{
                      backgroundColor: `${getRiskLevelColor(analysis.riskLevel)}20`,
                      color: getRiskLevelColor(analysis.riskLevel),
                    }}
                  />
                  <Chip
                    label={analysis.marketCyclePosition}
                    size="small"
                    sx={{
                      backgroundColor: `${getMarketCycleColor(analysis.marketCyclePosition)}20`,
                      color: getMarketCycleColor(analysis.marketCyclePosition),
                    }}
                  />
                </Box>

                {/* Expandable Details */}
                <Accordion 
                  expanded={expandedCard === analysis.coin.id}
                  onChange={() => setExpandedCard(expandedCard === analysis.coin.id ? null : analysis.coin.id)}
                  sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 'auto' }}>
                    <Typography variant="body2" color="primary">
                      View Details
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0 }}>
                    {/* Multi-timeframe Predictions */}
                    <Typography variant="subtitle2" gutterBottom>
                      Multi-timeframe Predictions
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      {Object.entries(analysis.predictions).map(([timeframe, prediction]) => (
                        <Grid item xs={6} key={timeframe}>
                          <Box sx={{ textAlign: 'center', p: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {timeframe}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: getPercentageColor(prediction) }}
                            >
                              {formatPercentage(prediction)}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Model Scores */}
                    <Typography variant="subtitle2" gutterBottom>
                      AI Model Scores
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {[
                        { label: 'Technical', value: analysis.technicalScore },
                        { label: 'Fundamental', value: analysis.fundamentalScore },
                        { label: 'Sentiment', value: analysis.sentimentScore },
                      ].map(({ label, value }) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">{label}</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {value.toFixed(1)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Advanced Metrics */}
                    <Typography variant="subtitle2" gutterBottom>
                      Advanced Metrics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Liquidity Score</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {analysis.liquidityScore.toFixed(0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Volatility Risk</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {analysis.volatilityRisk.toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">BTC Correlation</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {analysis.correlationBTC.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(analysis);
                      }}
                    >
                      Full Analysis
                    </Button>
                  </AccordionDetails>
                </Accordion>
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

                {/* Model Confidences */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    AI Model Confidences
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(selectedAnalysis.modelConfidences).map(([model, confidence]) => (
                      <Grid item xs={12} sm={6} md={4} key={model}>
                        <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                            {model}
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

                {/* Trading Signals */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Trading Signals
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedAnalysis.signals.map((signal, index) => (
                      <Chip
                        key={index}
                        label={signal}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleCoinClick(selectedAnalysis.coin.id);
                  handleCloseDialog();
                }}
              >
                View Coin Details
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default EnhancedAIRecommendations; 