import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import { GlobalData } from '../types';
import {
  formatCompactCurrency,
  formatPercentage,
  formatNumber,
  getPercentageColor,
} from '../utils/formatters';

interface MarketOverviewProps {
  globalData: GlobalData | null;
  loading?: boolean;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ globalData, loading }) => {
  const theme = useTheme();

  if (loading || !globalData) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Market Overview
          </Typography>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Skeleton variant="rectangular" height={80} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  // Safely access nested properties with fallbacks
  const marketCapChange = globalData?.data?.market_cap_change_percentage_24h_usd || 0;
  const isMarketCapPositive = marketCapChange >= 0;
  const totalMarketCap = globalData?.data?.total_market_cap?.usd || 0;
  const totalVolume = globalData?.data?.total_volume?.usd || 0;
  const activeCryptocurrencies = globalData?.data?.active_cryptocurrencies || 0;
  const markets = globalData?.data?.markets || 0;

  const stats = [
    {
      title: 'Total Market Cap',
      value: formatCompactCurrency(totalMarketCap),
      change: formatPercentage(marketCapChange),
      isPositive: isMarketCapPositive,
      icon: <AccountBalanceIcon />,
    },
    {
      title: 'Total Volume (24h)',
      value: formatCompactCurrency(totalVolume),
      subtitle: 'Trading Volume',
      icon: <ShowChartIcon />,
    },
    {
      title: 'Active Cryptocurrencies',
      value: formatNumber(activeCryptocurrencies),
      subtitle: 'Coins',
      icon: <TrendingUpIcon />,
    },
    {
      title: 'Markets',
      value: formatNumber(markets),
      subtitle: 'Exchanges',
      icon: <AccountBalanceIcon />,
    },
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 3,
            color: theme.palette.text.primary,
          }}
        >
          Market Overview
        </Typography>
        
        <Grid container spacing={3}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: theme.shadows[2],
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: theme.palette.primary.light,
                      color: theme.palette.primary.contrastText,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
                
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: stat.change ? 1 : 0,
                    color: theme.palette.text.primary,
                  }}
                >
                  {stat.value}
                </Typography>
                
                {stat.change && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {stat.isPositive ? (
                      <TrendingUpIcon
                        sx={{
                          color: getPercentageColor(marketCapChange),
                          mr: 0.5,
                          fontSize: '1rem',
                        }}
                      />
                    ) : (
                      <TrendingDownIcon
                        sx={{
                          color: getPercentageColor(marketCapChange),
                          mr: 0.5,
                          fontSize: '1rem',
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: getPercentageColor(marketCapChange),
                        fontWeight: 600,
                      }}
                    >
                      {stat.change}
                    </Typography>
                  </Box>
                )}
                
                {stat.subtitle && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 'auto' }}
                  >
                    {stat.subtitle}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MarketOverview; 