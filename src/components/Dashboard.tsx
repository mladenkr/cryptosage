import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
} from '@mui/material';
import AIRecommendations from './AIRecommendations';
import PerformanceTracker from './PerformanceTracker';
import DataSourceIndicator from './DataSourceIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { cacheService } from '../services/cacheService';
import { scheduledDataFetcher } from '../services/scheduledDataFetcher';

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Initialize cache system and scheduled data fetcher on component mount
  useEffect(() => {
    // Initialize the scheduled data fetcher
    scheduledDataFetcher.init();
    
    // Clean up old cache entries
    cacheService.cleanupOldCache();
    
    // Log cache status for debugging
    const cacheStatus = cacheService.getCacheStatus();
    console.log('Cache Status:', cacheStatus);
    
    if (cacheStatus.hasCache) {
      console.log(`Cache is ${cacheStatus.ageHours.toFixed(1)} hours old, next fetch in ${cacheStatus.minutesUntilNextFetch} minutes`);
      console.log(`Next scheduled fetch: ${cacheStatus.nextFetchTime?.toLocaleString()}`);
    } else {
      console.log('No cached data available');
    }
    
    return () => {
      // Cleanup is handled by individual components, but we can log here
      console.log('Dashboard unmounting');
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          mb: 2,
          color: theme.palette.text.primary,
        }}
      >
        AI-Powered Cryptocurrency Recommendations
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Get intelligent investment recommendations powered by advanced technical analysis. Data updates every hour starting at 10:00 GMT+2.
      </Typography>

      {/* Data Source Indicator */}
      <Box sx={{ mb: 4 }}>
        <DataSourceIndicator variant="chip" size="small" />
      </Box>

      {/* AI Recommendations */}
      <AIRecommendations onCoinClick={(coinId) => navigate(`/coin/${coinId}`)} />

      {/* Performance Tracker */}
      <PerformanceTracker onCoinClick={(coinId) => navigate(`/coin/${coinId}`)} />
    </Container>
  );
};

export default Dashboard; 