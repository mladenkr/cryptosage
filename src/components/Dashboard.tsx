import React from 'react';
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

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

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
        Get intelligent investment recommendations powered by advanced technical analysis and machine learning
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