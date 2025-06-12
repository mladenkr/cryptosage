import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Link,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Language as LanguageIcon,
  Twitter as TwitterIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CoinDetail } from '../types';
import { coinGeckoApi } from '../services/api';
import DataSourceIndicator from './DataSourceIndicator';
import {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
  formatRank,
  formatDate,
  getPercentageColor,
} from '../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CoinDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [coin, setCoin] = useState<CoinDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [chartDays, setChartDays] = useState(7);

  useEffect(() => {
    if (id) {
      fetchCoinData();
    }
  }, [id, chartDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCoinData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      const [coinData, historyData] = await Promise.all([
        coinGeckoApi.getCoinDetail(id),
        coinGeckoApi.getCoinHistory(id, 'usd', chartDays),
      ]);

      setCoin(coinData);
      
      // Format price history for chart
      const formattedHistory = historyData.prices.map((price: [number, number]) => ({
        timestamp: price[0],
        date: new Date(price[0]).toLocaleDateString(),
        price: price[1],
      }));
      
      setPriceHistory(formattedHistory);
    } catch (err) {
      setError('Failed to fetch coin details. Please try again later.');
      console.error('Error fetching coin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChartPeriodChange = (days: number) => {
    setChartDays(days);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error || !coin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mb: 2 }}
        >
          Back to AI Analysis
        </Button>
        <Alert severity="error">
          {error || 'Coin not found'}
        </Alert>
      </Container>
    );
  }

  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBackClick}
        sx={{ mb: 3 }}
        variant="outlined"
      >
        Back to AI Analysis
      </Button>

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                src={coin.image}
                alt={coin.name}
                sx={{ width: 80, height: 80 }}
              />
            </Grid>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h3" component="h1" sx={{ mr: 2, fontWeight: 700 }}>
                  {coin.name}
                </Typography>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', fontWeight: 500 }}
                >
                  {coin.symbol}
                </Typography>
                <Chip
                  label={formatRank(coin.market_cap_rank)}
                  sx={{ ml: 2 }}
                  color="primary"
                />
              </Box>
              
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(coin.current_price)}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isPositive ? (
                  <TrendingUpIcon
                    sx={{
                      color: getPercentageColor(coin.price_change_percentage_24h),
                      mr: 0.5,
                    }}
                  />
                ) : (
                  <TrendingDownIcon
                    sx={{
                      color: getPercentageColor(coin.price_change_percentage_24h),
                      mr: 0.5,
                    }}
                  />
                )}
                <Typography
                  variant="h6"
                  sx={{
                    color: getPercentageColor(coin.price_change_percentage_24h),
                    fontWeight: 600,
                  }}
                >
                  {formatPercentage(coin.price_change_percentage_24h)}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                  (24h)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Price Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Price Chart
            </Typography>
            <Box>
              {[1, 7, 30, 90, 365].map((days) => (
                <Button
                  key={days}
                  variant={chartDays === days ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleChartPeriodChange(days)}
                  sx={{ mr: 1 }}
                >
                  {days === 1 ? '1D' : days === 7 ? '7D' : days === 30 ? '1M' : days === 90 ? '3M' : '1Y'}
                </Button>
              ))}
            </Box>
          </Box>
          
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Price']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Market Data" />
            <Tab label="About" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Key Statistics
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">Market Cap</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {formatCompactCurrency(coin.market_cap)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">Volume (24h)</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {formatCompactCurrency(coin.total_volume)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">Circulating Supply</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {coin.circulating_supply?.toLocaleString()} {coin.symbol.toUpperCase()}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">Total Supply</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {coin.total_supply ? `${coin.total_supply.toLocaleString()} ${coin.symbol.toUpperCase()}` : 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Price Information
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">All-Time High</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 500 }}>
                    {formatCurrency(coin.ath)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(coin.ath_date)}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">All-Time Low</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 500 }}>
                    {formatCurrency(coin.atl)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(coin.atl_date)}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">24h High</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {formatCurrency(coin.high_24h)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">24h Low</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {formatCurrency(coin.low_24h)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Market Performance
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Market Cap Rank
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    #{coin.market_cap_rank}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Market Cap Change (24h)
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700,
                      color: getPercentageColor(coin.market_cap_change_percentage_24h)
                    }}
                  >
                    {formatPercentage(coin.market_cap_change_percentage_24h)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                About {coin.name}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ lineHeight: 1.7, mb: 3 }}
                dangerouslySetInnerHTML={{ 
                  __html: coin.description?.en || 'No description available.' 
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {coin.links?.homepage?.[0] && (
                  <Link
                    href={coin.links.homepage[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    <LanguageIcon sx={{ mr: 1 }} />
                    Website
                  </Link>
                )}
                {coin.links?.twitter_screen_name && (
                  <Link
                    href={`https://twitter.com/${coin.links.twitter_screen_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    <TwitterIcon sx={{ mr: 1 }} />
                    Twitter
                  </Link>
                )}
                {coin.links?.repos_url?.github?.[0] && (
                  <Link
                    href={coin.links.repos_url.github[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    <GitHubIcon sx={{ mr: 1 }} />
                    GitHub
                  </Link>
                )}
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Data Source Indicator */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <DataSourceIndicator variant="text" size="small" />
      </Box>
    </Container>
  );
};

export default CoinDetailPage; 