import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Container
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Psychology as PsychologyIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { predictionTracker, PredictionAccuracyStats } from '../services/predictionTracker';

const GlobalPredictionStats: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<PredictionAccuracyStats | null>(null);

  useEffect(() => {
    const loadStats = () => {
      const accuracyStats = predictionTracker.getAccuracyStats();
      setStats(accuracyStats);
    };

    // Load initial stats
    loadStats();

    // Set up interval to refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return '#00A532';
    if (accuracy >= 70) return '#4CAF50';
    if (accuracy >= 60) return '#FF9800';
    return '#F44336';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving':
        return <TrendingUpIcon sx={{ color: '#00A532', fontSize: '1.5rem' }} />;
      case 'declining':
        return <TrendingDownIcon sx={{ color: '#F44336', fontSize: '1.5rem' }} />;
      default:
        return <TrendingFlatIcon sx={{ color: '#FF9800', fontSize: '1.5rem' }} />;
    }
  };

  if (!stats || stats.totalPredictions === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 0 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PsychologyIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '1.5rem' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                AI Prediction Performance
              </Typography>
            </Box>
            
            <Alert severity="info">
              <Typography variant="body2">
                Prediction accuracy tracking will begin after the first set of AI recommendations.
                Check back in 24 hours to see how our AI predictions performed!
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PsychologyIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: '1.5rem' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Prediction Performance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time accuracy tracking across all predictions
                </Typography>
              </Box>
            </Box>
            
            <Tooltip title="Accuracy is measured by comparing AI predictions with actual price movements">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Main Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Overall Accuracy */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 2,
                border: `2px solid ${getAccuracyColor(stats.averageAccuracy)}20`
              }}>
                <AssessmentIcon sx={{ 
                  color: getAccuracyColor(stats.averageAccuracy), 
                  fontSize: '2rem', 
                  mb: 1 
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: getAccuracyColor(stats.averageAccuracy),
                    mb: 0.5
                  }}
                >
                  {stats.averageAccuracy.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Accuracy
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.completedPredictions} completed predictions
                </Typography>
              </Box>
            </Grid>

            {/* Total Predictions */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 2 
              }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.totalPredictions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Predictions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.totalPredictions - stats.completedPredictions} pending
                </Typography>
              </Box>
            </Grid>

            {/* Best Timeframe */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 2 
              }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.bestPerformingTimeframe}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best Timeframe
                </Typography>
                <Typography variant="caption" sx={{ color: '#00A532' }}>
                  {stats.accuracyByTimeframe[stats.bestPerformingTimeframe as keyof typeof stats.accuracyByTimeframe]?.toFixed(1)}% accuracy
                </Typography>
              </Box>
            </Grid>

            {/* Recent Trend */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 2 
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  {getTrendIcon(stats.recentTrend)}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.recentTrend}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent Trend
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last 30 days
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Timeframe Breakdown */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Accuracy by Timeframe
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(stats.accuracyByTimeframe).map(([timeframe, accuracy]) => (
              <Grid item xs={6} sm={3} key={timeframe}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {timeframe.toUpperCase()}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={accuracy}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.palette.mode === 'dark' ? '#3A3A3A' : theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getAccuracyColor(accuracy),
                      },
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      color: getAccuracyColor(accuracy),
                      mt: 0.5,
                      display: 'block'
                    }}
                  >
                    {accuracy.toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Confidence Level Breakdown */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Accuracy by Confidence Level
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="High Confidence"
                  size="small"
                  sx={{
                    backgroundColor: '#00A532',
                    color: 'white',
                    mb: 1,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stats.accuracyByConfidence.high.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  80%+ confidence
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="Medium Confidence"
                  size="small"
                  sx={{
                    backgroundColor: '#FF9800',
                    color: 'white',
                    mb: 1,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stats.accuracyByConfidence.medium.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  60-80% confidence
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="Low Confidence"
                  size="small"
                  sx={{
                    backgroundColor: '#F44336',
                    color: 'white',
                    mb: 1,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stats.accuracyByConfidence.low.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  &lt;60% confidence
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Info */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
            borderRadius: 2 
          }}>
            <Typography variant="caption" color="text.secondary">
              Accuracy scores are updated hourly as predictions mature. Perfect prediction = 100%, 
              error of 1% = 95%, error of 5% = 75%, error of 10% = 50%, error of 20% = 25%.
            </Typography>
            {stats.lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Last updated: {new Date(stats.lastUpdated).toLocaleDateString('en-GB', {
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
    </Container>
  );
};

export default GlobalPredictionStats; 