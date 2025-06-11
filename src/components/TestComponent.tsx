import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { cacheService } from '../services/cacheService';

const TestComponent: React.FC = () => {
  const handleClearCache = () => {
    cacheService.forceClearCache();
    alert('Cache cleared! Please refresh the page.');
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