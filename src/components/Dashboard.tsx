import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import AIRecommendations from './AIRecommendations';
import PerformanceTracker from './PerformanceTracker';
import DataSourceIndicator from './DataSourceIndicator';
import { useTheme } from '../contexts/ThemeContext';

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Initialize cache system on component mount
  useEffect(() => {
    // Try to load services safely
    const initializeServices = async () => {
      try {
        const { cacheService } = await import('../services/cacheService');
        
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
        
        setServicesError(null); // Clear any previous errors
      } catch (error) {
        console.error('Error initializing services:', error);
        setServicesError('Failed to initialize services. Some features may not work properly.');
      }
    };

    initializeServices();
    
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
                        Get intelligent investment recommendations from Raydium DEX on Solana, powered by advanced technical analysis. Data updates automatically every hour.
      </Typography>

      {/* Services Error Alert */}
      {servicesError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {servicesError}
        </Alert>
      )}

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