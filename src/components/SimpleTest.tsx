import React from 'react';
import { Typography, Box } from '@mui/material';

const SimpleTest: React.FC = () => {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        CryptoSage Test Page
      </Typography>
      <Typography variant="body1">
        If you can see this, React and Material-UI are working correctly!
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Current time: {new Date().toLocaleString()}
      </Typography>
    </Box>
  );
};

export default SimpleTest; 