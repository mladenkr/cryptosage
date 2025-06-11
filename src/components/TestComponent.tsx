import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { cacheService } from '../services/cacheService';

const TestComponent: React.FC = () => {
  const handleClearCache = () => {
    cacheService.forceClearCache();
    
    // Clear all cryptocurrency-related cache entries
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('crypto_market_data') || 
        key.includes('crypto_ai_recommendations') ||
        key.includes('crypto_ai_performance') ||
        key.includes('raydium') ||
        key.includes('meteora')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`Cleared ${keysToRemove.length} cache entries:`, keysToRemove);
    alert(`All cache cleared! Removed ${keysToRemove.length} entries. Please refresh the page.`);
  };

  const handleCheckCache = () => {
    const status = cacheService.getCacheStatus();
    console.log('Cache Status:', status);
    alert(`Cache Status: ${JSON.stringify(status, null, 2)}`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Test Component</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        If you can see this, React is working!
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleClearCache}>
          Clear Cache
        </Button>
        <Button variant="outlined" onClick={handleCheckCache}>
          Check Cache Status
        </Button>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Use these buttons to debug cache issues. Check the browser console for detailed logs.
      </Typography>
    </Box>
  );
};

export default TestComponent; 