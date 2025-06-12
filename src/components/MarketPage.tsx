import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useTheme,
  Chip,
  Tooltip,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import MarketOverview from './MarketOverview';
import CoinCard from './CoinCard';
import { Coin, GlobalData } from '../types';
import { coinGeckoApi } from '../services/api';

const MarketPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('market_cap_desc');
  const [searchQuery] = useState('');
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);
  const [showMEXCOnly, setShowMEXCOnly] = useState(false);
  const [mexcCoins, setMexcCoins] = useState<Coin[]>([]);
  const [loadingMEXC, setLoadingMEXC] = useState(false);

  const coinsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [page, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Filter coins based on search query and MEXC filter
    let filtered = coins;
    
    if (showMEXCOnly && mexcCoins.length > 0) {
      // Filter to show only MEXC coins
      const mexcCoinIds = new Set(mexcCoins.map(coin => coin.id));
      filtered = coins.filter(coin => mexcCoinIds.has(coin.id));
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredCoins(filtered);
  }, [coins, searchQuery, showMEXCOnly, mexcCoins]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [coinsData, globalDataResponse] = await Promise.all([
        coinGeckoApi.getCoins('usd', sortBy, coinsPerPage, page),
        coinGeckoApi.getGlobalData(),
      ]);

      setCoins(coinsData);
      setGlobalData(globalDataResponse);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      
      let errorMessage = 'Failed to fetch cryptocurrency data. Please try again later.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'CoinGecko server error. Please try again in a few minutes.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchMEXCCoins = async () => {
    try {
      setLoadingMEXC(true);
      console.log('Fetching MEXC coins...');
      const mexcData = await coinGeckoApi.getMEXCCoins(200); // Get more coins for better filtering
      setMexcCoins(mexcData);
      console.log(`Loaded ${mexcData.length} MEXC coins`);
    } catch (err: any) {
      console.error('Error fetching MEXC coins:', err);
      // Don't show error to user, just log it
    } finally {
      setLoadingMEXC(false);
    }
  };

  const handleMEXCFilter = async () => {
    if (!showMEXCOnly && mexcCoins.length === 0) {
      // First time clicking, fetch MEXC coins
      await fetchMEXCCoins();
    }
    setShowMEXCOnly(!showMEXCOnly);
    setPage(1); // Reset to first page when filter changes
  };

  // Removed unused handleSearch function

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
    setPage(1); // Reset to first page when sorting changes
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoinClick = (coin: Coin) => {
    navigate(`/coin/${coin.id}`);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: theme.palette.text.primary,
        }}
      >
        Cryptocurrency Market
      </Typography>

      {/* Market Overview */}
      <MarketOverview globalData={globalData} loading={loading} />

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Top Cryptocurrencies'}
          </Typography>
          
          {/* MEXC Filter Button */}
          <Tooltip title={showMEXCOnly ? 'Remove MEXC filter' : 'Show only MEXC coins'}>
            <Button
              variant={showMEXCOnly ? "contained" : "outlined"}
              color="primary"
              onClick={handleMEXCFilter}
              disabled={loadingMEXC}
              startIcon={loadingMEXC ? <CircularProgress size={16} /> : null}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 120,
                height: 40,
                background: showMEXCOnly 
                  ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                  : 'transparent',
                border: showMEXCOnly ? 'none' : `2px solid ${theme.palette.primary.main}`,
                color: showMEXCOnly ? 'white' : theme.palette.primary.main,
                '&:hover': {
                  background: showMEXCOnly 
                    ? 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)'
                    : `${theme.palette.primary.main}15`,
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {loadingMEXC ? 'Loading...' : (
                <>
                  <span style={{ fontWeight: 'bold' }}>MEXC</span>
                  <span style={{ marginLeft: 4, fontSize: '0.85em' }}>Only</span>
                </>
              )}
            </Button>
          </Tooltip>
          
          {/* Active Filter Indicator */}
          {showMEXCOnly && mexcCoins.length > 0 && (
            <Chip
              label={`${filteredCoins.length} coins available on MEXC`}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        
        {!searchQuery && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={handleSortChange}
            >
              <MenuItem value="market_cap_desc">Market Cap (High to Low)</MenuItem>
              <MenuItem value="market_cap_asc">Market Cap (Low to High)</MenuItem>
              <MenuItem value="volume_desc">Volume (High to Low)</MenuItem>
              <MenuItem value="volume_asc">Volume (Low to High)</MenuItem>
              <MenuItem value="price_desc">Price (High to Low)</MenuItem>
              <MenuItem value="price_asc">Price (Low to High)</MenuItem>
              <MenuItem value="percent_change_desc">% Change (High to Low)</MenuItem>
              <MenuItem value="percent_change_asc">% Change (Low to High)</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Coins Grid */}
      {!loading && (
        <>
          <Grid container spacing={3}>
            {filteredCoins.map((coin) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={coin.id}>
                <CoinCard coin={coin} onClick={handleCoinClick} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {!searchQuery && filteredCoins.length > 0 && !showMEXCOnly && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={Math.ceil(1000 / coinsPerPage)} // CoinGecko has ~1000 coins in free tier
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          {/* No Results */}
          {((searchQuery && filteredCoins.length === 0) || (showMEXCOnly && filteredCoins.length === 0)) && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {showMEXCOnly ? 'No coins found on MEXC exchange' : 'No cryptocurrencies found'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {showMEXCOnly 
                  ? 'Try removing the MEXC filter or check back later' 
                  : 'Try adjusting your search terms'
                }
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default MarketPage; 