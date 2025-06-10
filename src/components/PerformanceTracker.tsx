import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  MonetizationOn as MoneyIcon,
} from '@mui/icons-material';
import { cacheService, DailyPerformance } from '../services/cacheService';
import { coinGeckoApi } from '../services/api';
import {
  formatCurrency,
  formatPercentage,
} from '../utils/formatters';

interface PerformanceTrackerProps {
  onCoinClick?: (coinId: string) => void;
}

const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({ onCoinClick }) => {
  const { theme } = useTheme();
  const [performance, setPerformance] = useState<DailyPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPerformanceData = () => {
    const latestPerformance = cacheService.getLatestPerformance();
    setPerformance(latestPerformance);
    setLastUpdated(latestPerformance ? new Date(latestPerformance.timestamp) : null);
    setLoading(false);
  };

  const updatePerformanceData = useCallback(async () => {
    try {
      await cacheService.updatePerformanceData(async (coinId: string) => {
        try {
          // Try to get current price from API
          const coins = await coinGeckoApi.getCoins('usd', 'market_cap_desc', 250, 1);
          const coin = coins.find(c => c.id === coinId);
          return coin ? coin.current_price : 0;
        } catch (error) {
          console.error(`Failed to get price for ${coinId}:`, error);
          return 0;
        }
      });
      
      // Reload performance data after update
      loadPerformanceData();
    } catch (error) {
      console.error('Error updating performance data:', error);
    }
  }, []);

  useEffect(() => {
    loadPerformanceData();
    
    // Update performance data every 5 minutes
    const interval = setInterval(updatePerformanceData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updatePerformanceData]);

  const handleCoinClick = (coinId: string) => {
    if (onCoinClick) {
      onCoinClick(coinId);
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage > 10) return '#00A532';
    if (percentage > 5) return '#4CAF50';
    if (percentage > 0) return '#8BC34A';
    if (percentage > -5) return '#FF9800';
    if (percentage > -10) return '#F44336';
    return '#BA1A1A';
  };

  const getPerformanceIcon = (percentage: number) => {
    return percentage >= 0 ? (
      <TrendingUpIcon sx={{ color: getPerformanceColor(percentage), fontSize: '1rem' }} />
    ) : (
      <TrendingDownIcon sx={{ color: getPerformanceColor(percentage), fontSize: '1rem' }} />
    );
  };

  if (loading) {
    return null; // Don't show loading state for performance tracker
  }

  if (!performance || performance.performances.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '1.5rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Performance Tracker
            </Typography>
          </Box>
          
          <Alert severity="info">
            Performance tracking will begin after your first set of AI recommendations.
            Check back in 24 hours to see how our AI predictions performed!
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const timeSinceRecommendation = Date.now() - performance.timestamp;
  const hoursSince = Math.floor(timeSinceRecommendation / (1000 * 60 * 60));
  const daysSince = Math.floor(hoursSince / 24);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '1.5rem' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                AI Performance Tracker
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {daysSince > 0 ? `${daysSince} day${daysSince > 1 ? 's' : ''} ago` : 
                 hoursSince > 0 ? `${hoursSince} hour${hoursSince > 1 ? 's' : ''} ago` : 
                 'Less than 1 hour ago'}
              </Typography>
            </Box>
          </Box>
          
          <Tooltip title={expanded ? "Show Less" : "Show Details"}>
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Performance Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 2, 
              backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
              borderRadius: 2 
            }}>
              <MoneyIcon sx={{ color: theme.palette.primary.main, fontSize: '2rem', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatCurrency(performance.totalCurrentValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Portfolio Value
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (from {formatCurrency(performance.totalInvestment)})
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 2, 
              backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
              borderRadius: 2 
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                {getPerformanceIcon(performance.totalProfitPercentage)}
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  color: getPerformanceColor(performance.totalProfitPercentage)
                }}
              >
                {formatPercentage(performance.totalProfitPercentage)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Return
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ color: getPerformanceColor(performance.totalProfitPercentage) }}
              >
                {performance.totalProfit >= 0 ? '+' : ''}{formatCurrency(performance.totalProfit)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 2, 
              backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
              borderRadius: 2 
            }}>
              <StarIcon sx={{ color: theme.palette.warning.main, fontSize: '2rem', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {performance.bestPerformer ? formatPercentage(performance.bestPerformer.percentageChange) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Best Performer
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {performance.bestPerformer?.coinSymbol.toUpperCase() || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 2, 
              backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
              borderRadius: 2 
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {formatPercentage(performance.averagePerformance)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Performance
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, performance.averagePerformance + 50))}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? '#3A3A3A' : theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getPerformanceColor(performance.averagePerformance),
                  },
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Performance Table */}
        <Collapse in={expanded}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Individual Coin Performance
          </Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Coin</TableCell>
                  <TableCell align="right">Initial Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">Investment</TableCell>
                  <TableCell align="right">Current Value</TableCell>
                  <TableCell align="right">Profit/Loss</TableCell>
                  <TableCell align="center">AI Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {performance.performances
                  .sort((a, b) => b.percentageChange - a.percentageChange)
                  .map((perf, index) => (
                  <TableRow 
                    key={perf.coinId}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: index < 3 ? theme.palette.action.hover : 'inherit'
                    }}
                    onClick={() => handleCoinClick(perf.coinId)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {perf.coinName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {perf.coinSymbol.toUpperCase()}
                        </Typography>
                        {index < 3 && (
                          <StarIcon sx={{ ml: 1, color: theme.palette.warning.main, fontSize: '1rem' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(perf.initialPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(perf.currentPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {getPerformanceIcon(perf.percentageChange)}
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            ml: 0.5,
                            color: getPerformanceColor(perf.percentageChange),
                            fontWeight: 600
                          }}
                        >
                          {formatPercentage(perf.percentageChange)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(perf.investment)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(perf.currentValue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getPerformanceColor(perf.percentageChange),
                          fontWeight: 600
                        }}
                      >
                        {perf.profit >= 0 ? '+' : ''}{formatCurrency(perf.profit)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={perf.aiScore.toFixed(0)}
                        size="small"
                        sx={{
                          backgroundColor: perf.aiScore >= 80 ? '#00A532' : 
                                         perf.aiScore >= 65 ? '#4CAF50' : '#FF9800',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>

        {/* Performance Info */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#EADDFF', 
          borderRadius: 2 
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            How Performance Tracking Works
          </Typography>
          <Typography variant="caption" color="text.secondary">
            We track how a $100 investment in each of our top 10 AI recommendations would have performed. 
            Performance is calculated from the time recommendations were generated. 
            Data updates every hour to show real-time results.
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Last updated: {lastUpdated.toLocaleDateString('en-GB', {
                timeZone: 'Europe/Berlin',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceTracker; 