import React from 'react';
import { Container } from '@mui/material';
import GlobalPredictionStats from './GlobalPredictionStats';
import EnhancedAIRecommendations from './EnhancedAIRecommendations';

interface DashboardProps {
  onCoinClick?: (coinId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCoinClick }) => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Global Prediction Performance Stats */}
      <GlobalPredictionStats />
      
      {/* AI Recommendations */}
      <EnhancedAIRecommendations onCoinClick={onCoinClick} />
    </Container>
  );
};

export default Dashboard; 