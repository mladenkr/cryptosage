import React from 'react';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Alert,
  IconButton
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { predictionTracker, PredictionRecord, CoinAccuracyHistory } from '../services/predictionTracker';

interface PredictionAccuracyDisplayProps {
  coinId: string;
  coinSymbol: string;
  compact?: boolean;
}

const PredictionAccuracyDisplay: React.FC<PredictionAccuracyDisplayProps> = ({
  coinId,
  coinSymbol,
  compact = false
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const [coinAccuracy, setCoinAccuracy] = React.useState<CoinAccuracyHistory | null>(null);
  const [recentPredictions, setRecentPredictions] = React.useState<PredictionRecord[]>([]);

  React.useEffect(() => {
    const loadAccuracyData = () => {
      const accuracy = predictionTracker.getCoinAccuracy(coinId);
      const predictions = predictionTracker.getCoinRecentPredictions(coinId, 5);
      
      setCoinAccuracy(accuracy);
      setRecentPredictions(predictions);
    };

    loadAccuracyData();
    
    // Update every minute
    const interval = setInterval(loadAccuracyData, 60000);
    return () => clearInterval(interval);
  }, [coinId]);

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return '#00A532';
    if (accuracy >= 60) return '#4CAF50';
    if (accuracy >= 40) return '#FF9800';
    if (accuracy >= 20) return '#F44336';
    return '#9E9E9E';
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 70) return <CheckCircleIcon sx={{ color: getAccuracyColor(accuracy), fontSize: '1rem' }} />;
    if (accuracy >= 40) return <ScheduleIcon sx={{ color: getAccuracyColor(accuracy), fontSize: '1rem' }} />;
    return <ErrorIcon sx={{ color: getAccuracyColor(accuracy), fontSize: '1rem' }} />;
  };

  if (!coinAccuracy && recentPredictions.length === 0) {
    if (compact) {
      return (
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" color="text.secondary">
            No prediction history yet
          </Typography>
        </Box>
      );
    }

    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          No prediction history available for {coinSymbol.toUpperCase()}. 
          Accuracy tracking will begin after the first AI recommendation.
        </Typography>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            AI Accuracy
          </Typography>
          {coinAccuracy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getAccuracyIcon(coinAccuracy.averageAccuracy)}
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 600,
                  color: getAccuracyColor(coinAccuracy.averageAccuracy)
                }}
              >
                {coinAccuracy.averageAccuracy.toFixed(0)}%
              </Typography>
            </Box>
          )}
        </Box>
        
        {coinAccuracy && (
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={coinAccuracy.averageAccuracy}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? '#3A3A3A' : theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getAccuracyColor(coinAccuracy.averageAccuracy),
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {coinAccuracy ? `${coinAccuracy.totalPredictions} predictions` : `${recentPredictions.length} recent`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Best: {coinAccuracy?.bestTimeframe || 'N/A'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 1, color: theme.palette.primary.main, fontSize: '1.2rem' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              AI Prediction Accuracy
            </Typography>
          </Box>
          
          <Tooltip title={expanded ? "Show Less" : "Show Details"}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {coinAccuracy ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 1.5, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                  borderRadius: 2 
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 0.5 }}>
                    {getAccuracyIcon(coinAccuracy.averageAccuracy)}
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700,
                      color: getAccuracyColor(coinAccuracy.averageAccuracy),
                      fontSize: '1.1rem'
                    }}
                  >
                    {coinAccuracy.averageAccuracy.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overall Accuracy
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 1.5, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                  borderRadius: 2 
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {coinAccuracy.totalPredictions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Predictions
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Best Timeframe
                </Typography>
                <Chip
                  label={coinAccuracy.bestTimeframe}
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: '#00A532',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Recent Trend
                </Typography>
                <Chip
                  label={coinAccuracy.recentAccuracy > coinAccuracy.averageAccuracy ? 'IMPROVING' : 
                         coinAccuracy.recentAccuracy < coinAccuracy.averageAccuracy ? 'DECLINING' : 'STABLE'}
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: coinAccuracy.recentAccuracy > coinAccuracy.averageAccuracy ? '#00A532' : 
                                   coinAccuracy.recentAccuracy < coinAccuracy.averageAccuracy ? '#F44336' : '#FF9800',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              </Box>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Building accuracy history...
          </Typography>
        )}

        <Box sx={{ 
          mt: 2, 
          p: 1.5, 
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
          borderRadius: 2 
        }}>
          <Typography variant="caption" color="text.secondary">
            Accuracy is measured by comparing AI predictions with actual price movements. 
            Scores update hourly as predictions mature.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PredictionAccuracyDisplay;
