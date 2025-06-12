import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { Coin } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import Sparkline from './Sparkline';
import {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
  formatRank,
  getPercentageColor,
} from '../utils/formatters';

interface CoinCardProps {
  coin: Coin;
  onClick?: (coin: Coin) => void;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin, onClick }) => {
  const { theme, mode } = useTheme();
  const isPositive = coin.price_change_percentage_24h >= 0;

  const handleClick = () => {
    if (onClick) {
      onClick(coin);
    }
  };

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design 3 easing
        '&:hover': onClick ? {
          transform: 'translateY(-1px)',
          boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)', // Elevation 2
        } : {},
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3, // 12px border radius from theme
        backgroundColor: mode === 'light' ? '#FFFBFE' : '#1C1B1F', // Surface color
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {/* Header with rank and logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip
            label={formatRank(coin.market_cap_rank)}
            size="medium"
            sx={{
              mr: 1,
              backgroundColor: mode === 'light' ? '#6750A4' : '#4A4458', // Secondary container
              color: mode === 'light' ? '#FFFFFF' : '#E8DEF8', // On secondary container
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.5px',
              height: 32,
              minWidth: 48,
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              '& .MuiChip-label': {
                px: 1.5,
                fontFamily: 'monospace',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              },
            }}
          />
          <Avatar
            src={coin.image}
            alt={coin.name}
            sx={{ width: 32, height: 32, mr: 2 }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                fontSize: '1.1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {coin.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', fontWeight: 500 }}
            >
              {coin.symbol}
            </Typography>
          </Box>
        </Box>

        {/* Price */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            {formatCurrency(coin.current_price)}
          </Typography>
          
          {/* Real-time price indicator */}
          {coin.price_source === 'MEXC' && (
            <Chip
              label="⚡"
              size="small"
              sx={{
                height: 20,
                minWidth: 20,
                backgroundColor: '#4CAF50',
                color: 'white',
                fontSize: '0.7rem',
                '& .MuiChip-label': {
                  px: 0.5,
                },
              }}
              title="Real-time MEXC price"
            />
          )}
        </Box>

        {/* Price change */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {isPositive ? (
            <TrendingUpIcon
              sx={{
                color: getPercentageColor(coin.price_change_percentage_24h),
                mr: 0.5,
                fontSize: '1.2rem',
              }}
            />
          ) : (
            <TrendingDownIcon
              sx={{
                color: getPercentageColor(coin.price_change_percentage_24h),
                mr: 0.5,
                fontSize: '1.2rem',
              }}
            />
          )}
          <Typography
            variant="body1"
            sx={{
              color: getPercentageColor(coin.price_change_percentage_24h),
              fontWeight: 600,
            }}
          >
            {formatPercentage(coin.price_change_percentage_24h)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            (24h)
          </Typography>
        </Box>

        {/* 24-hour Sparkline Chart */}
        {coin.sparkline_in_24h?.price && coin.sparkline_in_24h.price.length > 1 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              24h trend
            </Typography>
            <Sparkline
              data={coin.sparkline_in_24h.price}
              color={getPercentageColor(coin.price_change_percentage_24h)}
              height={35}
            />
          </Box>
        )}

        {/* Market data */}
        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Market Cap
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatCompactCurrency(coin.market_cap)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Volume (24h)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatCompactCurrency(coin.total_volume)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              24h Range
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatCurrency(coin.low_24h)} - {formatCurrency(coin.high_24h)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CoinCard; 