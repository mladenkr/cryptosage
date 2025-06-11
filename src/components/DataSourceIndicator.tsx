import React, { useState, useEffect } from 'react';
import { 
  Chip, 
  Tooltip, 
  Box, 
  Typography,
  Popover,
  Card,
  CardContent,
  Button,
  Divider
} from '@mui/material';
import { 
  Info as InfoIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { getCurrentDataSource } from '../services/api';
import { cacheService } from '../services/cacheService';

interface DataSourceIndicatorProps {
  variant?: 'chip' | 'text';
  size?: 'small' | 'medium';
}

const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({ 
  variant = 'chip', 
  size = 'medium' 
}) => {
  const [dataSource, setDataSource] = useState<string>('Loading...');
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      try {
        setDataSource(getCurrentDataSource());
        setCacheStatus(cacheService.getCacheStatus());
      } catch (error) {
        console.error('Error updating data source status:', error);
        setDataSource('Error');
        setCacheStatus(null);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClearCache = () => {
    cacheService.clearAllData();
    setCacheStatus(cacheService.getCacheStatus());
    handleClose();
  };

  const open = Boolean(anchorEl);

  if (variant === 'text') {
    return (
      <Typography variant="caption" color="text.secondary">
        Data source: {dataSource}
      </Typography>
    );
  }

  const getCacheStatusColor = (): 'default' | 'success' | 'warning' => {
    if (!cacheStatus?.hasCache) return 'default';
    return cacheStatus.isFresh ? 'success' : 'warning';
  };

  const getCacheStatusText = () => {
    if (!cacheStatus?.hasCache) return 'No cache';
    return cacheStatus.isFresh ? 'Fresh cache' : `Cache ${(cacheStatus.ageHours || 0).toFixed(1)}h old`;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={`Data source: ${dataSource}`}>
        <Chip
          label={dataSource}
          size={size}
          color="primary"
          variant="outlined"
          icon={<InfoIcon />}
        />
      </Tooltip>
      
      <Tooltip title="Cache status and management">
        <Chip
          label={getCacheStatusText()}
          size={size}
          color={getCacheStatusColor()}
          variant="outlined"
          icon={<StorageIcon />}
          onClick={handleClick}
          clickable
        />
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Card sx={{ minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cache Management
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Data Source: <strong>{dataSource}</strong>
              </Typography>
              
              {cacheStatus && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Cache Status: <strong>{getCacheStatusText()}</strong>
                  </Typography>
                  
                  {cacheStatus.hasCache && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Cache Age: <strong>{(cacheStatus.ageHours || 0).toFixed(1)} hours</strong>
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Next Update: <strong>{(cacheStatus.minutesUntilNextFetch || 0).toFixed(0)} minutes</strong>
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh App
              </Button>
              
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearCache}
              >
                Clear Cache
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Cache reduces API calls and improves performance. Data is automatically refreshed every 6 hours.
            </Typography>
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
};

export default DataSourceIndicator; 