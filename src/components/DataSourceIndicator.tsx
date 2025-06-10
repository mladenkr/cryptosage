import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Api as ApiIcon } from '@mui/icons-material';
import { getCurrentDataSource } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface DataSourceIndicatorProps {
  variant?: 'chip' | 'text';
  size?: 'small' | 'medium';
}

const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({ 
  variant = 'text', 
  size = 'small' 
}) => {
  const { theme } = useTheme();
  const [dataSource, setDataSource] = useState(getCurrentDataSource());

  useEffect(() => {
    // Initial update on mount
    setDataSource(getCurrentDataSource());
    
    // Update data source every 1 second to catch changes quickly
    const interval = setInterval(() => {
      const currentSource = getCurrentDataSource();
      if (currentSource !== dataSource) {
        setDataSource(currentSource);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dataSource]);

  if (variant === 'chip') {
    return (
      <Chip
        icon={<ApiIcon sx={{ fontSize: '0.75rem' }} />}
        label={`Data: ${dataSource}`}
        size={size}
        variant="outlined"
        sx={{
          fontSize: '0.65rem',
          height: size === 'small' ? 20 : 24,
          '& .MuiChip-label': {
            px: 0.5,
          },
          '& .MuiChip-icon': {
            fontSize: '0.75rem',
            ml: 0.5,
          },
          borderColor: dataSource === 'Loading...' ? theme.palette.primary.main : theme.palette.divider,
          color: dataSource === 'Loading...' ? theme.palette.primary.main : theme.palette.text.secondary,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <ApiIcon sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }} />
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem',
          color: dataSource === 'Loading...' ? theme.palette.primary.main : theme.palette.text.secondary,
          fontWeight: 400,
          letterSpacing: '0.25px',
        }}
      >
        Data source: {dataSource}
      </Typography>
    </Box>
  );
};

export default DataSourceIndicator; 