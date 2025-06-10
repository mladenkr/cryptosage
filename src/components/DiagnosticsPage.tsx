import React from 'react';
import {
  Container,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import ApiTest from './ApiTest';

const DiagnosticsPage: React.FC = () => {
  const theme = useTheme();

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
        System Diagnostics
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Test API connectivity and system status
      </Typography>

      {/* API Test Component */}
      <ApiTest />
    </Container>
  );
};

export default DiagnosticsPage; 