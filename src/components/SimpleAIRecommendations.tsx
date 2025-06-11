import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

interface SimpleAIRecommendationsProps {
  onCoinClick?: (coinId: string) => void;
}

const SimpleAIRecommendations: React.FC<SimpleAIRecommendationsProps> = ({ onCoinClick }) => {
  const { theme } = useTheme();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            AI-Powered Recommendations (Test Mode)
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          This is a simplified version to test if the app loads correctly.
          Cryptocurrency data updates automatically every hour.
        </Typography>
        
        <Typography variant="body2" sx={{ mt: 2 }}>
          Status: App is loading successfully!
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SimpleAIRecommendations; 